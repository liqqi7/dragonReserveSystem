"""Persistent activity-weather snapshots and scheduled refresh orchestration."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.utils.activity_status import ACTIVE_ACTIVITY_STATUSES
from app.core.config import get_settings
from app.core.logging import logger
from app.models import Activity, ActivityWeatherSnapshot
from app.services.qweather_client import QWeatherClient
from app.services.qweather_parser import extract_air_quality, extract_daily_weather
from app.utils.app_time import app_now

ATTRIBUTION = "天气服务驱动 by QWeather"
ACTIVE_STATUSES = ACTIVE_ACTIVITY_STATUSES


def build_weather_location_key(longitude: float, latitude: float) -> str:
    return f"{longitude:.4f}:{latitude:.4f}"


def activity_target_date(activity: Activity) -> date:
    return activity.start_time.date()


def _clear_weather_fields(snapshot: ActivityWeatherSnapshot) -> None:
    for field in (
        "temperature", "temperature_min", "temperature_max", "condition", "icon_code",
        "humidity", "wind_direction", "wind_scale", "air_quality", "fetched_at",
        "last_success_at", "valid_until",
    ):
        setattr(snapshot, field, None)


def _forecast_window_state(target_date: date, now: datetime) -> str:
    distance_days = (target_date - now.date()).days
    if distance_days < 0 or distance_days > 29:
        return "forecast_out_of_range"
    return "in_range"


def _enters_forecast_at(target_date: date, now: datetime) -> datetime | None:
    if target_date < now.date():
        return None
    candidate = datetime.combine(target_date - timedelta(days=29), time.min)
    # Calendar eligibility is not an upstream failure: do not defer entry by six hours.
    return max(now, candidate)


def _is_air_range(target_date: date, now: datetime) -> bool:
    return 0 <= (target_date - now.date()).days <= 7


def _next_interval(target_date: date, activity: Activity, now: datetime) -> timedelta:
    settings = get_settings()
    if activity.start_time <= now < activity.end_time:
        return timedelta(hours=settings.qweather_air_refresh_near_hours)
    days = (target_date - now.date()).days
    if days <= 2:
        return timedelta(hours=settings.qweather_air_refresh_near_hours)
    if days <= 7:
        return timedelta(hours=settings.qweather_refresh_near_hours)
    return timedelta(hours=settings.qweather_refresh_far_hours)


def _failure_delay(failure_count: int) -> timedelta:
    if failure_count <= 1:
        return timedelta(minutes=15)
    if failure_count == 2:
        return timedelta(hours=1)
    return timedelta(hours=3)


def ensure_weather_snapshot(db: Session, activity: Activity, *, now: datetime | None = None) -> ActivityWeatherSnapshot:
    """Create (or normalize) the one snapshot associated with an activity."""
    now = now or app_now()
    snapshot = db.get(ActivityWeatherSnapshot, activity.id)
    target_date = activity_target_date(activity)
    latitude = activity.location_latitude
    longitude = activity.location_longitude
    location_key = build_weather_location_key(longitude, latitude) if latitude is not None and longitude is not None else ""
    if snapshot is None:
        snapshot = ActivityWeatherSnapshot(
            activity_id=activity.id,
            target_date=target_date,
            source_latitude=latitude,
            source_longitude=longitude,
            location_key=location_key,
            status="pending",
            attribution=ATTRIBUTION,
            next_refresh_at=now,
        )
        db.add(snapshot)
    if latitude is None or longitude is None:
        snapshot.status = "location_unavailable"
        snapshot.next_refresh_at = None
    elif _forecast_window_state(target_date, now) != "in_range":
        snapshot.status = "forecast_out_of_range"
        snapshot.next_refresh_at = _enters_forecast_at(target_date, now)
    elif snapshot.status == "location_unavailable" or (
        snapshot.status == "forecast_out_of_range"
        and (snapshot.next_refresh_at is None or snapshot.next_refresh_at <= now)
    ):
        snapshot.status = "pending"
        snapshot.next_refresh_at = now
    return snapshot


def invalidate_weather_snapshot(db: Session, activity: Activity, *, now: datetime | None = None) -> ActivityWeatherSnapshot:
    """Reset weather only when its date or location source has actually changed."""
    existing = db.get(ActivityWeatherSnapshot, activity.id)
    target_date = activity_target_date(activity)
    location_key = (
        build_weather_location_key(activity.location_longitude, activity.location_latitude)
        if activity.location_latitude is not None and activity.location_longitude is not None else ""
    )
    if existing and existing.target_date == target_date and existing.location_key == location_key:
        return existing
    snapshot = ensure_weather_snapshot(db, activity, now=now)
    target_date = activity_target_date(activity)
    latitude = activity.location_latitude
    longitude = activity.location_longitude
    location_key = build_weather_location_key(longitude, latitude) if latitude is not None and longitude is not None else ""
    snapshot.target_date = target_date
    snapshot.source_latitude = latitude
    snapshot.source_longitude = longitude
    snapshot.location_key = location_key
    snapshot.failure_count = 0
    _clear_weather_fields(snapshot)
    # A previously available snapshot must become refreshable immediately after
    # the activity date or location changes; otherwise its old status can block
    # the scheduled refresh indefinitely.
    snapshot.status = "pending"
    snapshot.next_refresh_at = now or app_now()
    return ensure_weather_snapshot(db, activity, now=now)


def snapshot_response(snapshot: ActivityWeatherSnapshot | None, *, now: datetime | None = None) -> dict[str, Any]:
    now = now or app_now()
    if snapshot is None:
        return {"available": False, "status": "pending", "reason": "weather_pending", "attribution": ATTRIBUTION, "stale": False}
    if snapshot.status == "available" and snapshot.last_success_at:
        stale_limit = snapshot.last_success_at + timedelta(hours=get_settings().qweather_stale_max_hours)
        if now <= stale_limit:
            stale = bool(snapshot.valid_until and now > snapshot.valid_until)
            return {
                "available": True,
                "status": "available",
                "date": snapshot.target_date,
                "temperature": snapshot.temperature,
                "temperature_min": snapshot.temperature_min,
                "temperature_max": snapshot.temperature_max,
                "condition": snapshot.condition or "",
                "icon_code": snapshot.icon_code or "",
                "humidity": snapshot.humidity,
                "wind_direction": snapshot.wind_direction or "",
                "wind_scale": snapshot.wind_scale or "",
                "air_quality": snapshot.air_quality,
                "attribution": snapshot.attribution or ATTRIBUTION,
                "fetched_at": snapshot.fetched_at,
                "valid_until": snapshot.valid_until,
                "stale": stale,
            }
    status = "expired" if snapshot.status == "available" else snapshot.status
    reason = "weather_pending" if status == "pending" else status
    return {
        "available": False,
        "status": status,
        "reason": reason,
        "attribution": snapshot.attribution or ATTRIBUTION,
        "fetched_at": snapshot.fetched_at,
        "valid_until": snapshot.valid_until,
        "stale": False,
    }


def get_activity_weather_snapshot(db: Session, activity_id: int) -> dict[str, Any]:
    return snapshot_response(db.get(ActivityWeatherSnapshot, activity_id))


class ActivityWeatherRefreshService:
    """Timer-only snapshot updater. Requests are deduplicated per normalized location."""

    def __init__(self, db: Session, client: QWeatherClient | None = None) -> None:
        self.db = db
        self.client = client or QWeatherClient()
        self.stats: dict[str, int] = defaultdict(int)

    def _eligible_activities(self, now: datetime, activity_id: int | None = None) -> list[Activity]:
        """Return only activities that have not ended at the refresh instant.

        The explicit end-time boundary prevents a stale activity-status sync from
        refreshing an activity after it has already ended.
        """
        query = select(Activity).where(Activity.status.in_(ACTIVE_STATUSES), Activity.end_time > now)
        if activity_id is not None:
            query = query.where(Activity.id == activity_id)
        return list(self.db.scalars(query.order_by(Activity.start_time.asc())))

    def refresh_due(self, *, now: datetime | None = None, activity_id: int | None = None) -> dict[str, int]:
        now = now or app_now()
        activities = self._eligible_activities(now, activity_id)
        self.stats["candidate_activity_count"] = len(activities)
        due_entries: list[tuple[Activity, ActivityWeatherSnapshot]] = []
        for activity in activities:
            snapshot = ensure_weather_snapshot(self.db, activity, now=now)
            if snapshot.status != "pending" and (snapshot.next_refresh_at is None or snapshot.next_refresh_at > now):
                continue
            if snapshot.status in {"location_unavailable", "forecast_out_of_range"}:
                continue
            if activity.location_latitude is None or activity.location_longitude is None:
                continue
            due_entries.append((activity, snapshot))

        self.stats["due_snapshot_count"] = len(due_entries)
        batch_size = max(1, int(get_settings().qweather_refresh_batch_size))
        scheduled_entries = due_entries[:batch_size]
        self.stats["scheduled_snapshot_count"] = len(scheduled_entries)
        grouped: dict[str, list[tuple[Activity, ActivityWeatherSnapshot]]] = defaultdict(list)
        for activity, snapshot in scheduled_entries:
            grouped[snapshot.location_key].append((activity, snapshot))
        self.db.commit()
        self.stats["unique_location_count"] = len(grouped)
        for location_key, entries in grouped.items():
            self._refresh_location(location_key, entries, now)
        self.db.commit()
        return dict(self.stats)

    def _refresh_location(self, location_key: str, entries: list[tuple[Activity, ActivityWeatherSnapshot]], now: datetime) -> None:
        activity, _ = entries[0]
        # Fence every eventual write to the source version observed before the
        # upstream request. Location/date edits invalidate the row and make this
        # condition fail, so a slow request cannot restore stale weather.
        source_versions = {
            snapshot.activity_id: (snapshot.location_key, snapshot.target_date)
            for _, snapshot in entries
        }
        if not self.client.is_configured():
            self._mark_failure(entries, now, "service_unconfigured", source_versions)
            return
        try:
            self.stats["weather_request_count"] += 1
            weather_payload = self.client.get_daily_weather(
                longitude=float(activity.location_longitude), latitude=float(activity.location_latitude)
            )
        except Exception as exc:
            logger.warning("weather_refresh_location_failed location_key=%s error_type=%s", location_key, exc.__class__.__name__)
            self._mark_failure(entries, now, "upstream_unavailable", source_versions)
            return
        air_payload: dict[str, Any] | None = None
        if any(_is_air_range(snapshot.target_date, now) for _, snapshot in entries):
            try:
                self.stats["air_request_count"] += 1
                air_payload = self.client.get_daily_air_quality(
                    longitude=float(activity.location_longitude), latitude=float(activity.location_latitude)
                )
            except Exception as exc:
                logger.warning("weather_air_refresh_failed location_key=%s error_type=%s", location_key, exc.__class__.__name__)
        for activity, snapshot in entries:
            expected_location_key, expected_target_date = source_versions[snapshot.activity_id]
            daily = extract_daily_weather(weather_payload, expected_target_date)
            if daily is None:
                values = {
                    "temperature": None, "temperature_min": None, "temperature_max": None,
                    "condition": None, "icon_code": None, "humidity": None,
                    "wind_direction": None, "wind_scale": None, "air_quality": None,
                    "fetched_at": None, "last_success_at": None, "valid_until": None,
                    "status": "forecast_out_of_range", "failure_count": 0,
                    # Already in the calendar window, but upstream omitted this date.
                    "next_refresh_at": now + timedelta(hours=6),
                }
                if self._write_if_source_unchanged(snapshot.activity_id, expected_location_key, expected_target_date, values):
                    self.stats["snapshot_unavailable_count"] += 1
                continue
            valid_until = now + _next_interval(expected_target_date, activity, now)
            values = {
                **daily,
                "air_quality": (extract_air_quality(air_payload, expected_target_date)
                                if air_payload is not None else snapshot.air_quality)
                                if _is_air_range(expected_target_date, now) else None,
                "fetched_at": now,
                "status": "available",
                "attribution": ATTRIBUTION,
                "last_success_at": now,
                "valid_until": valid_until,
                "next_refresh_at": valid_until,
                "failure_count": 0,
            }
            if self._write_if_source_unchanged(snapshot.activity_id, expected_location_key, expected_target_date, values):
                self.stats["snapshot_success_count"] += 1

    def _write_if_source_unchanged(
        self,
        activity_id: int,
        location_key: str,
        target_date: date,
        values: dict[str, Any],
    ) -> bool:
        result = self.db.execute(
            update(ActivityWeatherSnapshot)
            .where(
                ActivityWeatherSnapshot.activity_id == activity_id,
                ActivityWeatherSnapshot.location_key == location_key,
                ActivityWeatherSnapshot.target_date == target_date,
            )
            .values(**values)
            .execution_options(synchronize_session=False)
        )
        return result.rowcount == 1

    def _mark_failure(
        self,
        entries: list[tuple[Activity, ActivityWeatherSnapshot]],
        now: datetime,
        reason: str,
        source_versions: dict[int, tuple[str, date]],
    ) -> None:
        for _activity, snapshot in entries:
            expected_location_key, expected_target_date = source_versions[snapshot.activity_id]
            failure_count = snapshot.failure_count + 1
            values: dict[str, Any] = {
                "fetched_at": now,
                "failure_count": failure_count,
                "next_refresh_at": now + _failure_delay(failure_count),
            }
            if snapshot.last_success_at and now <= snapshot.last_success_at + timedelta(hours=get_settings().qweather_stale_max_hours):
                values["status"] = "available"
                stat_name = "snapshot_stale_count"
            else:
                values.update({
                    "temperature": None, "temperature_min": None, "temperature_max": None,
                    "condition": None, "icon_code": None, "humidity": None,
                    "wind_direction": None, "wind_scale": None, "air_quality": None,
                    "last_success_at": None, "valid_until": None, "status": reason,
                })
                stat_name = "snapshot_unavailable_count"
            if self._write_if_source_unchanged(snapshot.activity_id, expected_location_key, expected_target_date, values):
                self.stats[stat_name] += 1
                self.stats["failure_count"] += 1


def refresh_activity_weather_in_background(bind, activity_id: int) -> None:
    """Refresh after the response using a separate session; reads stay network-free."""
    client = QWeatherClient()
    if not client.is_configured():
        return
    try:
        with Session(bind=bind, expire_on_commit=False) as db:
            ActivityWeatherRefreshService(db, client).refresh_due(activity_id=activity_id)
    except Exception:
        logger.exception("weather_initial_refresh_failed activity_id=%s", activity_id)

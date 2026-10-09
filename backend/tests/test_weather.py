from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.models import Activity, ActivityWeatherSnapshot, User
from app.services import activity_weather_service
from app.services.activity_weather_service import (
    ATTRIBUTION,
    ActivityWeatherRefreshService,
    ensure_weather_snapshot,
    get_activity_weather_snapshot,
    invalidate_weather_snapshot,
    snapshot_response,
)

NOW = datetime(2026, 9, 4, 10, 0, 0)


@pytest.fixture(autouse=True)
def freeze_weather_clock(monkeypatch) -> None:
    monkeypatch.setattr(activity_weather_service, "app_now", lambda: NOW)


def make_activity(
    db_session,
    admin_user: User,
    *,
    name: str = "天气测试活动",
    start_time: datetime = datetime(2026, 9, 5, 14, 0, 0),
    latitude: float | None = 39.9042,
    longitude: float | None = 116.4074,
) -> Activity:
    activity = Activity(
        name=name,
        status="未开始",
        remark="天气测试",
        max_participants=None,
        start_time=start_time,
        end_time=start_time + timedelta(hours=2),
        signup_deadline=start_time - timedelta(hours=1),
        signup_enabled=True,
        location_name="北京测试地点",
        location_address="北京测试地址",
        location_latitude=latitude,
        location_longitude=longitude,
        created_by=admin_user.id,
    )
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)
    return activity


class FakeQWeatherClient:
    def __init__(self, *, configured: bool = True, fail_weather: bool = False, fail_air: bool = False) -> None:
        self.configured = configured
        self.fail_weather = fail_weather
        self.fail_air = fail_air
        self.weather_calls: list[tuple[float, float]] = []
        self.air_calls: list[tuple[float, float]] = []

    def is_configured(self) -> bool:
        return self.configured

    def get_daily_weather(self, *, longitude: float, latitude: float) -> dict:
        self.weather_calls.append((longitude, latitude))
        if self.fail_weather:
            raise RuntimeError("weather unavailable")
        return {
            "daily": [
                {
                    "fxDate": "2026-09-05",
                    "tempMin": "18",
                    "tempMax": "24",
                    "textDay": "晴间多云",
                    "iconDay": "103",
                    "humidity": "58",
                    "windDirDay": "东南风",
                    "windScaleDay": "2",
                },
                {
                    "fxDate": "2026-09-06",
                    "tempMin": "19",
                    "tempMax": "25",
                    "textDay": "晴",
                    "iconDay": "100",
                    "humidity": "55",
                    "windDirDay": "北风",
                    "windScaleDay": "3",
                },
            ]
        }

    def get_daily_air_quality(self, *, longitude: float, latitude: float) -> dict:
        self.air_calls.append((longitude, latitude))
        if self.fail_air:
            raise RuntimeError("air unavailable")
        return {
            "days": [
                {
                    "forecastStartTime": "2026-09-05T00:00+08:00",
                    "indexes": [{"code": "cn-mee-1h", "category": "优", "aqi": "32"}],
                },
                {
                    "forecastStartTime": "2026-09-06T00:00+08:00",
                    "indexes": [{"code": "cn-mee-1h", "category": "良", "aqi": "51"}],
                },
            ]
        }


def test_activity_detail_returns_stable_pending_weather_without_upstream_request(client, admin_headers) -> None:
    start_time = datetime(2026, 9, 5, 14, 0, 0)
    created = client.post(
        "/api/v1/activities",
        headers=admin_headers,
        json={
            "name": "天气详情",
            "remark": "测试详情只读取快照",
            "start_time": start_time.isoformat(),
            "end_time": (start_time + timedelta(hours=2)).isoformat(),
            "location_latitude": 39.9042,
            "location_longitude": 116.4074,
        },
    )
    assert created.status_code == 201

    response = client.get(f"/api/v1/activities/{created.json()['id']}", headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["weather"] == {
        "available": False,
        "status": "pending",
        "reason": "weather_pending",
        "date": None,
        "temperature": None,
        "temperature_min": None,
        "temperature_max": None,
        "condition": "",
        "icon_code": "",
        "humidity": None,
        "wind_direction": "",
        "wind_scale": "",
        "air_quality": None,
        "attribution": ATTRIBUTION,
        "fetched_at": None,
        "valid_until": None,
        "stale": False,
    }


def test_activity_detail_serializes_available_weather_date(client, db_session, admin_headers, admin_user) -> None:
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.status = "available"
    snapshot.temperature = 24
    snapshot.condition = "晴"
    snapshot.icon_code = "100"
    snapshot.last_success_at = NOW
    snapshot.valid_until = NOW + timedelta(hours=6)
    db_session.commit()

    response = client.get(f"/api/v1/activities/{activity.id}", headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["weather"]["available"] is True
    assert response.json()["weather"]["date"] == "2026-09-05"
    assert response.json()["weather"]["temperature"] == 24


def test_retired_weather_endpoint_is_removed(client) -> None:
    assert "/api/v1/weather/activity" not in client.app.openapi()["paths"]
    response = client.get(
        "/api/v1/weather/activity",
        params={"longitude": 116.4, "latitude": 39.9, "date": "2026-09-07"},
    )
    assert response.status_code == 404


def test_refresh_deduplicates_same_location_and_keeps_weather_when_air_quality_fails(db_session, admin_user) -> None:
    first = make_activity(db_session, admin_user, name="第一场")
    second = make_activity(
        db_session,
        admin_user,
        name="第二场",
        start_time=datetime(2026, 9, 6, 14, 0, 0),
        latitude=39.90421,
        longitude=116.40741,
    )
    fake_client = FakeQWeatherClient(fail_air=True)

    result = ActivityWeatherRefreshService(db_session, fake_client).refresh_due(now=NOW)

    first_snapshot = db_session.get(ActivityWeatherSnapshot, first.id)
    second_snapshot = db_session.get(ActivityWeatherSnapshot, second.id)
    assert fake_client.weather_calls == [(116.4074, 39.9042)]
    assert fake_client.air_calls == [(116.4074, 39.9042)]
    assert result["weather_request_count"] == 1
    assert result["air_request_count"] == 1
    assert first_snapshot.status == "available"
    assert second_snapshot.status == "available"
    assert first_snapshot.temperature == 24
    assert second_snapshot.temperature == 25
    assert first_snapshot.air_quality is None
    assert second_snapshot.air_quality is None


def test_location_missing_and_outside_forecast_do_not_call_upstream(db_session, admin_user) -> None:
    missing_location = make_activity(db_session, admin_user, name="无定位", latitude=None, longitude=None)
    outside_forecast = make_activity(
        db_session,
        admin_user,
        name="超预报",
        start_time=datetime(2026, 10, 10, 14, 0, 0),
    )
    fake_client = FakeQWeatherClient()

    result = ActivityWeatherRefreshService(db_session, fake_client).refresh_due(now=NOW)

    assert fake_client.weather_calls == []
    assert result["unique_location_count"] == 0
    assert db_session.get(ActivityWeatherSnapshot, missing_location.id).status == "location_unavailable"
    assert db_session.get(ActivityWeatherSnapshot, outside_forecast.id).status == "forecast_out_of_range"


def test_refresh_skips_ended_and_cancelled_activities_even_when_status_is_stale(db_session, admin_user) -> None:
    ended = make_activity(
        db_session,
        admin_user,
        name="已结束但状态未同步",
        start_time=NOW - timedelta(hours=3),
    )
    ended.status = "进行中"
    cancelled = make_activity(db_session, admin_user, name="已取消活动")
    cancelled.status = "已取消"
    db_session.commit()

    result = ActivityWeatherRefreshService(db_session, FakeQWeatherClient()).refresh_due(now=NOW)

    assert result["candidate_activity_count"] == 0
    assert result["unique_location_count"] == 0



def test_weather_invalidation_only_resets_date_or_location_source(db_session, admin_user) -> None:
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.status = "available"
    snapshot.temperature = 24
    snapshot.last_success_at = NOW
    snapshot.valid_until = NOW + timedelta(hours=6)
    db_session.commit()

    activity.remark = "只改备注"
    db_session.commit()
    assert get_activity_weather_snapshot(db_session, activity.id)["available"] is True

    activity.start_time = datetime(2026, 9, 6, 14, 0, 0)
    invalidate_weather_snapshot(db_session, activity, now=NOW)
    db_session.commit()
    refreshed = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert refreshed.status == "pending"
    assert refreshed.target_date.isoformat() == "2026-09-06"
    assert refreshed.temperature is None


def test_stale_snapshot_is_returned_only_within_the_configured_stale_window(db_session, admin_user) -> None:
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.status = "available"
    snapshot.temperature = 24
    snapshot.last_success_at = NOW - timedelta(hours=1)
    snapshot.valid_until = NOW - timedelta(minutes=1)
    db_session.commit()

    stale = snapshot_response(snapshot, now=NOW)
    assert stale["available"] is True
    assert stale["stale"] is True


def test_unconfigured_refresh_uses_backoff_without_network(db_session, admin_user) -> None:
    activity = make_activity(db_session, admin_user)
    fake_client = FakeQWeatherClient(configured=False)

    ActivityWeatherRefreshService(db_session, fake_client).refresh_due(now=NOW)

    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert fake_client.weather_calls == []
    assert snapshot.status == "service_unconfigured"
    assert snapshot.failure_count == 1
    assert snapshot.next_refresh_at == NOW + timedelta(minutes=15)


def test_refresh_discards_result_when_location_changes_during_upstream_request(db_session, admin_user) -> None:
    activity = make_activity(db_session, admin_user)
    client = FakeQWeatherClient()
    original_get_weather = client.get_daily_weather

    def change_location_then_return(*, longitude: float, latitude: float) -> dict:
        payload = original_get_weather(longitude=longitude, latitude=latitude)
        activity.location_latitude = 31.2304
        activity.location_longitude = 121.4737
        invalidate_weather_snapshot(db_session, activity, now=NOW)
        db_session.commit()
        return payload

    client.get_daily_weather = change_location_then_return  # type: ignore[method-assign]

    result = ActivityWeatherRefreshService(db_session, client).refresh_due(now=NOW)

    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert snapshot.location_key == "121.4737:31.2304"
    assert snapshot.status == "pending"
    assert snapshot.temperature is None
    assert snapshot.next_refresh_at == NOW
    assert result.get("snapshot_success_count", 0) == 0


def test_missing_forecast_date_waits_six_hours_before_retry(db_session, admin_user):
    activity = make_activity(db_session, admin_user, start_time=datetime(2026, 9, 7, 14))
    fake = FakeQWeatherClient()
    service = ActivityWeatherRefreshService(db_session, fake)
    service.refresh_due(now=NOW)
    db_session.expire_all()
    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert snapshot.status == "forecast_out_of_range"
    assert snapshot.next_refresh_at == NOW + timedelta(hours=6)
    service.refresh_due(now=NOW + timedelta(hours=1))
    assert len(fake.weather_calls) == 1
    service.refresh_due(now=NOW + timedelta(hours=6))
    assert len(fake.weather_calls) == 2



def test_out_of_range_snapshot_refreshes_when_target_enters_forecast_window(db_session, admin_user):
    now = datetime(2026, 9, 5, 23)
    activity = make_activity(db_session, admin_user, start_time=datetime(2026, 10, 5, 14))
    fake = FakeQWeatherClient()
    original_get_daily_weather = fake.get_daily_weather

    def target_date_weather(*, longitude: float, latitude: float) -> dict:
        payload = original_get_daily_weather(longitude=longitude, latitude=latitude)
        payload["daily"][0]["fxDate"] = "2026-10-05"
        return payload

    fake.get_daily_weather = target_date_weather  # type: ignore[method-assign]
    service = ActivityWeatherRefreshService(db_session, fake)

    # More than 29 days away: persist a future eligibility time without calling upstream.
    service.refresh_due(now=now)
    db_session.expire_all()
    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert snapshot.status == "forecast_out_of_range"
    assert snapshot.next_refresh_at == datetime(2026, 9, 6, 0)
    assert fake.weather_calls == []

    # A later out-of-range pass must not push the eligibility time forward.
    service.refresh_due(now=now + timedelta(minutes=30))
    db_session.expire_all()
    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert snapshot.status == "forecast_out_of_range"
    assert snapshot.next_refresh_at == datetime(2026, 9, 6, 0)
    assert fake.weather_calls == []

    # On the first eligible date, normalize to pending, refresh upstream, and persist it.
    eligible_now = datetime(2026, 9, 6, 0)
    service.refresh_due(now=eligible_now)
    db_session.expire_all()
    snapshot = db_session.get(ActivityWeatherSnapshot, activity.id)
    assert len(fake.weather_calls) == 1
    assert snapshot.status == "available"
    assert snapshot.target_date.isoformat() == "2026-10-05"
    assert snapshot.temperature_min == 18
    assert snapshot.temperature_max == 24
    assert snapshot.next_refresh_at is not None
    assert snapshot.next_refresh_at > eligible_now
    service.refresh_due(now=eligible_now + timedelta(minutes=5))
    assert len(fake.weather_calls) == 1


def test_failed_air_request_keeps_previous_air_quality(db_session, admin_user):
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.air_quality = "优"
    db_session.commit()
    ActivityWeatherRefreshService(db_session, FakeQWeatherClient(fail_air=True)).refresh_due(now=NOW)
    db_session.expire_all()
    assert db_session.get(ActivityWeatherSnapshot, activity.id).air_quality == "优"


def test_expired_snapshot_has_consistent_unavailable_status(db_session, admin_user):
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.status = "available"
    snapshot.last_success_at = NOW - timedelta(days=30)
    response = snapshot_response(snapshot, now=NOW)
    assert response["available"] is False
    assert response["status"] == response["reason"] == "expired"


def test_same_day_time_edit_preserves_weather(db_session, admin_user):
    activity = make_activity(db_session, admin_user)
    snapshot = ensure_weather_snapshot(db_session, activity, now=NOW)
    snapshot.status = "available"
    snapshot.temperature = 24
    snapshot.last_success_at = NOW
    snapshot.next_refresh_at = NOW + timedelta(hours=6)
    db_session.commit()
    activity.start_time += timedelta(hours=1)
    invalidate_weather_snapshot(db_session, activity, now=NOW)
    assert snapshot.status == "available"
    assert snapshot.temperature == 24
    assert snapshot.next_refresh_at == NOW + timedelta(hours=6)


def test_background_refresh_only_fetches_requested_activity(db_session, admin_user, monkeypatch):
    first = make_activity(db_session, admin_user)
    second = make_activity(db_session, admin_user, longitude=121.4737, latitude=31.2304)
    fake = FakeQWeatherClient()
    monkeypatch.setattr(activity_weather_service, "QWeatherClient", lambda: fake)
    activity_weather_service.refresh_activity_weather_in_background(db_session.get_bind(), first.id)
    db_session.expire_all()
    assert fake.weather_calls == [(116.4074, 39.9042)]
    assert db_session.get(ActivityWeatherSnapshot, first.id).status == "available"
    assert db_session.get(ActivityWeatherSnapshot, second.id) is None


def test_create_and_update_schedule_weather_refresh(client, admin_headers, monkeypatch):
    from app.api.v1 import activities as v1
    from app.api.v2 import activities as v2
    calls = []
    monkeypatch.setattr(v1, "refresh_activity_weather_in_background", lambda bind, activity_id: calls.append(activity_id))
    monkeypatch.setattr(v2, "refresh_activity_weather_in_background", lambda bind, activity_id: calls.append(activity_id))
    payload = {
        "name": "后台天气", "remark": "后台刷新测试",
        "start_time": "2026-09-05T14:00:00", "end_time": "2026-09-05T16:00:00",
        "location_latitude": 39.9042, "location_longitude": 116.4074,
    }
    for version in ("v1", "v2"):
        data = dict(payload)
        if version == "v2":
            data["activity_cover_id"] = "aleksey-rico-001"
        created = client.post(f"/api/{version}/activities", headers=admin_headers, json=data)
        assert created.status_code == 201, created.text
        activity_id = created.json()["id"]
        edited = client.patch(f"/api/{version}/activities/{activity_id}", headers=admin_headers, json={"remark": "新备注"})
        assert edited.status_code == 200, edited.text
        assert calls[-2:] == [activity_id, activity_id]

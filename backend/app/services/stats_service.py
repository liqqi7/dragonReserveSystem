from __future__ import annotations

"""Statistics use cases."""

from datetime import date, datetime, time, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.utils.activity_status import CANCELLED_ACTIVITY_STATUSES, ENDED
from app.models import Activity, ActivityParticipant, User
from app.schemas.stats import (
    ActivityHeatmapDayResponse,
    ActivityRankingResponse,
    PigeonRankingResponse,
)
from app.utils.app_time import app_now, to_app_naive

_EXCLUDED_ACTIVITY_STATUSES = CANCELLED_ACTIVITY_STATUSES


def _heatmap_level(hours: float) -> int:
    if hours <= 0:
        return 0
    if hours <= 2:
        return 1
    if hours <= 4:
        return 2
    if hours <= 6:
        return 3
    return 4


def _heatmap_window(today: date) -> tuple[date, date]:
    """Return Monday of the first week and the exclusive end of 12 calendar weeks."""

    current_week_monday = today - timedelta(days=today.weekday())
    start = current_week_monday - timedelta(weeks=11)
    return start, start + timedelta(weeks=12)


def _split_activity_hours_by_day(
    start_time: datetime,
    end_time: datetime,
    window_start: date,
    window_end: date,
) -> dict[date, float]:
    start = to_app_naive(start_time)
    end = to_app_naive(end_time)
    if end <= start:
        return {}

    range_start = max(start, datetime.combine(window_start, time.min))
    range_end = min(end, datetime.combine(window_end, time.min))
    if range_end <= range_start:
        return {}

    result: dict[date, float] = {}
    cursor = range_start
    while cursor < range_end:
        next_day = datetime.combine(cursor.date() + timedelta(days=1), time.min)
        segment_end = min(next_day, range_end)
        result[cursor.date()] = result.get(cursor.date(), 0.0) + (
            segment_end - cursor
        ).total_seconds() / 3600
        cursor = segment_end
    return result


def _ended_participant_rows(db: Session, now_local_naive: datetime):
    return db.execute(
        select(
            ActivityParticipant.user_id,
            User.nickname,
            User.avatar_url,
            ActivityParticipant.checked_in_at,
            Activity.start_time,
            Activity.end_time,
        )
        .join(Activity, Activity.id == ActivityParticipant.activity_id)
        .join(User, User.id == ActivityParticipant.user_id)
        .where(Activity.status.not_in(_EXCLUDED_ACTIVITY_STATUSES))
        .where(or_(Activity.end_time <= now_local_naive, Activity.status == ENDED))
    ).all()


def get_pigeon_ranking(db: Session) -> list[PigeonRankingResponse]:
    """Compute the new pigeon board ordered by pigeon count."""

    rows = _ended_participant_rows(db, app_now())
    member_map: dict[int, dict[str, int | str]] = {}
    for user_id, nickname, avatar_url, checked_in_at, _, _ in rows:
        stat = member_map.setdefault(
            user_id,
            {
                "nickname": nickname,
                "avatar_url": avatar_url or "",
                "signup_count": 0,
                "checkin_count": 0,
            },
        )
        stat["nickname"] = nickname or stat["nickname"]
        stat["avatar_url"] = avatar_url or stat["avatar_url"]
        stat["signup_count"] += 1
        if checked_in_at is not None:
            stat["checkin_count"] += 1

    result: list[PigeonRankingResponse] = []
    for user_id, stat in member_map.items():
        signup_count = int(stat["signup_count"])
        checkin_count = int(stat["checkin_count"])
        pigeon_count = signup_count - checkin_count
        pigeon_rate = round((pigeon_count / signup_count) * 100, 1) if signup_count else 0.0
        result.append(
            PigeonRankingResponse(
                user_id=user_id,
                nickname=str(stat["nickname"]),
                avatar_url=str(stat["avatar_url"]),
                signup_count=signup_count,
                checkin_count=checkin_count,
                pigeon_count=pigeon_count,
                pigeon_rate=pigeon_rate,
            )
        )

    return sorted(
        result,
        key=lambda item: (item.pigeon_count, item.pigeon_rate, item.signup_count, -item.user_id),
        reverse=True,
    )

def get_activity_ranking(
    db: Session,
    *,
    today: date | None = None,
    offset: int = 0,
    limit: int | None = None,
) -> list[ActivityRankingResponse]:
    """Rank checked-in users and build heatmaps only for the requested page."""

    now_local_naive = app_now()
    current_day = today or now_local_naive.date()
    window_start, window_end = _heatmap_window(current_day)
    rows = _ended_participant_rows(db, now_local_naive)

    member_map: dict[int, dict[str, object]] = {}
    for user_id, nickname, avatar_url, checked_in_at, start_time, end_time in rows:
        if checked_in_at is None:
            continue
        stat = member_map.setdefault(
            user_id,
            {
                "nickname": nickname,
                "avatar_url": avatar_url or "",
                "checkin_count": 0,
                "daily_hours": {},
            },
        )
        stat["nickname"] = nickname or stat["nickname"]
        stat["avatar_url"] = avatar_url or stat["avatar_url"]
        stat["checkin_count"] = int(stat["checkin_count"]) + 1
        daily_hours = stat["daily_hours"]
        for activity_date, hours in _split_activity_hours_by_day(
            start_time, end_time, window_start, window_end
        ).items():
            daily_hours[activity_date] = daily_hours.get(activity_date, 0.0) + hours

    ranked_members = sorted(
        member_map.items(),
        key=lambda item: (
            int(item[1]["checkin_count"]),
            sum(1 for hours in item[1]["daily_hours"].values() if hours > 0),
            -item[0],
        ),
        reverse=True,
    )
    page_end = None if limit is None else offset + limit
    page_members = ranked_members[offset:page_end]

    result: list[ActivityRankingResponse] = []
    for user_id, stat in page_members:
        daily_hours = stat["daily_hours"]
        heatmap: list[ActivityHeatmapDayResponse] = []
        cursor = window_start
        while cursor < window_end:
            hours = round(float(daily_hours.get(cursor, 0.0)), 2)
            heatmap.append(
                ActivityHeatmapDayResponse(
                    date=cursor,
                    duration_hours=hours,
                    level=_heatmap_level(hours),
                )
            )
            cursor += timedelta(days=1)
        result.append(
            ActivityRankingResponse(
                user_id=user_id,
                nickname=str(stat["nickname"]),
                avatar_url=str(stat["avatar_url"]),
                checkin_count=int(stat["checkin_count"]),
                attendance_days=sum(1 for hours in daily_hours.values() if hours > 0),
                heatmap=heatmap,
            )
        )

    return result

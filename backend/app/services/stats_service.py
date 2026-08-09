from __future__ import annotations

"""Statistics use cases."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Activity
from app.schemas.stats import PigeonStatResponse

# 小程序端对无 Z 后缀的 ISO 时间按设备本地时区解析；国内用户即东八区。
# 库内 naive datetime 与 utcnow() 直接比较会把「本地日历日」误判为未来，导致已结束活动未计入鸽子榜。
try:
    _APP_LOCAL_TZ = ZoneInfo("Asia/Shanghai")
except (ZoneInfoNotFoundError, ModuleNotFoundError):  # 未安装 tzdata 等，见 PEP 615
    _APP_LOCAL_TZ = timezone(timedelta(hours=8))  # 中国大陆无夏令时，与东八区一致


def _activity_end_to_utc(end_time: datetime) -> datetime:
    """将活动结束时刻转为 UTC，与小程序「本地墙钟」语义一致。"""
    if end_time.tzinfo is not None:
        return end_time.astimezone(timezone.utc)
    return end_time.replace(tzinfo=_APP_LOCAL_TZ).astimezone(timezone.utc)


def _pigeon_stats_now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_pigeon_stats(db: Session) -> list[PigeonStatResponse]:
    """Compute signup/checkin ranking for ended activities."""

    now_utc = _pigeon_stats_now_utc()
    activities = list(
        db.scalars(
            select(Activity)
            .options(selectinload(Activity.participants))
            .order_by(Activity.start_time.desc())
        )
        .unique()
        .all()
    )

    member_map: dict[int, dict[str, int | str]] = {}
    for activity in activities:
        if activity.status in ("已取消", "已流局"):
            continue
        end_utc = _activity_end_to_utc(activity.end_time)
        if end_utc > now_utc and activity.status not in ("已结束",):
            continue

        for participant in activity.participants:
            stat = member_map.setdefault(
                participant.user_id,
                {
                    "nickname": participant.display_nickname,
                    "signup_count": 0,
                    "checkin_count": 0,
                },
            )
            stat["signup_count"] += 1
            if participant.checked_in_at is not None:
                stat["checkin_count"] += 1

    result = []
    for user_id, stat in member_map.items():
        signup_count = int(stat["signup_count"])
        checkin_count = int(stat["checkin_count"])
        pigeon_count = signup_count - checkin_count
        pigeon_rate = round((pigeon_count / signup_count) * 100, 1) if signup_count else 0.0
        result.append(
            PigeonStatResponse(
                user_id=user_id,
                nickname=str(stat["nickname"]),
                signup_count=signup_count,
                checkin_count=checkin_count,
                pigeon_count=pigeon_count,
                pigeon_rate=pigeon_rate,
            )
        )

    # 排序规则：
    # 1. 按鸽子率从高到低
    # 2. 鸽子率相同按报名次数从高到低
    return sorted(
        result,
        key=lambda item: (item.pigeon_rate, item.signup_count),
        reverse=True,
    )

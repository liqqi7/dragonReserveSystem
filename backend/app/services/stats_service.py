from __future__ import annotations

"""Statistics use cases."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Activity, ActivityParticipant
from app.schemas.stats import PigeonStatResponse

# 小程序端对无 Z 后缀的 ISO 时间按设备本地时区解析；国内用户即东八区。
# 库内 naive datetime 与 utcnow() 直接比较会把「本地日历日」误判为未来，导致已结束活动未计入鸽子榜。
try:
    _APP_LOCAL_TZ = ZoneInfo("Asia/Shanghai")
except (ZoneInfoNotFoundError, ModuleNotFoundError):  # 未安装 tzdata 等，见 PEP 615
    _APP_LOCAL_TZ = timezone(timedelta(hours=8))  # 中国大陆无夏令时，与东八区一致


def get_pigeon_stats(db: Session) -> list[PigeonStatResponse]:
    """Compute signup/checkin ranking for ended activities."""

    now_local_naive = datetime.now(_APP_LOCAL_TZ).replace(tzinfo=None)
    rows = db.execute(
        select(
            ActivityParticipant.user_id,
            ActivityParticipant.display_nickname,
            ActivityParticipant.checked_in_at,
        )
        .join(Activity, Activity.id == ActivityParticipant.activity_id)
        .where(Activity.status.not_in(("已取消", "已流局", "已删除")))
        .where(or_(Activity.end_time <= now_local_naive, Activity.status == "已结束"))
    ).all()

    member_map: dict[int, dict[str, int | str]] = {}
    for user_id, display_nickname, checked_in_at in rows:
        stat = member_map.setdefault(
            user_id,
            {
                "nickname": display_nickname,
                "signup_count": 0,
                "checkin_count": 0,
            },
        )
        stat["signup_count"] += 1
        if checked_in_at is not None:
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


def get_ended_activity_count(db: Session) -> int:
    """Return the history-page activity count without fetching the activity list."""

    now_local_naive = datetime.now(_APP_LOCAL_TZ).replace(tzinfo=None)
    count = db.scalar(
        select(func.count(Activity.id))
        .where(Activity.status.not_in(("已取消", "已流局", "已删除")))
        .where(Activity.end_time <= now_local_naive)
    )
    return int(count or 0)

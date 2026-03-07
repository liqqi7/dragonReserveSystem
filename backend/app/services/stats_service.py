"""Statistics use cases."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Activity, Bill
from app.schemas.stats import ActivityBillStatResponse, PigeonStatResponse


def get_pigeon_stats(db: Session) -> list[PigeonStatResponse]:
    """Compute signup/checkin ranking for ended activities."""

    now = datetime.utcnow()
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
        if activity.status == "已取消":
            continue
        if activity.end_time > now and activity.status != "已结束":
            continue

        for participant in activity.participants:
            stat = member_map.setdefault(
                participant.user_id,
                {
                    "nickname": participant.nickname_snapshot,
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

    return sorted(result, key=lambda item: item.pigeon_count, reverse=True)


def get_activity_bill_stats(db: Session) -> list[ActivityBillStatResponse]:
    """Aggregate bills by activity."""

    bills = list(db.scalars(select(Bill).options(selectinload(Bill.participants))).unique().all())
    activity_name_map = {
        activity.id: activity.name
        for activity in db.scalars(select(Activity)).all()
    }
    grouped: dict[int | None, dict[str, object]] = {}

    for bill in bills:
        bucket = grouped.setdefault(
            bill.activity_id,
            {
                "activity_name": (
                    activity_name_map.get(bill.activity_id, f"活动 {bill.activity_id}")
                    if bill.activity_id is not None
                    else "未关联活动"
                ),
                "total_amount": Decimal("0.00"),
                "participants": set(),
            },
        )
        bucket["total_amount"] += bill.total_amount
        participants = bucket["participants"]
        for participant in bill.participants:
            participants.add(participant.user_id)

    result = []
    for activity_id, bucket in grouped.items():
        participant_count = len(bucket["participants"])
        total_amount = bucket["total_amount"]
        avg_amount = float(total_amount / participant_count) if participant_count else 0.0
        result.append(
            ActivityBillStatResponse(
                activity_id=activity_id,
                activity_name=str(bucket["activity_name"]),
                total_amount=float(total_amount),
                participant_count=participant_count,
                avg_amount=round(avg_amount, 2),
            )
        )

    return sorted(result, key=lambda item: (item.activity_id is None, -(item.activity_id or 0)))

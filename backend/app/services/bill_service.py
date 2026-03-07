from __future__ import annotations

"""Bill use cases."""

from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models import Activity, Bill, BillParticipant, User
from app.schemas.bill import BillCreateRequest, BillUpdateRequest


def _money(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _get_bill_query():
    return select(Bill).options(selectinload(Bill.participants)).order_by(Bill.date.desc(), Bill.id.desc())


def _get_users_by_ids(db: Session, user_ids: list[int]) -> list[User]:
    users = list(db.scalars(select(User).where(User.id.in_(user_ids))).all())
    if len(users) != len(set(user_ids)):
        raise ValidationAppError("One or more bill participants do not exist")
    return users


def _get_activity_name(db: Session, activity_id: int | None) -> str:
    if activity_id is None:
        return "未关联活动"
    activity = db.scalar(select(Activity).where(Activity.id == activity_id))
    if activity is None:
        raise ValidationAppError("Referenced activity does not exist")
    return activity.name


def list_bills(db: Session) -> list[Bill]:
    """List bills with their participants."""

    return list(db.scalars(_get_bill_query()).unique().all())


def get_bill_by_id(db: Session, bill_id: int) -> Bill:
    """Fetch a bill by id."""

    bill = db.scalar(_get_bill_query().where(Bill.id == bill_id))
    if bill is None:
        raise NotFoundError("Bill not found")
    return bill


def create_bill(db: Session, payload: BillCreateRequest) -> Bill:
    """Create a new bill and snapshot its participants."""

    participant_users = _get_users_by_ids(db, payload.participant_user_ids)
    payer = db.get(User, payload.payer_user_id)
    if payer is None:
        raise ValidationAppError("Payer does not exist")

    _get_activity_name(db, payload.activity_id)

    total_amount = _money(payload.total_amount)
    per_share = (total_amount / len(participant_users)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    bill = Bill(
        activity_id=payload.activity_id,
        item=payload.item,
        note=payload.note,
        total_amount=total_amount,
        payer_user_id=payer.id,
        payer_name_snapshot=payer.nickname,
        per_share=per_share,
        date=payload.date,
        participants=[
            BillParticipant(user_id=user.id, nickname_snapshot=user.nickname)
            for user in participant_users
        ],
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return get_bill_by_id(db, bill.id)


def update_bill(db: Session, bill: Bill, payload: BillUpdateRequest) -> Bill:
    """Update a bill and recalculate shares when needed."""

    data = payload.model_dump(exclude_unset=True)

    participant_user_ids = data.pop("participant_user_ids", None)
    if participant_user_ids is not None:
        participant_users = _get_users_by_ids(db, participant_user_ids)
        bill.participants = [
            BillParticipant(user_id=user.id, nickname_snapshot=user.nickname)
            for user in participant_users
        ]

    if "payer_user_id" in data:
        payer = db.get(User, data["payer_user_id"])
        if payer is None:
            raise ValidationAppError("Payer does not exist")
        bill.payer_user_id = payer.id
        bill.payer_name_snapshot = payer.nickname
        data.pop("payer_user_id")

    if "activity_id" in data:
        _get_activity_name(db, data["activity_id"])

    if "total_amount" in data:
        bill.total_amount = _money(data.pop("total_amount"))

    for key, value in data.items():
        setattr(bill, key, value)

    if not bill.participants:
        raise ValidationAppError("Bill must contain at least one participant")
    bill.per_share = (bill.total_amount / len(bill.participants)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    db.add(bill)
    db.commit()
    db.refresh(bill)
    return get_bill_by_id(db, bill.id)


def delete_bill(db: Session, bill: Bill) -> None:
    """Delete a bill."""

    db.delete(bill)
    db.commit()

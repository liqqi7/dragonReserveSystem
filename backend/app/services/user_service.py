"""User use cases."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationAppError
from app.models import ActivityParticipant, Bill, BillParticipant, User
from app.schemas.user import UpdateCurrentUserRequest

settings = get_settings()


def get_user_by_id(db: Session, user_id: int) -> User:
    """Fetch a user by primary key."""

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise NotFoundError("User not found")
    return user


def update_current_user(db: Session, user: User, payload: UpdateCurrentUserRequest) -> User:
    """Update editable fields on the current user."""

    user.nickname = payload.nickname
    user.avatar_url = payload.avatar_url

    participant_snapshots = list(
        db.scalars(select(ActivityParticipant).where(ActivityParticipant.user_id == user.id)).all()
    )
    for participant in participant_snapshots:
        participant.nickname_snapshot = user.nickname
        participant.avatar_url_snapshot = user.avatar_url
        db.add(participant)

    bill_participant_snapshots = list(
        db.scalars(select(BillParticipant).where(BillParticipant.user_id == user.id)).all()
    )
    for participant in bill_participant_snapshots:
        participant.nickname_snapshot = user.nickname
        db.add(participant)

    payer_bills = list(db.scalars(select(Bill).where(Bill.payer_user_id == user.id)).all())
    for bill in payer_bills:
        bill.payer_name_snapshot = user.nickname
        db.add(bill)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_role_by_invite_code(db: Session, user: User, invite_code: str) -> User:
    """Promote a user role based on invite code."""

    if invite_code == settings.admin_invite_code:
        user.role = "admin"
    elif invite_code == settings.user_invite_code:
        user.role = "user"
    else:
        raise ValidationAppError("Invite code is invalid")

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def clear_user_role(db: Session, user: User) -> User:
    """Reset a user role back to guest."""

    user.role = "guest"
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

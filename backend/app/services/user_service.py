"""User use cases."""

from sqlalchemy import select
from sqlalchemy.orm import Session
from urllib.parse import urlparse

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationAppError
from app.models import ActivityParticipant, User
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

    avatar_url = payload.avatar_url
    if avatar_url and avatar_url != user.avatar_url:
        avatar_path = urlparse(avatar_url).path
        expected_prefix = f"{settings.media_url_prefix.rstrip('/')}/avatars/"
        if not avatar_path.startswith(expected_prefix):
            raise ValidationAppError("Avatar must be uploaded through the avatar upload endpoint")

    user.nickname = payload.nickname
    user.avatar_url = avatar_url

    participant_display_records = list(
        db.scalars(select(ActivityParticipant).where(ActivityParticipant.user_id == user.id)).all()
    )
    for participant in participant_display_records:
        participant.display_nickname = user.nickname
        participant.display_avatar_url = user.avatar_url
        db.add(participant)

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

"""User use cases."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import User
from app.schemas.user import UpdateCurrentUserRequest


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
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

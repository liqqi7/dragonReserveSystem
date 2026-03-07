from __future__ import annotations

"""Authentication use cases."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models import User
from app.schemas.auth import RegisterRequest

settings = get_settings()


def authenticate_user(db: Session, username: str, password: str) -> User:
    """Authenticate a user by username and password."""

    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid username or password")
    return user


def issue_access_token(user: User) -> dict[str, int | str]:
    """Issue an access token for the given user."""

    token = create_access_token(subject=str(user.id), role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }


def register_user(db: Session, payload: RegisterRequest) -> User:
    """Create a local account with guest role by default."""

    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing is not None:
        raise ConflictError("Username already exists")

    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        nickname=payload.nickname,
        avatar_url=payload.avatar_url,
        role="guest",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

"""Authentication use cases."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.security import create_access_token, verify_password
from app.models import User

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

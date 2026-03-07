"""Shared API dependencies."""

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import TokenPayload, decode_access_token
from app.models import User
from app.services.user_service import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    """Return the decoded token payload for the current request."""

    try:
        return decode_access_token(token)
    except Exception as exc:  # pragma: no cover - tightened after auth is wired
        raise AuthenticationError("Invalid or expired token") from exc


def get_current_user(
    payload: TokenPayload = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the current authenticated user from the access token."""

    try:
        user_id = int(payload.sub)
    except ValueError as exc:  # pragma: no cover - token generation owns shape
        raise AuthenticationError("Invalid token subject") from exc
    return get_user_by_id(db, user_id)


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the current user has admin privileges."""

    if user.role != "admin":
        raise PermissionDeniedError("Admin permission required")
    return user

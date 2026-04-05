from __future__ import annotations

"""Authentication and password utilities."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings


settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@dataclass
class TokenPayload:
    """Minimal token payload used by the service layer."""

    sub: str
    role: str
    exp: int


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its hash."""

    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for persistence."""

    return pwd_context.hash(password)


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    """Create a signed JWT access token."""

    lifetime = expires_minutes or settings.access_token_expire_minutes
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=lifetime)
    payload = {
        "sub": subject,
        "role": role,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenPayload:
    """Decode and validate a JWT access token."""

    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    return TokenPayload(
        sub=str(payload["sub"]),
        role=str(payload.get("role", "")),
        exp=int(payload["exp"]),
    )

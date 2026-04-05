from __future__ import annotations

"""Authentication use cases."""

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, ConflictError, IntegrationError, ValidationAppError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models import User
from app.schemas.auth import RegisterRequest, WeChatLoginRequest

settings = get_settings()


def authenticate_user(db: Session, username: str, password: str) -> User:
    """Authenticate a user by username and password."""

    user = db.scalar(select(User).where(User.username == username))
    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
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


def exchange_wechat_code(code: str) -> dict:
    """Exchange a wx.login code for openid/session data."""

    s = get_settings()

    if not s.wechat_app_id or not s.wechat_app_secret:
        raise ValidationAppError("WeChat login is not configured")

    try:
        response = httpx.get(
            s.wechat_code2session_url,
            params={
                "appid": s.wechat_app_id,
                "secret": s.wechat_app_secret,
                "js_code": code,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise IntegrationError("Failed to contact WeChat login service") from exc

    payload = response.json()
    if payload.get("errcode"):
        raise AuthenticationError(payload.get("errmsg") or "WeChat login failed")

    openid = payload.get("openid")
    if not openid:
        raise AuthenticationError("WeChat login did not return openid")

    return payload


def login_or_register_wechat_user(db: Session, payload: WeChatLoginRequest) -> User:
    """Authenticate a user via WeChat mini program login."""

    session_payload = exchange_wechat_code(payload.code)
    openid = str(session_payload["openid"])
    user = db.scalar(select(User).where(User.wechat_openid == openid))

    nickname = (payload.profile.nickname or "").strip() or "微信用户"
    avatar_url = (payload.profile.avatar_url or "").strip()

    if user is None:
        user = User(
            username=None,
            wechat_openid=openid,
            password_hash=None,
            nickname=nickname,
            avatar_url=avatar_url,
            role="guest",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    updated = False
    if nickname and (user.nickname == "微信用户" or not user.nickname.strip()):
        user.nickname = nickname
        updated = True
    if avatar_url and not user.avatar_url:
        user.avatar_url = avatar_url
        updated = True

    if updated:
        db.add(user)
        db.commit()
        db.refresh(user)

    return user

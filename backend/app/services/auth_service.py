from __future__ import annotations

"""Authentication use cases."""

import httpx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, IntegrationError, ValidationAppError
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import WeChatLoginRequest

settings = get_settings()


def issue_access_token(user: User) -> dict[str, int | str]:
    """Issue an access token for the given user."""

    token = create_access_token(subject=str(user.id), role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }


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

    try:
        payload = response.json()
    except ValueError as exc:
        raise IntegrationError("Invalid WeChat login response") from exc
    if not isinstance(payload, dict):
        raise IntegrationError("Invalid WeChat login response")
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

    if user is None:
        user = User(
            username=None,
            wechat_openid=openid,
            password_hash=None,
            nickname="微信用户",
            avatar_url="",
            role="guest",
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # Another first login may have inserted the same openid meanwhile.
            existing = db.scalar(select(User).where(User.wechat_openid == openid))
            if existing is None:
                raise
            return existing
        db.refresh(user)
        return user

    return user

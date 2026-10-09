"""WeChat-only authentication routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import TokenResponse, WeChatLoginRequest
from app.services.auth_service import issue_access_token, login_or_register_wechat_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/wechat-login", response_model=TokenResponse, summary="Login with wx.login code")
def wechat_login(payload: WeChatLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a mini program user via wx.login code."""
    return TokenResponse(**issue_access_token(login_or_register_wechat_user(db, payload)))

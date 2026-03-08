"""Authentication routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, WeChatLoginRequest
from app.schemas.user import CurrentUserResponse
from app.services.auth_service import (
    authenticate_user,
    issue_access_token,
    login_or_register_wechat_user,
    register_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse, summary="Login with username and password")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a user and issue an access token."""

    user = authenticate_user(db, payload.username, payload.password)
    token = issue_access_token(user)
    return TokenResponse(**token)


@router.post("/register", response_model=CurrentUserResponse, summary="Register local account")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> CurrentUserResponse:
    """Create a new local account."""

    user = register_user(db, payload)
    return CurrentUserResponse.model_validate(user, from_attributes=True)


@router.post("/wechat-login", response_model=TokenResponse, summary="Login with wx.login code")
def wechat_login(payload: WeChatLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a mini program user via wx.login code and issue an access token."""

    user = login_or_register_wechat_user(db, payload)
    token = issue_access_token(user)
    return TokenResponse(**token)

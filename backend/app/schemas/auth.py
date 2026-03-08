"""Authentication schemas."""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Credentials used for login."""

    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """Successful authentication response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class WeChatProfilePayload(BaseModel):
    """Optional profile payload provided by the mini program client."""

    nickname: str = Field(default="", max_length=64)
    avatar_url: str = Field(default="", max_length=512)


class WeChatLoginRequest(BaseModel):
    """Payload used for mini program login via wx.login code."""

    code: str = Field(min_length=1, max_length=255)
    profile: WeChatProfilePayload = Field(default_factory=WeChatProfilePayload)


class RegisterRequest(BaseModel):
    """Payload used to create a local user account."""

    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(min_length=1, max_length=64)
    avatar_url: str = Field(default="", max_length=512)

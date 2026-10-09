"""Authentication schemas."""

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    """Successful authentication response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class WeChatProfilePayload(BaseModel):
    """Legacy profile payload accepted for compatibility and ignored by the server."""

    nickname: str = Field(default="", max_length=64)
    avatar_url: str = Field(default="", max_length=512)


class WeChatLoginRequest(BaseModel):
    """Payload used for mini program login via wx.login code."""

    code: str = Field(min_length=1, max_length=255)
    profile: WeChatProfilePayload = Field(default_factory=WeChatProfilePayload)

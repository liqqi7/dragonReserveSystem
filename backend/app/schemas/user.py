from __future__ import annotations

"""User schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


TEMP_AVATAR_URL_PREFIXES = (
    "http://tmp/",
    "https://tmp/",
    "wxfile://",
    "tmp/",
)


class CurrentUserResponse(BaseModel):
    """Current authenticated user payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: Optional[str]
    wechat_openid: Optional[str]
    nickname: str
    avatar_url: str
    role: str
    created_at: datetime
    updated_at: datetime


class UpdateCurrentUserRequest(BaseModel):
    """Allowed editable fields for the current user."""

    nickname: str = Field(min_length=1, max_length=64)
    avatar_url: str = Field(default="", max_length=512)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str) -> str:
        normalized = value.strip()
        lowered = normalized.lower()
        if lowered.startswith(TEMP_AVATAR_URL_PREFIXES):
            raise ValueError("avatar_url must be a permanent URL")
        return normalized


class UpdateRoleRequest(BaseModel):
    """Invite-code based role update request."""

    invite_code: str = Field(min_length=1, max_length=64)


class AvatarUploadResponse(BaseModel):
    """Uploaded avatar metadata returned to the client."""

    avatar_url: str

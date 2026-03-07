"""User schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CurrentUserResponse(BaseModel):
    """Current authenticated user payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nickname: str
    avatar_url: str
    role: str
    created_at: datetime
    updated_at: datetime


class UpdateCurrentUserRequest(BaseModel):
    """Allowed editable fields for the current user."""

    nickname: str = Field(min_length=1, max_length=64)
    avatar_url: str = Field(default="", max_length=512)


class UpdateRoleRequest(BaseModel):
    """Invite-code based role update request."""

    invite_code: str = Field(min_length=1, max_length=64)

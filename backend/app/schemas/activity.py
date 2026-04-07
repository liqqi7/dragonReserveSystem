from __future__ import annotations

"""Activity schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.activity_type_style_service import get_allowed_activity_types, normalize_activity_type_key


def _normalize_activity_type(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = normalize_activity_type_key(value)
    if not normalized:
        return None
    allowed = get_allowed_activity_types()
    if normalized not in allowed:
        raise ValueError(f"activity_type must be one of: {', '.join(sorted(allowed))}")
    return normalized


class ActivityParticipantResponse(BaseModel):
    """Participant payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    nickname_snapshot: str
    avatar_url_snapshot: str
    checked_in_at: Optional[datetime]
    checkin_lat: Optional[float]
    checkin_lng: Optional[float]
    created_at: datetime


class ActivityResponse(BaseModel):
    """Activity payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    remark: str
    max_participants: Optional[int]
    start_time: datetime
    end_time: datetime
    signup_deadline: Optional[datetime]
    signup_enabled: bool
    activity_type: Optional[str]
    activity_style_key: Optional[str]
    location_name: str
    location_address: str
    location_latitude: Optional[float]
    location_longitude: Optional[float]
    created_by: int
    created_at: datetime
    updated_at: datetime
    participants: list[ActivityParticipantResponse]

    @field_validator("activity_type", mode="before")
    @classmethod
    def default_activity_type(cls, value: Optional[str]) -> str:
        normalized = _normalize_activity_type(value)
        return normalized or "other"


class ActivityCreateRequest(BaseModel):
    """Admin-only activity creation payload."""

    name: str = Field(min_length=1, max_length=128)
    status: str = Field(default="进行中", max_length=32)
    remark: str = ""
    max_participants: Optional[int] = Field(default=None, ge=1, le=999)
    start_time: datetime
    end_time: datetime
    signup_deadline: Optional[datetime] = None
    signup_enabled: bool = Field(default=True)
    activity_type: Optional[str] = Field(default=None, max_length=32)
    activity_style_key: Optional[str] = Field(default=None, max_length=64)
    location_name: str = Field(default="", max_length=255)
    location_address: str = Field(default="", max_length=255)
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, value: datetime, info) -> datetime:
        start_time = info.data.get("start_time")
        if start_time and value <= start_time:
            raise ValueError("end_time must be later than start_time")
        return value

    @field_validator("signup_deadline")
    @classmethod
    def validate_signup_deadline(cls, value: Optional[datetime], info) -> Optional[datetime]:
        start_time = info.data.get("start_time")
        if value and start_time and value > start_time:
            raise ValueError("signup_deadline must be earlier than or equal to start_time")
        return value

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_activity_type(value)


class ActivityUpdateRequest(BaseModel):
    """Admin-only activity update payload."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    status: Optional[str] = Field(default=None, max_length=32)
    remark: Optional[str] = None
    max_participants: Optional[int] = Field(default=None, ge=1, le=999)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    signup_deadline: Optional[datetime] = None
    signup_enabled: Optional[bool] = None
    activity_type: Optional[str] = Field(default=None, max_length=32)
    activity_style_key: Optional[str] = Field(default=None, max_length=64)
    location_name: Optional[str] = Field(default=None, max_length=255)
    location_address: Optional[str] = Field(default=None, max_length=255)
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_activity_type(value)


class ActivitySignupResponse(BaseModel):
    """Signup and checkin result payload."""

    activity_id: int
    participant_id: int
    status: str


class ActivityCheckinRequest(BaseModel):
    """Checkin payload from the client."""

    lat: float
    lng: float


class ActivityTypeStyleResponse(BaseModel):
    """Activity type style payload."""

    class StyleVariant(BaseModel):
        style_key: str
        style_name: str
        badge_label: str
        show_badge: bool
        show_avatar_cluster: bool
        large_card_bg_image_url: str
        small_card_bg_image_url: str
        bg_video_url: Optional[str]

    key: str
    display_name: str
    default_style_key: str
    styles: list[StyleVariant]


class ActivitySharePreviewResponse(BaseModel):
    """Share preview generation result."""

    status: str
    image_url: Optional[str] = None


class ActivityStyleSignatureResponse(BaseModel):
    """Global signature for style-related resource invalidation."""

    signature: str
    activity_count: int

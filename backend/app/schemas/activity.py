from __future__ import annotations

"""Activity schemas."""

from datetime import date as Date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


MAX_ACTIVITY_NAME_LENGTH = 10
MAX_ACTIVITY_REMARK_LENGTH = 200


def _validate_required_text(value: object, field_name: str) -> object:
    if value is None:
        raise ValueError(f"{field_name} is required")
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_name} is required")
    return normalized


class ActivitySubItemResponse(BaseModel):
    """Sub-item payload within an activity."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    max_participants: int
    current_participants: int = 0
    signed_up: bool = False
    sort_order: int = 0


class ActivitySubItemInput(BaseModel):
    """Sub-item creation / update payload."""

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return _validate_required_text(value, "name")

    id: Optional[int] = Field(default=None, gt=0)
    name: str = Field(min_length=1, max_length=64)
    max_participants: int = Field(ge=1, le=999)


class ActivityParticipantResponse(BaseModel):
    """Participant payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    display_nickname: str
    display_avatar_url: str
    checked_in_at: Optional[datetime]
    checkin_method: Optional[str]
    checkin_lat: Optional[float]
    checkin_lng: Optional[float]
    checkin_location_name: Optional[str]
    checkin_address: Optional[str]
    created_at: datetime
    sub_item_ids: list[int] = Field(default_factory=list)


class ActivityWeatherResponse(BaseModel):
    """Server-persisted weather state for an activity detail response."""

    available: bool
    status: str
    reason: Optional[str] = None
    date: Optional[Date] = None
    temperature: Optional[int | float] = None
    temperature_min: Optional[int | float] = None
    temperature_max: Optional[int | float] = None
    condition: str = ""
    icon_code: str = ""
    humidity: Optional[int | float] = None
    wind_direction: str = ""
    wind_scale: str = ""
    air_quality: Optional[str] = None
    attribution: str
    fetched_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    stale: bool = False


class ActivitySignupRequest(BaseModel):
    """Signup payload from the client."""

    sub_item_ids: list[int] = Field(default_factory=list)


class ActivitySignupResponse(BaseModel):
    """Signup and checkin result payload."""

    activity_id: int
    participant_id: int
    status: str
    sub_item_ids: list[int] = Field(default_factory=list)


class ActivityCheckinRequest(BaseModel):
    """Checkin payload from the client."""

    lat: float
    lng: float

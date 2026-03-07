"""Activity schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ActivityParticipantResponse(BaseModel):
    """Participant payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    nickname_snapshot: str
    avatar_url_snapshot: str
    checked_in_at: datetime | None
    checkin_lat: float | None
    checkin_lng: float | None
    created_at: datetime


class ActivityResponse(BaseModel):
    """Activity payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    remark: str
    max_participants: int
    start_time: datetime
    end_time: datetime
    signup_deadline: datetime | None
    location_name: str
    location_address: str
    location_latitude: float | None
    location_longitude: float | None
    created_by: int
    created_at: datetime
    updated_at: datetime
    participants: list[ActivityParticipantResponse]


class ActivityCreateRequest(BaseModel):
    """Admin-only activity creation payload."""

    name: str = Field(min_length=1, max_length=128)
    status: str = Field(default="进行中", max_length=32)
    remark: str = ""
    max_participants: int = Field(default=20, ge=1, le=999)
    start_time: datetime
    end_time: datetime
    signup_deadline: datetime | None = None
    location_name: str = Field(default="", max_length=255)
    location_address: str = Field(default="", max_length=255)
    location_latitude: float | None = None
    location_longitude: float | None = None

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, value: datetime, info) -> datetime:
        start_time = info.data.get("start_time")
        if start_time and value <= start_time:
            raise ValueError("end_time must be later than start_time")
        return value

    @field_validator("signup_deadline")
    @classmethod
    def validate_signup_deadline(cls, value: datetime | None, info) -> datetime | None:
        start_time = info.data.get("start_time")
        if value and start_time and value > start_time:
            raise ValueError("signup_deadline must be earlier than or equal to start_time")
        return value


class ActivityUpdateRequest(BaseModel):
    """Admin-only activity update payload."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    status: str | None = Field(default=None, max_length=32)
    remark: str | None = None
    max_participants: int | None = Field(default=None, ge=1, le=999)
    start_time: datetime | None = None
    end_time: datetime | None = None
    signup_deadline: datetime | None = None
    location_name: str | None = Field(default=None, max_length=255)
    location_address: str | None = Field(default=None, max_length=255)
    location_latitude: float | None = None
    location_longitude: float | None = None


class ActivitySignupResponse(BaseModel):
    """Signup and checkin result payload."""

    activity_id: int
    participant_id: int
    status: str


class ActivityCheckinRequest(BaseModel):
    """Checkin payload from the client."""

    lat: float
    lng: float

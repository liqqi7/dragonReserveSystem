"""Bill schemas."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BillParticipantResponse(BaseModel):
    """Participant attached to a bill."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    nickname_snapshot: str


class BillResponse(BaseModel):
    """Bill payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int | None
    item: str
    note: str
    total_amount: float
    payer_user_id: int
    payer_name_snapshot: str
    per_share: float
    date: date
    created_at: datetime
    updated_at: datetime
    participants: list[BillParticipantResponse]


class BillCreateRequest(BaseModel):
    """Create bill payload."""

    activity_id: int | None = None
    item: str = Field(min_length=1, max_length=128)
    note: str = ""
    total_amount: float = Field(gt=0)
    payer_user_id: int
    participant_user_ids: list[int] = Field(min_length=1)
    date: date

    @field_validator("participant_user_ids")
    @classmethod
    def validate_participants(cls, value: list[int]) -> list[int]:
        deduped = list(dict.fromkeys(value))
        if not deduped:
            raise ValueError("participant_user_ids must not be empty")
        return deduped


class BillUpdateRequest(BaseModel):
    """Update bill payload."""

    activity_id: int | None = None
    item: str | None = Field(default=None, min_length=1, max_length=128)
    note: str | None = None
    total_amount: float | None = Field(default=None, gt=0)
    payer_user_id: int | None = None
    participant_user_ids: list[int] | None = None
    date: date | None = None

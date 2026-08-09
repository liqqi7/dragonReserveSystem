from __future__ import annotations

"""Statistics schemas."""

from pydantic import BaseModel


class PigeonStatResponse(BaseModel):
    """Signup/checkin summary for one user."""

    user_id: int
    nickname: str
    signup_count: int
    checkin_count: int
    pigeon_count: int
    pigeon_rate: float

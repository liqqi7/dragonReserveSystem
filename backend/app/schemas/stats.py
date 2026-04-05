from __future__ import annotations

"""Statistics schemas."""

from typing import Optional

from pydantic import BaseModel


class PigeonStatResponse(BaseModel):
    """Signup/checkin summary for one user."""

    user_id: int
    nickname: str
    signup_count: int
    checkin_count: int
    pigeon_count: int
    pigeon_rate: float


class ActivityBillStatResponse(BaseModel):
    """Aggregated bill stats for one activity."""

    activity_id: Optional[int]
    activity_name: str
    total_amount: float
    participant_count: int
    avg_amount: float

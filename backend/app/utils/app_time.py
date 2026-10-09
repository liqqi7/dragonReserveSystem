"""Timezone normalization for application datetimes stored as Shanghai-naive values."""

from datetime import datetime
from zoneinfo import ZoneInfo

APP_TIME_ZONE = ZoneInfo("Asia/Shanghai")


def to_app_naive(value: datetime | None) -> datetime | None:
    """Convert aware datetimes to Shanghai local time and remove tzinfo.

    Naive values already represent application-local time and are returned unchanged.
    """
    if value is None or value.utcoffset() is None:
        return value
    return value.astimezone(APP_TIME_ZONE).replace(tzinfo=None)

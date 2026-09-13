"""Common response schemas."""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard API error payload."""

    code: str
    message: str
    request_id: str | None = None
    details: dict | None = None

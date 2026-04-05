"""Schemas for client diagnostic log ingestion."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ClientDiagnosticLogRequest(BaseModel):
    """Single client diagnostic log event."""

    event: str = Field(min_length=1, max_length=100)
    trace_id: str = Field(default="", alias="traceId", max_length=100)
    session_id: str = Field(default="", alias="sessionId", max_length=100)
    page: str = Field(default="", max_length=200)
    level: str = Field(default="info", max_length=20)
    client_version: str = Field(default="", alias="clientVersion", max_length=50)
    base_lib_version: str = Field(default="", alias="baseLibVersion", max_length=50)
    system_type: str = Field(default="", alias="systemType", max_length=50)
    payload: dict[str, Any] = Field(default_factory=dict)

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }


class ClientDiagnosticLogResponse(BaseModel):
    """Ack for a stored diagnostic log."""

    status: str = "ok"
    stored: bool = True


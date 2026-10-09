"""Endpoints for ingesting client-side diagnostic logs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException

from app.api.deps import get_current_user, require_admin
from app.models import User
from app.schemas.diagnostic import (
    ClientDiagnosticLogBatchRequest,
    ClientDiagnosticLogRequest,
    ClientDiagnosticLogResponse,
)
from app.services.diagnostic_service import append_client_diagnostic_log, read_recent_client_diagnostic_logs


router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


def _build_record(event: ClientDiagnosticLogRequest, user: User | None = None) -> dict:
    return {
        **event.model_dump(),
        "user_id": user.id if user is not None else None,
        "user_role": user.role if user is not None else "anonymous",
    }


@router.post("/client-logs/batch", response_model=ClientDiagnosticLogResponse, summary="Ingest a batch of client diagnostic logs")
def post_client_diagnostic_log_batch(
    payload: ClientDiagnosticLogBatchRequest,
    current_user: User = Depends(get_current_user),
) -> ClientDiagnosticLogResponse:
    """Persist a bounded batch without making one request per event."""

    for event in payload.events:
        append_client_diagnostic_log(_build_record(event, current_user))
    return ClientDiagnosticLogResponse(stored=bool(payload.events))


@router.get("/client-logs", summary="List recent client diagnostic logs")
def get_client_diagnostic_logs(
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_admin),
) -> list[dict]:
    """Return recent client diagnostic events for debugging."""

    return read_recent_client_diagnostic_logs(limit=limit)


@router.post("/anonymous-client-logs/batch", response_model=ClientDiagnosticLogResponse)
def post_anonymous_diagnostics(payload: ClientDiagnosticLogBatchRequest):
    """Limited unauthenticated home diagnostics. Never attributed to an account."""
    if len(payload.events) > 8 or any(event.event not in {
        "home_presentation_snapshot", "home_media_attempt"
    } for event in payload.events):
        raise HTTPException(status_code=422, detail="Unsupported anonymous diagnostic batch")
    for event in payload.events:
        append_client_diagnostic_log(_build_record(event))
    return ClientDiagnosticLogResponse(stored=bool(payload.events))

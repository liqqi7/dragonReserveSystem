"""Endpoints for ingesting client-side diagnostic logs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user, require_admin
from app.models import User
from app.schemas.diagnostic import ClientDiagnosticLogRequest, ClientDiagnosticLogResponse
from app.services.diagnostic_service import append_client_diagnostic_log, read_recent_client_diagnostic_logs


router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.post("/client-logs", response_model=ClientDiagnosticLogResponse, summary="Ingest client diagnostic log")
def post_client_diagnostic_log(
    payload: ClientDiagnosticLogRequest,
    current_user: User = Depends(get_current_user),
) -> ClientDiagnosticLogResponse:
    """Persist a client diagnostic event for later investigation."""

    append_client_diagnostic_log(
        {
            "user_id": current_user.id,
            "user_role": current_user.role,
            "event": payload.event,
            "trace_id": payload.trace_id,
            "session_id": payload.session_id,
            "page": payload.page,
            "level": payload.level,
            "client_version": payload.client_version,
            "base_lib_version": payload.base_lib_version,
            "system_type": payload.system_type,
            "payload": payload.payload,
        }
    )
    return ClientDiagnosticLogResponse()


@router.get("/client-logs", summary="List recent client diagnostic logs")
def get_client_diagnostic_logs(
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_admin),
) -> list[dict]:
    """Return recent client diagnostic events for debugging."""

    return read_recent_client_diagnostic_logs(limit=limit)


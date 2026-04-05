"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check")
def health_check() -> dict[str, str]:
    """Basic readiness endpoint for local deployment and monitoring."""

    return {"status": "ok"}

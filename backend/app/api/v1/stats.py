"""Statistics routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.stats import HistorySummaryResponse, PigeonStatResponse
from app.services.stats_service import get_ended_activity_count, get_pigeon_stats


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/history-summary", response_model=HistorySummaryResponse, summary="Get history summary")
def get_history_summary(
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_current_user),
) -> HistorySummaryResponse:
    """Return lightweight history-page counts without serializing all activities."""

    return HistorySummaryResponse(ended_activity_count=get_ended_activity_count(db))


@router.get("/history", response_model=list[PigeonStatResponse], summary="Get pigeon ranking")
def get_history_stats(
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_current_user),
) -> list[PigeonStatResponse]:
    """Return signup/checkin ranking stats."""

    return get_pigeon_stats(db)

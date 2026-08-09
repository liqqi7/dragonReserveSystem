"""Statistics routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.stats import PigeonStatResponse
from app.services.stats_service import get_pigeon_stats


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/history", response_model=list[PigeonStatResponse], summary="Get pigeon ranking")
def get_history_stats(
    db: Session = Depends(get_db),
    _: User | None = Depends(get_optional_current_user),
) -> list[PigeonStatResponse]:
    """Return signup/checkin ranking stats."""

    return get_pigeon_stats(db)

"""Inbound offline mutation replay for the authenticated mini-program account."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.boardgame_deps import enabled, body_limit, write_db
from app.api.deps import get_current_user
from app.models import User
from app.schemas.boardgame_sync import SyncBatch
from app.services.boardgame_sync import apply_batch

router = APIRouter(tags=['boardgame-sync'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.post('/boardgame-sync')
def sync(payload: SyncBatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return apply_batch(db, actor, payload)

"""Recorded plays: list, create, edit and soft delete."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.boardgame_deps import body_limit, enabled, write_db
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.models.boardgame import Play
from app.schemas.boardgame_plays import PlayCreate, PlayUpdate
from app.services import boardgame_plays as plays
from app.services.boardgame_common import fail, get, member

router = APIRouter(tags=['boardgame-library'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.get('/boardgame-plays')
def list_plays(game_id: int, scope: str = Query('all', pattern='^(all|mine|won)$'),
               limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
               db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    return plays.list_plays(db, actor, game_id, scope, limit, cursor)


@router.post('/boardgame-plays', status_code=201)
def create_play(payload: PlayCreate, db: Session = Depends(write_db),
                actor: User = Depends(get_current_user)):
    play = plays.create_play(db, actor, payload)
    return plays.play_detail(db, play, actor)


@router.get('/boardgame-plays/{play_id}')
def get_play(play_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    play = get(db, Play, play_id)
    if play.archived_at:
        fail('not_found', 404)
    return plays.play_detail(db, play, actor)


@router.patch('/boardgame-plays/{play_id}')
def update_play(play_id: int, payload: PlayUpdate, db: Session = Depends(write_db),
                actor: User = Depends(get_current_user)):
    play = get(db, Play, play_id, True)
    plays.update_play(db, play, actor, payload)
    return plays.play_detail(db, play, actor)


@router.delete('/boardgame-plays/{play_id}')
def delete_play(play_id: int, db: Session = Depends(write_db),
                actor: User = Depends(get_current_user)):
    play = get(db, Play, play_id, True)
    plays.delete_play(db, play, actor)
    return {'id': play.id, 'archived_at': play.archived_at}

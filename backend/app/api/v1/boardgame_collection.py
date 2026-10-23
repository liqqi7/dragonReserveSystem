"""Authenticated personal collection APIs; every filter and annotation is actor scoped."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.boardgame_deps import body_limit, enabled, write_db
from app.api.deps import get_current_user
from app.api.v1.boardgames import created
from app.core.database import get_db
from app.models import User
from app.models.boardgame import GameTag, SavedFilter
from app.schemas import boardgame_collection as s
from app.schemas.boardgame import Revision
from app.services import boardgame_collection as c
from app.services.boardgame_common import audit, check_revision, columns, member, page

router = APIRouter(tags=['boardgame-collection'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.get('/boardgames/{game_id}/my-preference')
def preference(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.preference(db, actor, game_id)


@router.put('/boardgames/{game_id}/my-preference')
def save_preference(game_id: int, payload: s.PreferencePut, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    c.put_preference(db, actor, game_id, payload)
    return c.preference(db, actor, game_id)


@router.get('/boardgames/{game_id}/my-prior-plays')
def prior(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.prior(db, actor, game_id)


@router.put('/boardgames/{game_id}/my-prior-plays')
def save_prior(game_id: int, payload: s.PriorPut, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    c.put_prior(db, actor, game_id, payload)
    return c.prior(db, actor, game_id)


@router.get('/boardgame-collection/overview')
def collection(db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.collection_summary(db, actor)


@router.get('/boardgame-tags')
def tags(include_archived: bool = False, limit: int = Query(100, ge=1, le=100), cursor: str | None = None,
         db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    stmt = select(GameTag).where(GameTag.user_id == actor.id)
    if not include_archived:
        stmt = stmt.where(GameTag.is_active.is_(True))
    return page(db, stmt, GameTag.id, columns, limit, cursor, {'actor': actor.id, 'archived': include_archived})


@router.post('/boardgame-tags', status_code=201)
def create_tag(payload: s.TagCreate, request: Request, response: Response,
               db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'tag:create', lambda: c.create_tag(db, actor, payload).id,
                   GameTag, columns)[0]


@router.patch('/boardgame-tags/{tag_id}')
def patch_tag(tag_id: int, payload: s.TagPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return columns(c.patch_tag(db, actor, tag_id, payload))


@router.get('/boardgame-tags/{kind}/{identity}')
def links(kind: Literal['games', 'plays'], identity: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.tag_links(db, actor, kind, identity)


@router.put('/boardgame-tags/{kind}/{identity}')
def set_links(kind: Literal['games', 'plays'], identity: int, payload: s.TagLinks,
              db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return c.set_tags(db, actor, kind, identity, payload)


@router.get('/boardgame-saved-filters')
def filters(target: Literal['games', 'plays', 'statistics'] | None = None, limit: int = Query(100, ge=1, le=100),
            cursor: str | None = None, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    stmt = select(SavedFilter).where(SavedFilter.user_id == actor.id)
    if target:
        stmt = stmt.where(SavedFilter.target == target)
    return page(db, stmt, SavedFilter.id, columns, limit, cursor, {'actor': actor.id, 'target': target})


@router.post('/boardgame-saved-filters', status_code=201)
def create_filter(payload: s.SavedFilterCreate, request: Request, response: Response,
                  db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'filter:create', lambda: c.create_saved_filter(db, actor, payload).id,
                   SavedFilter, columns)[0]


@router.patch('/boardgame-saved-filters/{filter_id}')
def patch_filter(filter_id: int, payload: s.SavedFilterPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return columns(c.patch_saved_filter(db, actor, filter_id, payload))


@router.delete('/boardgame-saved-filters/{filter_id}', status_code=204)
def delete_filter(filter_id: int, payload: Revision, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    member(actor)
    obj = c.saved_filter(db, actor, filter_id)
    check_revision(obj, payload.expected_revision)
    audit(db, obj, actor, 'delete_filter', before=columns(obj))
    db.delete(obj)


@router.get('/boardgame-collection/costs')
def costs(request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_costs import parse_query, cost_stats
    return cost_stats(db, actor, parse_query(request))

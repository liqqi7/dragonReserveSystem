"""Dedicated name → BGG results → edition → confirmation endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.boardgame_deps import body_limit, enabled, write_db
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.boardgame import Revision
from app.schemas.boardgame_intake import IntakeConfirm, PreviewCreate
from app.services import boardgame_intake as intake, boardgame_import as imports
from app.services.boardgame_common import create_once
from app.services.boardgame_labels import version_view

router = APIRouter(tags=['boardgame-intake'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.post('/boardgame-intake-previews', status_code=202)
def prepare(payload: PreviewCreate, request: Request, response: Response,
            db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    ids, replayed = create_once(db, actor, 'intake:preview', request.headers.get('Idempotency-Key'),
        payload.model_dump(), lambda: intake.new_preview(db, actor, payload.bgg_ids).id, 'import_job')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return intake.preview_detail(db, intake.private_preview(db, ids[0], actor), actor)


@router.get('/boardgame-intake-previews/{preview_id}')
def preview(preview_id: UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return intake.preview_detail(db, intake.private_preview(db, preview_id, actor), actor)


@router.get('/boardgame-intake-previews/{preview_id}/items/{item_id}')
def details(preview_id: UUID, item_id: int, q: str = Query('', max_length=255),
            offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
            db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = intake.private_preview(db, preview_id, actor)
    item = imports.private_item(db, job, item_id)
    game = intake.candidate(db, item, actor, detail=True)
    search = q.strip().casefold()
    editions = [version_view(v) for v, _ in intake.versions(item).values()]
    editions = [v for v in editions if not search or search in ' '.join(
        [v['name'] or '', v['display_name'], v['language_label'], str(v['year_published'] or ''),
         *v['languages'], *v['publishers']]).casefold()]
    return dict(game=game, versions=editions[offset:offset+limit], total=len(editions),
                next_offset=offset+limit if offset+limit < len(editions) else None)


@router.post('/boardgame-intake-previews/{preview_id}/retry')
def retry(preview_id: UUID, payload: Revision, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = intake.private_preview(db, preview_id, actor, True)
    intake.retry_preview(db, job, actor, payload.expected_revision)
    return intake.preview_detail(db, job, actor)


@router.post('/boardgame-intakes', status_code=201)
def confirm(payload: IntakeConfirm, request: Request, response: Response,
            db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    ids, replayed = create_once(db, actor, 'intake:confirm', request.headers.get('Idempotency-Key'),
        payload.model_dump(mode='json'), lambda: intake.confirm(db, actor, payload), 'game_inventory')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return intake.result(db, ids, actor)

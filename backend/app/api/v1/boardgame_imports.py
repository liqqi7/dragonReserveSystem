"""Private self-service imports; review and worker application are separate steps."""

from typing import Literal
from uuid import UUID, uuid4
import hashlib
import time

import httpx
from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled, body_limit, write_db
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User
from app.models.boardgame import ImportJob, ImportItem, BoardGame, Play, PlaySource, ImportMapping, AuditEvent
from app.schemas import boardgame_import as s
from app.schemas.boardgame import Revision
from app.services import boardgame_import_review as review
from app.services import boardgame_import as i, boardgame_sources as sources, boardgame_play as plays
from app.services.boardgame_common import admin, audit, check_revision, create_once, fail, get, member, now, page, columns, get

router = APIRouter(tags=['boardgame-imports'], dependencies=[Depends(enabled), Depends(body_limit)])
_search_cache = {}


@router.post('/boardgame-imports', status_code=202)
def create_import(payload: s.ImportCreate, request: Request, response: Response, db: Session = Depends(write_db),
                  actor: User = Depends(get_current_user)):
    params = payload.model_dump(mode='json', by_alias=True, exclude={'kind'}, exclude_none=True)
    ids, replayed = create_once(db, actor, 'import:create', request.headers.get('Idempotency-Key'),
        payload.model_dump(mode='json'), lambda: i.new_job(db, actor, payload.kind, params).id, 'import_job')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return i.job_detail(i.private_job(db, ids[0], actor))


@router.post('/boardgame-imports/bgstats-file', status_code=202)
async def upload_bgstats(request: Request, response: Response, file: UploadFile = File(),
                        source_dataset: UUID | None = Form(None), source_timezone: str = Form('Asia/Shanghai'),
                        owner_user_id: int | None = Form(None), db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    i.enabled('bgstats_file')
    if not (file.filename or '').lower().endswith(('.json', '.bgsplay')):
        fail('unsupported_export_extension')
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    try:
        ZoneInfo(source_timezone)
    except (ZoneInfoNotFoundError, ValueError):
        fail('invalid_source_timezone')
    raw = await file.read(sources.MAX_BYTES + 1)
    data = sources.bounded_json(raw)
    if not isinstance(data, dict) or 'games' not in data or 'plays' not in data:
        fail('unsupported_bgstats_format')
    sha = hashlib.sha256(raw).hexdigest()
    params = dict(file_sha256=sha, source_dataset=str(source_dataset) if source_dataset else None,
                  source_timezone=source_timezone, owner_user_id=owner_user_id)
    def make():
        job = i.new_job(db, actor, 'bgstats_file', params)
        i.save_original(raw)
        return job.id
    ids, replayed = create_once(db, actor, 'import:bgstats', request.headers.get('Idempotency-Key'), params, make, 'import_job')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return i.job_detail(i.private_job(db, ids[0], actor))


@router.get('/boardgame-imports')
def jobs(limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
         db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    return page(db, select(ImportJob).where(ImportJob.requested_by == actor.id,
                func.coalesce(ImportJob.params['purpose'].as_string(), '') != 'intake_preview'), ImportJob.id,
                i.job_detail, limit, cursor, {'actor': actor.id})


@router.get('/boardgame-imports/datasets')
def datasets(db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    namespace = ImportJob.params['source_dataset'].as_string()
    owner = ImportJob.params['owner_user_id'].as_integer()
    rows = db.execute(select(namespace.label('id'), owner.label('owner_user_id')).where(
        ImportJob.requested_by == actor.id, ImportJob.kind == 'bgstats_file').distinct().order_by(namespace)).mappings()
    return {'items': [dict(row) for row in rows]}


@router.get('/boardgame-imports/capabilities')
def capabilities(actor: User = Depends(get_current_user)):
    member(actor)
    settings = get_settings()
    return {'checked_on': '2026-09-13', 'items': [
        {'provider': 'bgstats', 'available': settings.boardgame_import_worker_enabled,
         'transport': 'file', 'label': 'BG Stats JSON / bgsplay', 'reason': None},
        {'provider': 'bgg', 'available': settings.boardgame_import_worker_enabled and settings.bgg_enabled and bool(settings.bgg_api_token),
         'transport': 'api', 'label': 'BGG 游戏、收藏、对局', 'reason': '需要管理员配置 BGG 凭据并启用任务处理'},
        {'provider': 'bga', 'available': False, 'transport': None, 'label': 'Board Game Arena',
         'reason': '尚未核实可供本项目调用的官方第三方历史接口，未连接账号',
         'references': ['https://en.doc.boardgamearena.com/Development', 'https://www.bgstatsapp.com/explanations/importing-from-yucata-and-board-game-arena/']},
        {'provider': 'yucata', 'available': False, 'transport': None, 'label': 'Yucata',
         'reason': '尚未核实官方第三方历史接口与授权方式，未连接账号',
         'references': ['https://www.bgstatsapp.com/explanations/importing-from-yucata-and-board-game-arena/']}
    ]}


@router.get('/boardgame-imports/{job_id}')
def job(job_id: UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return i.job_detail(i.private_job(db, str(job_id), actor))


@router.get('/boardgame-imports/{job_id}/source')
def job_source(job_id: UUID, limit: int = Query(1, ge=1, le=1), cursor: str | None = None,
               db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor)
    if job.kind == 'bgstats_file':
        path = i.private_root() / (job.params['file_sha256'] + '.json')
        if not path.is_file():
            fail('source_file_missing', 404)
        return FileResponse(path, media_type='application/json', filename='BGStatsExport.json',
                            headers={'Cache-Control': 'private, no-store'})
    return page(db, select(ImportItem).where(ImportItem.job_id == job.id, ImportItem.source_kind == 'archive'),
        ImportItem.id, lambda item: {'id': item.id, 'source_key': item.source_key, 'raw_xml': item.raw_xml,
                                   'payload': item.payload}, limit, cursor, {'job': job.id, 'source': True})


@router.get('/boardgame-imports/{job_id}/items')
def items(job_id: UUID, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
          include_archive: bool = False, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor)
    stmt = select(ImportItem).where(ImportItem.job_id == job.id)
    if not include_archive:
        stmt = stmt.where(ImportItem.source_kind != 'archive')
    return page(db, stmt, ImportItem.id, lambda item: i.item_detail(db, item, actor), limit, cursor,
                dict(job=job.id, include_archive=include_archive, actor=actor.id))


@router.patch('/boardgame-imports/{job_id}/items/{item_id}')
def decide(job_id: UUID, item_id: int, payload: s.ItemPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    item = i.private_item(db, job, item_id, True)
    return i.item_detail(db, i.decide_item(db, job, item, actor, payload), actor)


@router.put('/boardgame-imports/{job_id}/mappings')
def mappings(job_id: UUID, payload: s.MappingsPut, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    i.apply_mappings(db, job, actor, payload)
    return i.job_detail(job)


@router.post('/boardgame-imports/{job_id}/apply', status_code=202)
def apply(job_id: UUID, payload: s.Apply, request: Request, response: Response,
          db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    if job.params.get('purpose') == 'intake_preview':
        fail('use_intake_confirmation', 409)
    def schedule():
        i.schedule_apply(db, job, actor, payload)
        return job.id
    ids, replayed = create_once(db, actor, f'import:apply:{job.id}', request.headers.get('Idempotency-Key'),
        payload.model_dump(mode='json'), schedule, 'import_job')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return i.job_detail(i.private_job(db, ids[0], actor))


@router.post('/boardgame-imports/{job_id}/retry', status_code=202)
def retry(job_id: UUID, payload: s.Retry, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    i.enabled(job.kind)
    check_revision(job, payload.expected_revision)
    if job.state not in ('partial', 'failed'):
        fail('job_not_retryable', 409)
    if payload.item_ids:
        selection = []
        for identity in payload.item_ids:
            item = i.private_item(db, job, identity, True)
            if item.state != 'failed' or not item.decision:
                fail('item_not_retryable', 409)
            item.state, item.error_code = 'ready', None
            item.revision += 1
            item.updated_at = now()
            selection.append({'id': item.id, 'expected_revision': item.revision})
        job.params = {**job.params, 'apply_selection': selection}
        job.state = 'applying'
    else:
        job.state = 'queued'
        job.attempt_count = 0
        job.params = {**job.params, 'fetch_started_at': now().isoformat()}
    job.lease_owner = job.lease_expires_at = job.next_attempt_at = None
    job.error_code = job.error_message = None
    job.revision += 1
    job.updated_at = now()
    return i.job_detail(job)


@router.patch('/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}')
def correct_held(job_id: UUID, item_id: int, play_id: int, payload: s.HeldPatch,
                 db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    if job.state in ('applying', 'fetching', 'parsing'):
        fail('job_busy', 409)
    item = i.private_item(db, job, item_id, True)
    check_revision(item, payload.expected_revision)
    source = i.source_for_item(db, item, play_id)
    obj = get(db, Play, play_id, True)
    if not source or obj.publication_status != 'held' or obj.created_by != actor.id:
        fail('not_found', 404)
    plays.save_play(db, actor, payload.play, obj, internal=True)
    item.revision += 1
    item.updated_at = now()
    audit(db, item, actor, 'correct_held', reason=payload.play.reason)
    return i.item_detail(db, item, actor)


@router.post('/boardgames/{game_id}/bgg-refresh', status_code=202)
def refresh(game_id: int, payload: Revision, request: Request, response: Response,
            db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    g = get(db, BoardGame, game_id, True)
    check_revision(g, payload.expected_revision)
    if not g.bgg_id:
        fail('bgg_binding_required')
    ids, replayed = create_once(db, actor, f'bgg:refresh:{game_id}', request.headers.get('Idempotency-Key'), payload.model_dump(),
        lambda: i.new_job(db, actor, 'bgg_thing', {'ids': [g.bgg_id]}).id, 'import_job')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return i.job_detail(i.private_job(db, ids[0], actor))


@router.get('/bgg/search')
def search(q: str = Query(min_length=1, max_length=255), offset: int = Query(0, ge=0),
           limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    q = q.strip()
    if not q:
        fail('search_name_required')
    settings = get_settings()
    if not settings.bgg_enabled or not settings.bgg_api_token:
        fail('source_disabled', 503)
    cached = _search_cache.get(q.casefold())
    if cached and time.monotonic() - cached[0] < 300:
        return search_page(cached[1], offset, limit)
    from app.services.boardgame_worker import bgg_lock
    engine = db.bind
    db.rollback()  # No business transaction spans the external request.
    try:
        with bgg_lock(engine) as acquired:
            if not acquired:
                fail('bgg_busy', 503, retry_after_seconds=settings.bgg_min_interval_seconds)
            with httpx.Client(timeout=settings.bgg_timeout_seconds, follow_redirects=False) as client:
                with client.stream('GET', settings.bgg_api_base_url.rstrip('/') + '/search',
                    params={'query': q, 'type': 'boardgame,boardgameexpansion'},
                    headers={'Authorization': f'Bearer {settings.bgg_api_token}'}) as response:
                    if response.status_code != 200:
                        fail('upstream_unavailable', 503)
                    raw = bytearray()
                    for chunk in response.iter_bytes():
                        raw.extend(chunk)
                        if len(raw) > sources.MAX_BYTES:
                            fail('source_response_too_large')
            root = sources.xml_root(bytes(raw))
    except httpx.HTTPError:
        fail('upstream_unavailable', 503)
    result = {'items': [dict(bgg_id=sources.positive(n.get('id')), game_type=n.get('type'),
        name=n.find('name').get('value') if n.find('name') is not None else None,
        year_published=sources.positive(n.find('yearpublished').get('value')) if n.find('yearpublished') is not None else None)
        for n in root.findall('item')], 'cached_at': now().isoformat()}
    if len(_search_cache) >= 256:
        _search_cache.pop(next(iter(_search_cache)))
    _search_cache[q.casefold()] = (time.monotonic(), result)
    return search_page(result, offset, limit)


def search_page(result, offset, limit):
    # Stable cached order; no guessed BGG detail fields in the search response.
    items = list({r['bgg_id']: r for r in result['items'] if r['bgg_id'] and r['name']}.values())
    return dict(items=items[offset:offset+limit], total=len(items), cached_at=result['cached_at'],
                next_offset=offset+limit if offset+limit < len(items) else None)


@router.get('/boardgame-imports/{job_id}/mappings')
def get_mappings(job_id: UUID, limit: int = Query(50, ge=1, le=100), cursor: str | None = None,
                 db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor)
    return page(db, review.mapping_stmt(job), ImportMapping.id, lambda row: review.mapping_detail(db, row, actor),
                limit, cursor, {'job': job.id, 'actor': actor.id, 'kind':'mappings'})


@router.get('/boardgame-imports/{job_id}/mappings/{mapping_id}/history')
def mapping_history(job_id: UUID, mapping_id: int, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                    db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor)
    row = db.scalar(review.mapping_stmt(job).where(ImportMapping.id == mapping_id))
    if not row:
        fail('not_found', 404)
    return page(db, select(AuditEvent).where(AuditEvent.entity_type == 'import_mappings',
                AuditEvent.entity_id == str(row.id)), AuditEvent.id, columns, limit, cursor,
                {'job': job.id, 'mapping': row.id, 'actor': actor.id})


@router.get('/boardgame-imports/{job_id}/items/{item_id}/preview')
def item_preview(job_id: UUID, item_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor)
    return review.preview(db, job, i.private_item(db, job, item_id), actor)


@router.get('/boardgame-imports/{job_id}/report')
def import_report(job_id: UUID, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return review.report(db, i.private_job(db, str(job_id), actor))


@router.post('/boardgame-imports/{job_id}/publish')
def publish_history(job_id: UUID, payload: s.Publish, request: Request, response: Response,
                    db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    job = i.private_job(db, str(job_id), actor, True)
    ids, replayed = create_once(db, actor, f'import:publish:{job.id}', request.headers.get('Idempotency-Key'),
        payload.model_dump(mode='json'), lambda: review.publish(db, job, actor, payload), 'play')
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return {'job': i.job_detail(job), 'play_ids': ids, 'publication_status':'published'}


def held_play(db, actor, job_id, item_id, play_id, lock=False):
    job = i.private_job(db, str(job_id), actor, lock)
    item = i.private_item(db, job, item_id, lock)
    obj = get(db, Play, play_id, lock)
    source = i.source_for_item(db, item, obj.id)
    if not source or obj.created_by != actor.id or obj.publication_status != 'held':
        fail('not_found', 404)
    return job, item, obj


@router.get('/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}')
def read_held(job_id: UUID, item_id: int, play_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    job, item, obj = held_play(db, actor, job_id, item_id, play_id)
    return {'play': plays.detail(db, obj, actor, internal=True), 'item_revision': item.revision}


@router.get('/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}/scoresheet')
def read_held_sheet(job_id: UUID, item_id: int, play_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.models.boardgame import PlayScoresheet
    from app.services import boardgame_scoresheet as sheets
    job, item, obj = held_play(db, actor, job_id, item_id, play_id)
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
    if not sheet:
        fail('not_found', 404)
    return sheets.detail(db, obj, sheet)

"""Durable leased worker. Each apply item commits independently and can resume."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import threading
import time
from uuid import uuid4

import httpx
from pydantic import ValidationError
from sqlalchemy import case, func, or_, select, text
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models import User
from app.models.boardgame import ImportJob, ImportItem
from app.services import boardgame_import as imports, boardgame_sources as sources
from app.services.boardgame_common import check_revision, fail, now

LEASE_SECONDS = 90
_sqlite_fetch_lock = threading.Lock()


@contextmanager
def bgg_lock(engine):
    """MySQL advisory lock spans network IO without holding a business transaction."""
    if engine.dialect.name == 'mysql':
        with engine.connect() as connection:
            acquired = connection.execute(text("SELECT GET_LOCK('dragon_boardgame_bgg_fetch', 0)")).scalar() == 1
            connection.commit()
            try:
                yield acquired
            finally:
                if acquired:
                    time.sleep(max(0, get_settings().bgg_min_interval_seconds))
                    connection.execute(text("SELECT RELEASE_LOCK('dragon_boardgame_bgg_fetch')"))
                    connection.commit()
    else:
        acquired = _sqlite_fetch_lock.acquire(blocking=False)
        try:
            yield acquired
        finally:
            if acquired:
                time.sleep(max(0, get_settings().bgg_min_interval_seconds))
                _sqlite_fetch_lock.release()


def retry_after(value):
    if not value:
        return 0
    try:
        return max(0, int(value))
    except ValueError:
        try:
            return max(0, int((parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()))
        except (TypeError, ValueError):
            return 0


def fenced(db, job_id, owner):
    job = db.scalar(select(ImportJob).where(ImportJob.id == job_id).with_for_update())
    if not job or job.lease_owner != owner or job.lease_expires_at is None or job.lease_expires_at <= now():
        return None
    return job


def progress(db, job):
    counts = dict(db.execute(select(ImportItem.state, func.count()).where(ImportItem.job_id == job.id,
                       ImportItem.source_kind != 'archive').group_by(ImportItem.state)).all())
    totals = {'source_count': sum(counts.values()), 'item_states': counts, 'created_play_count': 0,
              'linked_play_count': 0, 'held_count': 0, 'created_inventory_count': 0}
    length = func.json_array_length if db.bind.dialect.name == 'sqlite' else func.json_length
    play_count = func.coalesce(length(func.json_extract(ImportItem.payload, '$.applied_result.play_ids')), 0)
    box_count = func.coalesce(length(func.json_extract(ImportItem.payload, '$.applied_result.inventory_ids')), 0)
    fresh = ~func.coalesce(ImportItem.payload['applied_result']['reused'].as_boolean(), False) & ~func.coalesce(
        ImportItem.payload['applied_result']['updated'].as_boolean(), False)
    created, linked, boxes = db.execute(select(
        func.coalesce(func.sum(case((ImportItem.state == 'applied', play_count), else_=0)), 0),
        func.coalesce(func.sum(case((ImportItem.state == 'linked', play_count), else_=0)), 0),
        func.coalesce(func.sum(case((ImportItem.state == 'applied', box_count), else_=0)), 0)).where(
            ImportItem.job_id == job.id, ImportItem.state.in_(['applied', 'linked']), fresh)).one()
    totals.update(created_play_count=int(created), linked_play_count=int(linked), held_count=int(created), created_inventory_count=int(boxes))
    job.progress = totals


def finish_fetch(db, job, owner, parsed, next_params=None):
    imports.persist_items(db, job, parsed)
    job.updated_at, job.revision = now(), job.revision + 1
    job.lease_owner = job.lease_expires_at = None
    if next_params:
        job.params = {**job.params, **next_params}
        job.state, job.attempt_count = 'queued', 0
        job.next_attempt_at = now() + timedelta(seconds=get_settings().bgg_min_interval_seconds)
    else:
        job.state, job.next_attempt_at = 'ready', None
    progress(db, job)


def retry(db, job, code, delay=0):
    settings = get_settings()
    started = datetime.fromisoformat(job.params['fetch_started_at']) if job.params.get('fetch_started_at') else job.created_at
    elapsed = (now() - started).total_seconds()
    delay = max(delay, min(120, 2 ** job.attempt_count))
    if job.attempt_count >= settings.bgg_max_attempts or elapsed + delay > settings.bgg_job_max_wait_seconds:
        job.state, job.next_attempt_at = 'failed', None
    else:
        job.state, job.next_attempt_at = 'retry_wait', now() + timedelta(seconds=delay)
    job.error_code, job.error_message = code, 'Source request could not be completed; retry from the import task.'
    job.lease_owner = job.lease_expires_at = None
    job.updated_at, job.revision = now(), job.revision + 1


def fetch_http(kind, params, transport=None):
    settings = get_settings()
    endpoint = {'bgg_thing': 'thing', 'bgg_collection': 'collection', 'bgg_plays': 'plays'}[kind]
    query = {'id': ','.join(map(str, params['ids'])), 'stats': 1, 'versions': 1} if kind == 'bgg_thing' else {
        'username': params['username']}
    if kind == 'bgg_collection':
        query.update(own=1, stats=1, version=1, subtype=params.get('subtype', 'boardgame'))
        if query['subtype'] == 'boardgame':
            query['excludesubtype'] = 'boardgameexpansion'
    if kind == 'bgg_plays':
        query['page'] = params.get('page', 1)
        if params.get('from'):
            query['mindate'], query['maxdate'] = params['from'], params['to']
    headers = {'Authorization': f'Bearer {settings.bgg_api_token}', 'Accept': 'application/xml'}
    with httpx.Client(transport=transport, timeout=settings.bgg_timeout_seconds, follow_redirects=False) as client:
        with client.stream('GET', settings.bgg_api_base_url.rstrip('/') + '/' + endpoint, params=query, headers=headers) as response:
            status = response.status_code
            delay = retry_after(response.headers.get('Retry-After'))
            if status != 200:
                return status, b'', delay
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > sources.MAX_BYTES:
                    fail('source_response_too_large')
            return status, bytes(body), delay


def apply_selection(factory, job_id, owner):
    with factory() as db:
        job = fenced(db, job_id, owner)
        if not job:
            return
        selection = job.params.get('apply_selection', [])
        actor_id = job.requested_by
    for entry in selection:
        with factory() as db:
            # Match HTTP mutations' actor -> job lock order.
            actor = db.scalar(select(User).where(User.id == actor_id).with_for_update())
            job = fenced(db, job_id, owner)
            if not job:
                return
            if actor is None or actor.role not in ('user', 'admin'):
                job.state, job.error_code = 'partial', 'role_required'
                job.lease_owner = job.lease_expires_at = None
                db.commit()
                return
            item = imports.private_item(db, job, entry['id'], True)
            if item.state in ('applied', 'linked', 'skipped'):
                continue
            try:
                # A savepoint lets one reviewed source fail without committing a
                # partial play, mapping, inventory box or score projection.
                with db.begin_nested():
                    check_revision(item, entry['expected_revision'])
                    imports.apply_item(db, job, item, actor)
            except (AppError, ValidationError, IntegrityError) as exc:
                db.refresh(item)
                item.state = 'failed'
                item.error_code = (exc.details or {}).get('reason', exc.code) if isinstance(exc, AppError) else 'invalid_source_or_conflict'
                item.updated_at, item.revision = now(), item.revision + 1
            job.lease_expires_at = now() + timedelta(seconds=LEASE_SECONDS)
            job.updated_at, job.revision = now(), job.revision + 1
            progress(db, job)
            db.commit()
    with factory() as db:
        job = fenced(db, job_id, owner)
        if job:
            progress(db, job)
            item_states = job.progress['item_states']
            job.state = 'applied' if not any(item_states.get(k) for k in ('pending', 'ready', 'needs_mapping', 'needs_review', 'failed')) else 'partial'
            job.lease_owner = job.lease_expires_at = None
            job.updated_at, job.revision = now(), job.revision + 1
            db.commit()


def run_once(factory, transport=None):
    settings = get_settings()
    if not settings.boardgame_enabled or not settings.boardgame_import_worker_enabled:
        return False
    owner = str(uuid4())
    with factory() as db:
        due = now()
        stmt = select(ImportJob).where(ImportJob.state.in_(['queued', 'fetching', 'parsing', 'retry_wait', 'applying']),
            or_(ImportJob.next_attempt_at.is_(None), ImportJob.next_attempt_at <= due),
            or_(ImportJob.lease_expires_at.is_(None), ImportJob.lease_expires_at <= due))
        if not settings.bgg_enabled or not settings.bgg_api_token:
            stmt = stmt.where(ImportJob.kind == 'bgstats_file')
        job = db.scalar(stmt.order_by(ImportJob.created_at, ImportJob.id).with_for_update(skip_locked=True).limit(1))
        if not job:
            return False
        applying = job.state == 'applying'
        job.lease_owner, job.lease_expires_at = owner, due + timedelta(seconds=LEASE_SECONDS)
        if not applying:
            job.state = 'parsing' if job.kind == 'bgstats_file' else 'fetching'
            job.attempt_count += 1
        job.revision += 1
        job_id, kind, params = job.id, job.kind, deepcopy_params(job.params)
        engine = db.bind
        db.commit()
    if applying:
        apply_selection(factory, job_id, owner)
        return True
    try:
        if kind == 'bgstats_file':
            path = imports.private_root() / (params['file_sha256'] + '.json')
            raw = path.read_bytes()
            import hashlib
            if hashlib.sha256(raw).hexdigest() != params['file_sha256']:
                fail('source_storage_integrity')
            parsed, next_params = sources.bgstats_items(raw, params), None
        else:
            with bgg_lock(engine) as locked:
                if not locked:
                    with factory() as db:
                        job = fenced(db, job_id, owner)
                        if job:
                            retry(db, job, 'bgg_busy', settings.bgg_min_interval_seconds)
                            db.commit()
                    return True
                with factory() as db:
                    job = fenced(db, job_id, owner)
                    if not job:
                        return True
                    last = db.scalar(select(func.max(ImportJob.params['last_fetch_at'].as_string())))
                    if last:
                        wait = settings.bgg_min_interval_seconds - (now() - datetime.fromisoformat(last)).total_seconds()
                        if wait > 0:
                            job.state, job.next_attempt_at = 'retry_wait', now() + timedelta(seconds=wait)
                            job.lease_owner = job.lease_expires_at = None
                            job.attempt_count -= 1
                            db.commit()
                            return True
                    job.params = {**job.params, 'last_fetch_at': now().isoformat()}
                    db.commit()
                status, raw, delay = fetch_http(kind, params, transport)
                if status != 200:
                    with factory() as db:
                        job = fenced(db, job_id, owner)
                        if job:
                            if status in (202, 429) or status >= 500:
                                retry(db, job, f'bgg_http_{status}', delay)
                            else:
                                job.state, job.error_code = 'failed', f'bgg_http_{status}'
                                job.error_message = 'BGG request rejected. Check server source configuration.'
                                job.lease_owner = job.lease_expires_at = None
                            db.commit()
                    return True
            parsed, total = sources.bgg_items(raw, kind, params)
            next_params = None
            if kind == 'bgg_collection' and params.get('subtype', 'boardgame') == 'boardgame':
                next_params = {'subtype': 'boardgameexpansion'}
            elif kind == 'bgg_plays' and params.get('page', 1) * 100 < total:
                next_params = {'page': params.get('page', 1) + 1}
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                finish_fetch(db, job, owner, parsed, next_params)
                db.commit()
    except (httpx.HTTPError, OSError) as exc:
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                retry(db, job, 'source_unavailable')
                db.commit()
    except (AppError, ValueError, TypeError, KeyError, RecursionError):
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                job.state, job.error_code, job.error_message = 'failed', 'source_parse_failed', 'Source format needs review.'
                job.lease_owner = job.lease_expires_at = None
                job.updated_at, job.revision = now(), job.revision + 1
                db.commit()
    return True


def deepcopy_params(params):
    from copy import deepcopy
    return deepcopy(params)

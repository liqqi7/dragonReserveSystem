"""Bounded BGG Thing worker; no collection, play, file or historical import jobs."""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from uuid import uuid4
import threading
import time
import httpx
from sqlalchemy import select, or_, text
from app.core.config import get_settings
from app.services.boardgame_http import client as bgg_client
from app.core.exceptions import AppError
from app.models.boardgame import PreviewJob, PreviewItem
from app.services import boardgame_preview as previews, boardgame_sources as sources
from app.services.boardgame_common import fail, now
LEASE_SECONDS = 90
_sqlite_fetch_lock = threading.Lock()
_last_bgg_request_at = None

@contextmanager
def bgg_lock(engine):
    """Serialize BGG requests and enforce spacing before, not after, each request."""
    global _last_bgg_request_at

    def wait_for_slot():
        global _last_bgg_request_at
        interval = max(0, get_settings().bgg_min_interval_seconds)
        current = time.monotonic()
        if _last_bgg_request_at is not None:
            wait = interval - (current - _last_bgg_request_at)
            if wait > 0:
                time.sleep(wait)
        _last_bgg_request_at = time.monotonic()

    if engine.dialect.name == 'mysql':
        with engine.connect() as connection:
            acquired = connection.execute(text("SELECT GET_LOCK('dragon_boardgame_bgg_fetch', 0)")).scalar() == 1
            connection.commit()
            try:
                if acquired:
                    wait_for_slot()
                yield acquired
            finally:
                if acquired:
                    connection.execute(text("SELECT RELEASE_LOCK('dragon_boardgame_bgg_fetch')"))
                    connection.commit()
    else:
        acquired = _sqlite_fetch_lock.acquire(blocking=False)
        try:
            if acquired:
                wait_for_slot()
            yield acquired
        finally:
            if acquired:
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
    job = db.scalar(select(PreviewJob).where(PreviewJob.id == job_id).with_for_update())
    if not job or job.lease_owner != owner or job.lease_expires_at is None or job.lease_expires_at <= now():
        return None
    return job

def retry(db, job, code, delay=0):
    settings = get_settings()
    started = datetime.fromisoformat(job.params['fetch_started_at']) if job.params.get('fetch_started_at') else job.created_at
    elapsed = (now() - started).total_seconds()
    delay = max(delay, min(120, 2 ** job.attempt_count))
    if job.attempt_count >= settings.bgg_max_attempts or elapsed + delay > settings.bgg_job_max_wait_seconds:
        job.state, job.next_attempt_at = 'failed', None
    else:
        job.state, job.next_attempt_at = 'retry_wait', now() + timedelta(seconds=delay)
    job.error_code, job.error_message = code, 'Source request could not be completed; retry from the search preview.'
    job.lease_owner = job.lease_expires_at = None
    job.updated_at, job.revision = now(), job.revision + 1

def fetch_http(ids, transport=None):
    settings = get_settings()
    headers = {'Authorization': f'Bearer {settings.bgg_api_token}', 'Accept':'application/xml'}
    with bgg_client(transport) as client:
        with client.stream('GET', settings.bgg_api_base_url.rstrip('/') + '/thing',
                params={'id':','.join(map(str, ids)), 'stats':1, 'versions':1}, headers=headers) as response:
            delay = retry_after(response.headers.get('Retry-After'))
            if response.status_code != 200:
                return response.status_code, b'', delay
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > sources.MAX_BYTES:
                    fail('source_response_too_large')
            return 200, bytes(body), delay


def run_once(factory, transport=None):
    settings = get_settings()
    if not (settings.boardgame_enabled and settings.boardgame_preview_worker_enabled
            and settings.bgg_enabled and settings.bgg_api_token):
        return False
    owner = str(uuid4())
    with factory() as db:
        due = now()
        job = db.scalar(select(PreviewJob).where(
            PreviewJob.state.in_(['queued','fetching','retry_wait']),
            or_(PreviewJob.next_attempt_at.is_(None), PreviewJob.next_attempt_at <= due),
            or_(PreviewJob.lease_expires_at.is_(None), PreviewJob.lease_expires_at <= due))
            .order_by(PreviewJob.created_at, PreviewJob.id).with_for_update(skip_locked=True).limit(1))
        if job is None:
            return False
        started = datetime.fromisoformat(job.params.get('fetch_started_at') or job.created_at.isoformat())
        if (due - started).total_seconds() >= settings.bgg_job_max_wait_seconds:
            job.state, job.error_code = 'failed', 'preview_timeout'
            job.lease_owner = job.lease_expires_at = None
            job.revision += 1
            db.commit()
            return True
        job.lease_owner, job.lease_expires_at = owner, due + timedelta(seconds=LEASE_SECONDS)
        job.state = 'fetching'
        job.attempt_count += 1
        job.revision += 1
        job_id, engine = job.id, db.bind
        cached_ids = set(db.scalars(select(PreviewItem.bgg_id).where(PreviewItem.job_id == job_id)))
        ids = [identity for identity in job.params['ids'] if identity not in cached_ids]
        db.commit()
    try:
        if ids:
            with bgg_lock(engine) as acquired:
                if not acquired:
                    with factory() as db:
                        job = fenced(db, job_id, owner)
                        if job:
                            job.attempt_count -= 1
                            retry(db, job, 'bgg_busy', settings.bgg_min_interval_seconds)
                            db.commit()
                    return True
                status, raw, delay = fetch_http(ids, transport)
            if status != 200:
                with factory() as db:
                    job = fenced(db, job_id, owner)
                    if job:
                        if status in (202,429) or status >= 500:
                            retry(db, job, f'bgg_http_{status}', delay)
                        else:
                            job.state, job.error_code = 'failed', f'bgg_http_{status}'
                            job.lease_owner = job.lease_expires_at = None
                            job.revision += 1
                        db.commit()
                return True
            parsed = sources.thing_items(raw)
            if not parsed:
                fail('empty_thing_response')
        else:
            parsed = []
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                previews.persist_items(db, job, parsed)
                count = len(list(db.scalars(select(PreviewItem.id).where(PreviewItem.job_id == job_id))))
                job.state = 'ready' if count else 'failed'
                job.error_code = None if count else 'empty_thing_response'
                job.next_attempt_at = job.lease_owner = job.lease_expires_at = None
                job.updated_at, job.revision = now(), job.revision + 1
                db.commit()
    except (httpx.HTTPError, OSError):
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                retry(db, job, 'source_unavailable')
                db.commit()
    except (AppError, ValueError, TypeError, KeyError, RecursionError):
        with factory() as db:
            job = fenced(db, job_id, owner)
            if job:
                job.state, job.error_code = 'failed', 'source_parse_failed'
                job.lease_owner = job.lease_expires_at = None
                job.updated_at, job.revision = now(), job.revision + 1
                db.commit()
    return True

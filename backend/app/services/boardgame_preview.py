"""Private, durable BGG Thing previews used only by name-search intake."""
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import select
from app.core.config import get_settings
from app.models.boardgame import PreviewJob, PreviewItem
from app.services.boardgame_common import audit, digest, fail, get, member, now


def enabled(kind='bgg_thing'):
    settings = get_settings()
    if kind != 'bgg_thing':
        fail('unsupported_preview_kind')
    if not settings.boardgame_preview_worker_enabled:
        fail('worker_disabled', 503)
    if not settings.bgg_enabled or not settings.bgg_api_token:
        fail('source_disabled', 503)


def private_job(db, identity, actor, lock=False):
    member(actor)
    job = get(db, PreviewJob, str(identity), lock)
    if job.requested_by != actor.id:
        fail('not_found', 404)
    return job


def private_item(db, job, identity, lock=False):
    item = get(db, PreviewItem, identity, lock)
    if item.job_id != job.id:
        fail('not_found', 404)
    return item


def new_job(db, actor, kind, params):
    member(actor)
    enabled(kind)
    job = PreviewJob(id=str(uuid4()), kind=kind, requested_by=actor.id,
        params=params, state='queued', progress={}, created_at=now(), updated_at=now(),
        revision=1, attempt_count=0)
    db.add(job)
    db.flush()
    # Reuse only recent complete public Thing snapshots; never another user's ownership.
    cached = []
    for identity in params['ids']:
        item = db.scalar(select(PreviewItem).where(PreviewItem.bgg_id == identity,
            PreviewItem.source_kind == 'thing', PreviewItem.state == 'ready',
            PreviewItem.updated_at >= now() - timedelta(hours=24))
            .order_by(PreviewItem.updated_at.desc()).limit(1))
        if item:
            cached.append(dict(source_kind='thing', source_key=str(identity), bgg_id=identity,
                               payload=item.payload, raw_xml=item.raw_xml))
    persist_items(db, job, cached)
    if len(cached) == len(params['ids']):
        job.state = 'ready'
    audit(db, job, actor, 'create_preview')
    return job


def persist_items(db, job, parsed):
    for values in parsed:
        if values['bgg_id'] not in job.params['ids']:
            continue
        item = db.scalar(select(PreviewItem).where(PreviewItem.job_id == job.id,
            PreviewItem.source_kind == 'thing', PreviewItem.bgg_id == values['bgg_id']))
        if item:
            continue
        db.add(PreviewItem(job_id=job.id, content_hash=digest(values['payload']['raw']),
            state='ready', created_at=now(), updated_at=now(), revision=1, **values))
    db.flush()


def expire_stalled(db, job):
    """Bound waiting even when no worker is running; only a private preview is changed."""
    if job.state not in ('queued', 'fetching', 'retry_wait'):
        return False
    started = datetime.fromisoformat(job.params.get('fetch_started_at') or job.created_at.isoformat())
    if (now() - started).total_seconds() < get_settings().bgg_job_max_wait_seconds:
        return False
    job.state, job.error_code = 'failed', 'preview_timeout'
    job.lease_owner = job.lease_expires_at = job.next_attempt_at = None
    job.updated_at, job.revision = now(), job.revision + 1
    db.flush()
    return True

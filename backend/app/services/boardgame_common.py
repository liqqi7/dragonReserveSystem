"""Transaction-neutral helpers shared by HTTP handlers and import workers."""

import base64
import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
import math
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.exceptions import AppError
from app.models import User
from app.models.boardgame import AuditEvent, RequestKey

TZ = ZoneInfo('Asia/Shanghai')


def now():
    return datetime.now(TZ).replace(tzinfo=None)


def safe(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=TZ).isoformat() if value.tzinfo is None else value.astimezone(TZ).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (Decimal, UUID)):
        return str(value)
    if isinstance(value, dict):
        return {k: safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [safe(v) for v in value]
    return value


def digest(value):
    data = json.dumps(safe(value), sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    return hashlib.sha256(data.encode()).hexdigest()


def fail(reason, status=422, **details):
    code = {403: 'PERMISSION_DENIED', 404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE',
            503: 'FEATURE_UNAVAILABLE'}.get(status, 'VALIDATION_ERROR')
    raise AppError(code, reason.replace('_', ' '), status, {'reason': reason, **safe(details)})


def member(actor):
    if actor.role not in ('user', 'admin'):
        fail('role_required', 403)


def admin(actor):
    if actor.role != 'admin':
        fail('admin_required', 403)


def get(db, cls, identity, lock=False):
    obj = db.get(cls, identity, with_for_update=lock, populate_existing=lock)
    if obj is None:
        fail('not_found', 404)
    return obj


def check_revision(obj, expected):
    actual = obj.revision if obj else 0
    if expected != actual:
        fail('revision_mismatch', 409, current_revision=actual)


def columns(obj, fields=None):
    return safe({k: getattr(obj, k) for k in (fields or [c.name for c in obj.__table__.columns])})


def stamp(actor, **values):
    return dict(created_by=actor.id, updated_by=actor.id, created_at=now(), updated_at=now(), revision=1, **values)


def touch(obj, actor):
    obj.updated_by = actor.id
    obj.updated_at = now()
    obj.revision += 1


def audit(db, obj, actor, action, before=None, reason=None, after=None):
    identity = getattr(obj, 'id', None)
    if identity is None:
        identity = ':'.join(str(getattr(obj, c.name)) for c in obj.__table__.primary_key.columns)
    # Detailed sources are private and stay in import_items, never in business audit payloads.
    db.add(AuditEvent(entity_type=obj.__tablename__ if hasattr(obj, '__tablename__') else obj.__table__.name.removeprefix('boardgame_')[:32],
                      entity_id=str(identity), entity_revision=getattr(obj, 'revision', 1), action=action,
                      actor_user_id=actor.id if actor else None, before_data=safe(before), after_data=safe(after),
                      reason=reason, created_at=now()))


def user_summary(db, user_id):
    u = db.get(User, user_id) if user_id else None
    return columns(u, ['id', 'nickname', 'avatar_url']) if u else None


def unique(values, reason='duplicate_identity'):
    if len(values) != len(set(values)):
        fail(reason)


def create_once(db, actor, operation, key, payload, fn, resource_type):
    member(actor)
    try:
        key = str(UUID(key or ''))
    except (ValueError, TypeError, AttributeError):
        fail('idempotency_key_required')
    # Every HTTP write locks the actor row before looking up the key. The unique
    # constraint remains the final guard for workers and other database clients.
    existing = db.scalar(select(RequestKey).where(RequestKey.actor_user_id == actor.id,
                         RequestKey.operation == operation, RequestKey.key == key))
    fingerprint = digest(payload)
    if existing:
        if existing.request_hash != fingerprint:
            fail('idempotency_key_reused', 409)
        return existing.resource_ids, True
    ids = fn()
    if not isinstance(ids, list):
        ids = [ids]
    db.add(RequestKey(actor_user_id=actor.id, operation=operation, key=key,
                      request_hash=fingerprint, resource_type=resource_type,
                      resource_ids=ids, created_at=now()))
    db.flush()
    return ids, False


def cursor_value(value, column):
    """Validate opaque cursor values before handing them to a database driver."""
    try:
        try:
            kind = column.type.python_type
        except NotImplementedError:
            # SQL aggregate expressions such as AVG can have NullType metadata.
            kind = Decimal
        if kind in (date, datetime):
            return kind.fromisoformat(value)
        if kind is int:
            if type(value) is not int:
                raise ValueError()
        elif kind is str:
            if not isinstance(value, str):
                raise ValueError()
        elif kind in (float, Decimal):
            if type(value) not in (int, float, str):
                raise ValueError()
            value = kind(value)
            if not math.isfinite(value):
                raise ValueError()
        elif type(value) not in (int, float, str):
            raise ValueError()
        return value
    except (ValueError, TypeError, OverflowError, ArithmeticError):
        fail('invalid_cursor')


def page(db, stmt, identity_column, render, limit=20, cursor=None, filters=None, *, order_column=None, descending=False):
    if not 1 <= limit <= 100:
        fail('invalid_limit')
    signature = digest({'filters': filters or {}, 'order': order_column.key if order_column is not None else None, 'desc': descending})
    if cursor:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(cursor.encode()))
            if decoded['v'] != 1 or decoded['f'] != signature:
                fail('cursor_filter_mismatch')
            last = cursor_value(decoded['last'], identity_column)
        except (ValueError, KeyError, TypeError, UnicodeError):
            fail('invalid_cursor')
        if order_column is not None:
            from sqlalchemy import and_, or_
            value = decoded.get('value')
            if value is None:
                fail('invalid_cursor')
            value = cursor_value(value, order_column)
            stmt = stmt.where(or_(order_column < value if descending else order_column > value,
                                   and_(order_column == value, identity_column > last)))
        else:
            stmt = stmt.where(identity_column > last)
    ordering = [identity_column] if order_column is None else [order_column.desc() if descending else order_column, identity_column]
    rows = list(db.scalars(stmt.order_by(*ordering).limit(limit + 1)))
    more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = None
    if more:
        next_cursor = base64.urlsafe_b64encode(json.dumps({'v': 1, 'f': signature,
                'last': getattr(rows[-1], identity_column.key, rows[-1]),
                'value': safe(getattr(rows[-1], order_column.key)) if order_column is not None else None}).encode()).decode()
    return dict(items=[render(r) for r in rows], has_more=more, next_cursor=next_cursor, generated_at=safe(now()))

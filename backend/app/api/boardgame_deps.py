"""Feature-gated dependencies with an explicit commit/rollback boundary."""

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User
from app.services.boardgame_common import fail, member


def enabled():
    if not get_settings().boardgame_enabled:
        fail('not_found', 404)


async def body_limit(request: Request):
    if request.headers.get('content-type', '').split(';')[0] == 'application/json':
        if len(await request.body()) > 512 * 1024:
            fail('body_too_large', 413)


def write_db(db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    try:
        db.scalar(select(User).where(User.id == actor.id).with_for_update().execution_options(populate_existing=True))
        member(actor)
        yield db
        db.commit()
    except IntegrityError:
        db.rollback()
        fail('concurrent_or_invalid_reference', 409)
    except OperationalError as exc:
        db.rollback()
        if getattr(exc.orig, 'args', [None])[0] in (1205, 1213):
            fail('retryable_transaction_conflict', 409)
        raise
    except Exception:
        db.rollback()
        raise

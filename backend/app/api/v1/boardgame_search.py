"""Bounded, cached BGG name search for library intake."""
import time
import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User
from app.services import boardgame_sources as sources
from app.services.boardgame_common import fail, member, now
router = APIRouter(tags=['boardgame-library'], dependencies=[Depends(enabled)])
_search_cache = {}

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

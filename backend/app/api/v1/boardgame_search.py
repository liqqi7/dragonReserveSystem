"""Bounded, cached BGG name search for library intake."""
import re
import time
import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.services.boardgame_http import client as bgg_client
from app.core.database import get_db
from app.models import User
from app.services import boardgame_catalog as catalog, boardgame_sources as sources
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
            with bgg_client() as client:
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
    by_id = {}
    for n in root.findall('item'):
        r = dict(bgg_id=sources.positive(n.get('id')), game_type=n.get('type'),
                 name=n.find('name').get('value') if n.find('name') is not None else None,
                 year_published=sources.positive(n.find('yearpublished').get('value')) if n.find('yearpublished') is not None else None)
        if not r['bgg_id'] or not r['name']:
            continue
        prev = by_id.get(r['bgg_id'])
        # BGG may return both boardgame/boardgameexpansion rows for one id; keep the expansion row.
        if prev is None or (prev.get('game_type') != 'boardgameexpansion'
                            and r.get('game_type') == 'boardgameexpansion'):
            by_id[r['bgg_id']] = r
    items = merge_expansions(list(by_id.values()))
    try:
        apply_precise_links(db, items)
    except Exception:
        pass  # Precise pass must never break search; stem results stay.
    result = {'items': items, 'cached_at': now().isoformat()}
    if len(_search_cache) >= 256:
        _search_cache.pop(next(iter(_search_cache)))
    _search_cache[q.casefold()] = (time.monotonic(), result)
    return search_page(result, offset, limit)

def _stem(name):
    for sep in (':', '：', '–', '—', '-'):
        name = name.split(sep)[0]
    return name.strip().casefold()


def _stem_display(name):
    for sep in (':', '：', '–', '—', '-'):
        name = name.split(sep)[0]
    return name.strip()


def merge_expansions(items):
    """Fold expansion-typed results into their base entry within the same result set."""
    stem = _stem
    bases = [i for i in items if i.get('game_type') != 'boardgameexpansion']
    for item in items:
        if item.get('game_type') != 'boardgameexpansion' or not item.get('name'):
            continue
        prefix = stem(item['name'])
        match = next((b for b in bases if stem(b.get('name') or '') == prefix), None)
        if match is None:
            candidates = [b for b in bases if prefix.startswith(stem(b.get('name') or '') + ' ')]
            if candidates:
                match = max(candidates, key=lambda b: len(b.get('name') or ''))
        if match:
            item['expansion_of_bgg_id'] = match['bgg_id']
            if 'promo' not in (item.get('name') or '').casefold():  # 徽标计数只算真扩展，推广件不计
                match['expansion_count'] = match.get('expansion_count', 0) + 1
    return items


def _chinese_name(names):
    """First Chinese alias (same rule as catalog.library_metadata)."""
    for name in names:
        text = str(name)
        if re.search(r'[぀-ヿ]', text):  # Japanese kana gives away non-Chinese CJK aliases
            continue
        if re.search(r'[㐀-鿿]', text):
            return re.sub(r'\s*\([^)]*\)', '', text).strip()
    return None


def _thing_fetch(settings, engine, ids):
    """One batched BGG Thing request (no stats/versions); None on any failure."""
    from app.services.boardgame_worker import bgg_lock
    headers = {'Authorization': f'Bearer {settings.bgg_api_token}', 'Accept': 'application/xml'}
    try:
        with bgg_lock(engine) as acquired:
            if not acquired:
                return None
            with bgg_client() as client:
                response = client.get(settings.bgg_api_base_url.rstrip('/') + '/thing',
                                      params={'id': ','.join(map(str, ids))}, headers=headers)
        if response.status_code != 200 or len(response.content) > sources.MAX_BYTES:
            return None
        return response.content
    except (httpx.HTTPError, OSError, AppError, ValueError, TypeError, KeyError, RecursionError):
        return None


def apply_precise_links(db, items):
    """Fold expansions and attach base info via official BGG links plus local
    ExpansionLink rows. Stem-based folding stays as fallback on any failure."""
    from app.models.boardgame import BoardGame, ExpansionLink
    id_set = {i['bgg_id'] for i in items if i.get('bgg_id')}
    if not id_set:
        return
    fold_map, base_info, authority_bases = {}, {}, set()

    # 1) Local ExpansionLink rows cost nothing and need no upstream call.
    local_games = {g.bgg_id: g for g in db.scalars(select(BoardGame).where(BoardGame.bgg_id.in_(id_set)))}
    for item in items:
        game = local_games.get(item.get('bgg_id'))
        if game:
            chinese = catalog.library_metadata(game.bgg_payload).get('chinese_name')
            if chinese:
                item['display_name'] = chinese
    links = list(db.scalars(select(ExpansionLink)))
    game_ids = {l.base_game_id for l in links} | {l.expansion_game_id for l in links}
    games = {g.id: g for g in db.scalars(select(BoardGame).where(BoardGame.id.in_(game_ids)))} if game_ids else {}
    for link in links:
        base, exp = games.get(link.base_game_id), games.get(link.expansion_game_id)
        if not base or not exp or not base.bgg_id or not exp.bgg_id or exp.bgg_id not in id_set:
            continue
        base_info.setdefault(exp.bgg_id, {'base_bgg_id': base.bgg_id, 'base_name':
                                          catalog.library_metadata(base.bgg_payload).get('chinese_name') or base.name})
        if base.bgg_id in id_set:
            fold_map[exp.bgg_id] = base.bgg_id
    db.rollback()  # No business transaction spans the external request.

    # 2) One batched Thing call for the result set, one optional follow-up for
    # base candidates referenced only by expansion inbound links.
    settings = get_settings()
    xml_items, primary, aliases = {}, {}, {}

    def _absorb(raw):
        if not raw:
            return
        for node in sources.xml_root(raw).findall('item'):
            nid = sources.positive(node.get('id'))
            if nid:
                xml_items[nid] = node
                primary[nid] = next((n.get('value') for n in node.findall('name')
                                     if n.get('type') == 'primary'), None)
                aliases[nid] = [n.get('value') for n in node.findall('name') if n.get('value')]

    # Skip upstream when nothing can be gained: all-base set (nothing folded,
    # no expansion rows), or local ExpansionLink rows already cover every
    # expansion in the set. Stem results stay untouched in both cases.
    any_expansion_rows = any(i.get('game_type') == 'boardgameexpansion' for i in items)
    any_stem_folded = any(i.get('expansion_of_bgg_id') for i in items)
    exp_ids_in_set = {i['bgg_id'] for i in items if i.get('game_type') == 'boardgameexpansion'}
    if (any_expansion_rows or any_stem_folded) and (not exp_ids_in_set or exp_ids_in_set - set(fold_map)):
        _absorb(_thing_fetch(settings, db.bind, sorted(id_set)[:20]))
    for nid, node in xml_items.items():
        if node.get('type') == 'boardgameexpansion':
            continue
        authority_bases.add(nid)
        for link in node.findall('link'):
            if link.get('type') != 'boardgameexpansion':
                continue
            bid = sources.positive(link.get('id'))
            if bid and bid != nid and bid in id_set:
                fold_map[bid] = nid
    todo = {}
    for nid, node in xml_items.items():
        if node.get('type') != 'boardgameexpansion':
            continue
        targets = {sources.positive(l.get('id')) for l in node.findall('link')
                   if l.get('type') == 'boardgameexpansion'}
        targets.discard(None)
        targets.discard(nid)
        hit = next((t for t in targets if xml_items.get(t) is not None
                    and xml_items[t].get('type') == 'boardgame'), None)
        if hit:
            base_info.setdefault(nid, {'base_bgg_id': hit,
                                       'base_name': _chinese_name(aliases.get(hit) or []) or primary.get(hit)})
        elif targets:
            todo[nid] = targets
    extra = sorted({t for ts in todo.values() for t in ts} - set(xml_items))[:20]
    if extra:
        _absorb(_thing_fetch(settings, db.bind, extra))
        for eid, targets in todo.items():
            hit = next((t for t in targets if xml_items.get(t) is not None
                        and xml_items[t].get('type') == 'boardgame'), None)
            if hit:
                base_info.setdefault(eid, {'base_bgg_id': hit,
                                           'base_name': _chinese_name(aliases.get(hit) or []) or primary.get(hit)})

    # 3) Official links override stem folding; stem-folded entries under an
    # authoritative base but absent from its links are unfolded again.
    for item in items:
        bid = item.get('bgg_id')
        if bid in fold_map:
            item['expansion_of_bgg_id'] = fold_map[bid]
        elif item.get('expansion_of_bgg_id') in authority_bases:
            del item['expansion_of_bgg_id']
    counts = {}
    for item in items:
        base_bgg = item.get('expansion_of_bgg_id')
        if base_bgg and 'promo' not in (item.get('name') or '').casefold():
            counts[base_bgg] = counts.get(base_bgg, 0) + 1
    for item in items:
        if item.get('game_type') == 'boardgameexpansion':
            continue
        if item['bgg_id'] in counts:
            item['expansion_count'] = counts[item['bgg_id']]
        else:
            item.pop('expansion_count', None)
    # Unfolded expansions expose their base for the "jump to base" entry;
    # official link first, stem guess as last resort.
    for item in items:
        if item.get('game_type') != 'boardgameexpansion' or item.get('expansion_of_bgg_id'):
            continue
        info = base_info.get(item['bgg_id'])
        if info and info.get('base_name'):
            item['base_bgg_id'], item['base_name'] = info['base_bgg_id'], info['base_name']
        else:
            guess = _stem_display(item.get('name') or '')
            if guess and len(guess) < len(item.get('name') or ''):
                item['base_name'] = guess


def search_page(result, offset, limit):
    # Items are deduped/merged/enriched before caching; here we only paginate.
    items = [i for i in result['items'] if not i.get('expansion_of_bgg_id')]
    return dict(items=items[offset:offset+limit], total=len(items), cached_at=result['cached_at'],
                next_offset=offset+limit if offset+limit < len(items) else None)

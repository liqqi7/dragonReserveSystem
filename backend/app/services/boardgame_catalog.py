"""Catalog and member-owned editions. No plays, activity plans or historical imports."""
import re
from decimal import Decimal
from urllib.parse import urlparse
from sqlalchemy import func, select
from app.models import User
from app.models.boardgame import BoardGame, Inventory, PreviewItem
from app.schemas.boardgame import GameFields
from app.services.boardgame_common import (audit, check_revision, columns, fail, get, member, now, safe, stamp, touch, user_summary)
from app.services.boardgame_labels import mechanic_label, version_view, edition_label, language_label

GAME_PUBLIC = ['id', 'bgg_id', 'name', 'original_name', 'game_type', 'is_standalone', 'cover_url', 'min_players', 'max_players', 'min_playtime_minutes', 'max_playtime_minutes', 'min_age', 'year_published', 'complexity', 'sort_order', 'archived_at', 'revision']
GAME_DEFAULTS = dict(aliases=[], is_standalone=False, cover_url=None, description=None, min_players=None, max_players=None, min_playtime_minutes=None, max_playtime_minutes=None, min_age=None, year_published=None, complexity=None)

def library_metadata(payload):
    """Public card metadata from saved BGG data; never fetch upstream on a list read."""
    from app.services.boardgame_sources import decimal_score
    payload = payload or {}
    projection = payload.get('projection') or (payload.get('normalized') or {}).get('projection') or {}
    rating = projection.get('bgg_rating')
    mechanics = list(projection.get('mechanics') or [])
    aliases = list(projection.get('aliases') or [])
    rank = projection.get('bgg_rank')
    weight = projection.get('bgg_weight') or projection.get('complexity')
    raw = payload.get('raw') or {}
    # Older stored projections predate rating/mechanic fields. Read their
    # archived XML tree without exposing raw data or doing a network request.
    def walk(node):
        if isinstance(node, dict):
            yield node
            for child in node.get('children', []):
                yield from walk(child)
        elif isinstance(node, list):
            for child in node:
                yield from walk(child)
    raw_mechanics = not mechanics
    for child in walk(raw):
        attrs = child.get('attributes', {})
        if raw_mechanics and child.get('tag') == 'link' and attrs.get('type') == 'boardgamemechanic':
            mechanics.append(attrs.get('value', ''))
        if rating is None and child.get('tag') == 'average':
            rating = attrs.get('value')
        if rank is None and child.get('tag') == 'rank' and attrs.get('name') == 'boardgame':
            rank = attrs.get('value')
        if weight is None and child.get('tag') == 'averageweight':
            weight = attrs.get('value')
    parsed = decimal_score(rating, [])
    score = Decimal(parsed) if parsed is not None else None
    tags = list(dict.fromkeys(mechanic_label(m) for m in mechanics if m))
    chinese_name = next((re.sub(r'\s*\([^)]*\)', '', name).strip() for name in aliases
                         if re.search(r'[\u3400-\u9fff]', str(name))), None)
    return dict(bgg_rating=str(score.quantize(Decimal('0.01'))) if score is not None and 0 < score <= 10 else None,
                bgg_rank=int(rank) if str(rank or '').isdigit() else None,
                bgg_weight=str(weight) if weight is not None else None,
                bgg_weight_display=(f'{Decimal(parsed_weight):.1f}' if (parsed_weight := decimal_score(weight, [])) is not None else None),
                chinese_name=chinese_name,
                mechanic_tags=[dict(id=str(i), name=label) for i, label in enumerate(tags)])


def game(db, identity, actor=None, *, usable=False, lock=False):
    obj = get(db, BoardGame, identity, lock)
    if not obj.is_visible and not (actor and (actor.role == 'admin' or obj.created_by == actor.id)):
        fail('not_found', 404)
    if usable and (obj.archived_at or obj.merged_into_id):
        fail('game_unavailable', 409, canonical_id=obj.merged_into_id)
    return obj


def game_detail(db, obj, actor, detail=True):
    out = columns(obj, GAME_PUBLIC)
    out['inventory_summary'] = inventory_summary(db, obj.id)
    if detail:
        out.update(columns(obj, ['aliases', 'description', 'bgg_synced_at']))
        projection = (obj.bgg_payload or {}).get('projection', {}) if obj.bgg_payload else {}
        mechanics = projection.get('mechanics') or []
        categories = projection.get('categories') or []
        out.update(categories=categories, mechanics=mechanics,
                   categories_label=' · '.join(categories),
                   mechanics_label=mechanic_label(mechanics))
        out.update(library_metadata(obj.bgg_payload))
        raw = (obj.bgg_payload or {}).get('raw') or {}
        versions = []
        version_node = next((n for n in raw.get('children', []) if n.get('tag') == 'versions'), None)
        for node in (version_node or {}).get('children', []):
            if node.get('tag') != 'item':
                continue
            attrs = node.get('attributes') or {}
            children = node.get('children') or []
            def vals(tag):
                return [c.get('attributes', {}).get('value') for c in children if c.get('tag') == tag and c.get('attributes', {}).get('value')]
            name = next(iter(vals('name')), None) or '版本未填写'
            langs = [c.get('attributes', {}).get('value') for c in children if c.get('tag') == 'link' and c.get('attributes', {}).get('type') == 'language']
            pubs = [c.get('attributes', {}).get('value') for c in children if c.get('tag') == 'link' and c.get('attributes', {}).get('type') == 'boardgamepublisher']
            image = next((c.get('text') for c in children if c.get('tag') == 'image'), None)
            year = next(iter(vals('yearpublished')), None)
            versions.append(dict(bgg_version_id=int(attrs['id']) if str(attrs.get('id','')).isdigit() else None,
                                 name=name, languages=langs, publishers=pubs,
                                 year_published=int(year) if str(year or '').isdigit() else None,
                                 cover_url=image))
        from app.services.boardgame_labels import version_view
        out['version_options'] = [version_view(v) for v in versions]
        out.update(field_sources={k: 'manual' if k in obj.local_overrides else 'bgg' if obj.bgg_id else 'unknown'
                                  for k in GameFields.model_fields}, canonical_id=obj.merged_into_id,
                   permissions={'can_edit': False})
    return out


def validate_cover(url, imported=False):
    if url is None:
        return
    parsed = urlparse(url)
    from app.core.config import get_settings
    prefix = get_settings().media_url_prefix.rstrip('/') + '/boardgames/'
    if url.startswith(prefix) and '..' not in url and not parsed.query and not parsed.fragment:
        return
    if imported and parsed.scheme == 'https' and parsed.hostname in ('cf.geekdo-images.com', 'cf.geekdo.com'):
        return
    fail('controlled_image_required')


def project_game(obj):
    base = (obj.bgg_payload or {}).get('projection', {})
    values = {**GAME_DEFAULTS, **{k: v for k, v in base.items() if k in GameFields.model_fields}, **obj.local_overrides}
    if not values.get('name') or values.get('game_type') not in ('base', 'expansion'):
        fail('required_game_fields')
    for a, b in [('min_players', 'max_players'), ('min_playtime_minutes', 'max_playtime_minutes')]:
        if values.get(a) and values.get(b) and values[a] > values[b]:
            fail('invalid_range')
    for k, v in values.items():
        setattr(obj, k, Decimal(str(v)) if k == 'complexity' and v is not None else v)
    # A local title/alias edit must not make the upstream title unsearchable.
    obj.search_text = ' '.join(dict.fromkeys(filter(None, [obj.name, base.get('name'),
                                                         *(base.get('aliases') or []), *(obj.aliases or []),
                                                         *(mechanic_label(m) for m in base.get('mechanics', [])),
                                                         *base.get('mechanics', [])]))).casefold()


def create_game(db, actor, payload, source=None):
    member(actor)
    changes = payload.set_overrides.model_dump(mode='json', exclude_unset=True)
    for key in ('name', 'game_type'):
        if key in changes and changes[key] != getattr(payload, key):
            fail('conflicting_game_fields')
    validate_cover(changes.get('cover_url'))
    item = None
    if payload.bgg_id and source is None:
        item = db.scalar(select(PreviewItem).where(PreviewItem.bgg_id == payload.bgg_id,
                         PreviewItem.source_kind == 'thing').order_by(PreviewItem.id.desc()).limit(1))
        if item is None:
            fail('standard_thing_required')
        # Catalog snapshots are public upstream data; never use private user data.
        source = item.payload
    if payload.bgg_id:
        existing = db.scalar(select(BoardGame).where(BoardGame.bgg_id == payload.bgg_id))
        if existing:
            fail('bgg_already_bound', 409, canonical_id=existing.id)
    obj = BoardGame(**stamp(actor, bgg_id=payload.bgg_id, local_overrides={
        'name': payload.name, 'game_type': payload.game_type, **changes}, bgg_payload=source,
        is_visible=payload.is_visible, sort_order=payload.sort_order))
    project_game(obj)
    if item is not None:
        obj.bgg_raw_xml, obj.bgg_content_hash, obj.bgg_parser_version = item.raw_xml, item.content_hash, '1'
        obj.bgg_request_params, obj.bgg_synced_at = {'id': payload.bgg_id, 'stats': 1, 'versions': 1}, item.updated_at
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create', after=columns(obj, GAME_PUBLIC))
    return obj


def change_inventory_version(db, obj, actor, payload):
    if not inventory_private(obj, actor):
        fail('own_inventory_only', 403)
    check_revision(obj, payload.expected_revision)
    if obj.archived_at:
        fail('inventory_unavailable', 409)
    parent = game(db, obj.game_id, actor)
    options = game_detail(db, parent, actor)['version_options']
    version = next((v for v in options if v['bgg_version_id'] == payload.bgg_version_id), None)
    if version is None:
        fail('version_game_mismatch')
    before = columns(obj, ['bgg_version_id', 'bgg_version_snapshot', 'edition_name', 'language'])
    obj.bgg_version_id = version['bgg_version_id']
    obj.bgg_version_snapshot = {**version, 'bgg_id': parent.bgg_id}
    obj.edition_name = version['name']
    obj.language = ' / '.join(version['languages'])[:64] or None
    touch(obj, actor)
    audit(db, obj, actor, 'select_bgg_version', before, payload.reason,
          columns(obj, ['bgg_version_id', 'bgg_version_snapshot', 'edition_name', 'language']))
    db.flush()
    return obj


def inventory_private(obj, actor):
    return actor.role in ('user', 'admin') and obj.owner_user_id == actor.id


def inventory_summary(db, game_id):
    count = db.scalar(select(func.count()).select_from(Inventory).where(
        Inventory.game_id == game_id, Inventory.archived_at.is_(None)))
    return {'total': count}


def inventory_detail(db, obj, actor):
    out = columns(obj, ['id', 'game_id', 'status', 'edition_name', 'language', 'sort_order', 'archived_at', 'revision', 'bgg_version_id'])
    snapshot = obj.bgg_version_snapshot or {}
    version = version_view(snapshot) if snapshot else None
    owner = user_summary(db, obj.owner_user_id) or {}
    out.update(edition_label=(version or {}).get('display_name') or edition_label(obj.edition_name),
        language_label=(version or {}).get('language_label') or language_label(obj.language),
        bgg_version=version,
        owner={'type':'member', 'id':obj.owner_user_id, 'display_name':owner.get('nickname') or '成员', 'avatar_url':owner.get('avatar_url', '')},
        permissions={'can_edit':inventory_private(obj, actor)})
    if inventory_private(obj, actor):
        out['internal'] = {'remark':obj.remark}
    return out


def create_inventory(db, actor, payload):
    game(db, payload.game_id, actor, usable=True, lock=True)
    if payload.owner_type != 'member' or payload.owner_label or payload.owner_user_id not in (None, actor.id):
        fail('own_inventory_only', 403)
    existing = db.scalar(select(Inventory).where(Inventory.game_id == payload.game_id,
        Inventory.owner_user_id == actor.id).with_for_update())
    if existing:
        fail('already_owned', 409, inventory_id=existing.id)
    values = payload.model_dump(exclude={'quantity','game_id','owner_user_id'})
    obj = Inventory(**stamp(actor, game_id=payload.game_id, owner_user_id=actor.id, **values))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create')
    return [obj]

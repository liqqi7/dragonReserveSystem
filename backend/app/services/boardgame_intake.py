"""Prepared BGG candidates and an explicit, atomic catalog/inventory confirmation.

Reuse the existing leased Thing worker as a private preview store. Fetching a
candidate never applies an import or creates a catalog/inventory record.
"""
from copy import deepcopy
from html.parser import HTMLParser
from urllib.parse import urlparse

from sqlalchemy import select

from app.models.boardgame import BoardGame, ImportItem, Inventory
from app.schemas.boardgame import GameCreate, InventoryCreate
from app.services import boardgame_catalog as catalog, boardgame_import as imports, boardgame_sources as sources
from app.services.boardgame_common import audit, check_revision, digest, fail, now, safe, touch

PURPOSE = 'intake_preview'


def private_preview(db, identity, actor, lock=False):
    job = imports.private_job(db, str(identity), actor, lock)
    if job.kind != 'bgg_thing' or job.params.get('purpose') != PURPOSE:
        fail('not_found', 404)
    return job


def new_preview(db, actor, ids):
    return imports.new_job(db, actor, 'bgg_thing', {'ids': ids, 'purpose': PURPOSE})


def image_url(value):
    if not value:
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme == 'https' and parsed.hostname in ('cf.geekdo-images.com', 'cf.geekdo.com'):
        return value.strip()
    return None


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, value):
        self.parts.append(value)

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'p', 'div', 'li'):
            self.parts.append('\n')


def links(node, kind):
    return list(dict.fromkeys(n.get('value').strip() for n in node.findall('link')
                             if n.get('type') == kind and n.get('value', '').strip()))


def version_projection(node):
    name = next((n.get('value') for n in node.findall('name') if n.get('type') == 'primary'), None)
    year = node.find('yearpublished')
    return dict(bgg_version_id=sources.positive(node.get('id')), name=name,
                year_published=sources.positive(year.get('value')) if year is not None else None,
                languages=links(node, 'language'), publishers=links(node, 'boardgamepublisher'),
                cover_url=image_url(node.findtext('image')), thumbnail_url=image_url(node.findtext('thumbnail')))


def item_root(item):
    if item.source_kind != 'thing' or not item.raw_xml:
        fail('candidate_not_ready', 409)
    root = sources.xml_root(item.raw_xml.encode())
    if root.tag != 'item' or sources.positive(root.get('id')) != item.bgg_id:
        fail('candidate_not_ready', 409)
    if root.get('type') not in ('boardgame', 'boardgameexpansion'):
        fail('unsupported_game_type')
    return root


def versions(item):
    root = item_root(item)
    found = {}
    for node in root.findall('versions/item'):
        if node.get('type') != 'boardgameversion':
            continue
        data = version_projection(node)
        if data['bgg_version_id']:
            found.setdefault(data['bgg_version_id'], (data, node))
    return found


def candidate(db, item, actor, detail=False):
    root = item_root(item)
    p = item.payload.get('projection', {})
    existing = db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id))
    # Only expose a link the current actor can actually open.
    local_id = existing.id if existing and existing.archived_at is None and (
        existing.is_visible or actor.role == 'admin') else None
    out = {k: p.get(k) for k in ('name', 'aliases', 'game_type', 'year_published', 'min_players',
                                  'max_players', 'min_playtime_minutes', 'max_playtime_minutes')}
    out.update(item_id=item.id, revision=item.revision, bgg_id=item.bgg_id,
               display_name=existing.name if local_id else p.get('name'), original_name=p.get('name'),
               cover_url=image_url(root.findtext('image')), thumbnail_url=image_url(root.findtext('thumbnail')),
               local_game_id=local_id, local_game_name=existing.name if local_id else None,
               detail_state='ready', version_count=len(versions(item)),
               source_url=f'https://boardgamegeek.com/boardgame/{item.bgg_id}')
    if detail:
        parser = PlainText()
        parser.feed((existing.local_overrides['description'] if local_id and
                     'description' in existing.local_overrides else p.get('description')) or '')
        out.update(description=''.join(parser.parts).strip(), publishers=links(root, 'boardgamepublisher'))
    return safe(out)


def preview_detail(db, job, actor):
    rows = list(db.scalars(select(ImportItem).where(ImportItem.job_id == job.id, ImportItem.source_kind == 'thing')))
    by_id = {r.bgg_id: r for r in rows}
    return dict(id=job.id, state=job.state, revision=job.revision, error_code=job.error_code,
                retryable=job.state == 'failed',
                items=[candidate(db, by_id[identity], actor) for identity in job.params['ids'] if identity in by_id],
                missing_ids=[identity for identity in job.params['ids'] if identity not in by_id],
                result=job.params.get('intake_result'))


def retry_preview(db, job, actor, revision):
    imports.enabled(job.kind)
    check_revision(job, revision)
    if job.state != 'failed' or job.params.get('intake_result'):
        fail('job_not_retryable', 409)
    job.state, job.attempt_count, job.next_attempt_at = 'queued', 0, now()
    job.error_code = job.error_message = job.lease_owner = job.lease_expires_at = None
    job.params = {**job.params, 'fetch_started_at': now().isoformat()}
    touch(job, actor)


def result(db, ids, actor):
    game = catalog.game(db, ids[0], actor)
    return dict(game=catalog.game_detail(db, game, actor),
                inventory=[catalog.inventory_detail(db, db.get(Inventory, identity), actor) for identity in ids[1:]],
                game_id=ids[0], inventory_ids=ids[1:])


def confirm(db, actor, form):
    fingerprint = digest(form.model_dump(mode='json'))
    version = raw_version = job = None
    if form.source == 'bgg':
        job = private_preview(db, form.preview_id, actor, True)
        if job.params.get('intake_result'):
            if job.params.get('intake_hash') != fingerprint:
                fail('intake_already_confirmed', 409)
            saved = job.params['intake_result']
            return [saved['game_id'], *saved['inventory_ids']]
        if job.state != 'ready':
            fail('candidate_not_ready', 409)
        item = imports.private_item(db, job, form.item_id, True)
        check_revision(item, form.expected_revision)
        item_root(item)
        if item.bgg_id not in job.params['ids']:
            fail('candidate_not_ready', 409)
        if form.bgg_version_id:
            selected = versions(item).get(form.bgg_version_id)
            if not selected:
                fail('version_game_mismatch')
            version, raw_version = selected
        game = db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id).with_for_update())
        if game:
            # Reusing a catalog entry never silently overwrites shared names or sources.
            game = catalog.game(db, game.id, actor, usable=True, lock=True)
        else:
            p = item.payload['projection']
            create = GameCreate(name=form.display_name or p['name'], game_type=p['game_type'], bgg_id=item.bgg_id)
            game = catalog.create_game(db, actor, create, source=item.payload)
            game.bgg_raw_xml, game.bgg_content_hash = item.raw_xml, item.content_hash
            game.bgg_parser_version = str(item.payload.get('parser_version', sources.PARSER_VERSION))
            game.bgg_request_params, game.bgg_synced_at = {'id': item.bgg_id, 'stats': 1, 'versions': 1}, item.updated_at
            # create_inventory locks and repopulates the game below. Production
            # sessions disable autoflush, so persist source metadata first or that
            # reload will discard it. This remains inside the same transaction.
            db.flush()
    else:
        game = catalog.create_game(db, actor, form.game)
    boxes = []
    if form.inventory is not None:
        values = form.inventory.model_dump()
        if version:
            # Metadata comes from the selected server-side version, never client inference.
            values.update(edition_name=version['name'], language=', '.join(version['languages'])[:64] or None)
        boxes = catalog.create_inventory(db, actor, InventoryCreate(game_id=game.id, **values))
        for box in boxes:
            if version:
                box.bgg_version_id = version['bgg_version_id']
                box.bgg_version_snapshot = dict(**deepcopy(version), bgg_id=item.bgg_id,
                    raw=sources.xml_tree(raw_version), source_hash=item.content_hash, captured_at=safe(now()))
                audit(db, box, actor, 'select_bgg_version', after={'bgg_version_id':box.bgg_version_id,
                      'bgg_version_snapshot':box.bgg_version_snapshot})
    ids = [game.id, *[box.id for box in boxes]]
    if job:
        job.params = {**job.params, 'intake_hash': fingerprint,
                      'intake_result': {'game_id': game.id, 'inventory_ids': ids[1:]}}
        job.state = 'applied'
        touch(job, actor)
        audit(db, job, actor, 'intake_confirm', after={'game_id': game.id, 'inventory_ids': ids[1:],
                                                    'bgg_version_id': form.bgg_version_id})
    db.flush()
    return ids

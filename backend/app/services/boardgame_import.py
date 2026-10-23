"""Private import review and transactional application of dual-source records."""

from copy import deepcopy
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4
import hashlib

from sqlalchemy import select

from app.core.config import get_settings
from app.models import User
from app.models.boardgame import (ImportJob, ImportItem, ImportMapping, BoardGame, Inventory, InventorySource,
    Person, Location, Play, PlaySource, PlayScoresheet, ExpansionLink)
from app.schemas import boardgame as s
from app.schemas.boardgame_import import ImportDecision
from app.services import boardgame_catalog as catalog, boardgame_play as plays, boardgame_sources as sources
from app.services.boardgame_common import (admin, audit, check_revision, columns, digest, fail, get, member,
    now, safe, stamp, touch, unique)


def private_job(db, identity, actor, lock=False):
    member(actor)
    job = get(db, ImportJob, identity, lock)
    if job.requested_by != actor.id:
        fail('not_found', 404)
    return job


def private_item(db, job, identity, lock=False):
    item = get(db, ImportItem, identity, lock)
    if item.job_id != job.id:
        fail('not_found', 404)
    return item


def enabled(kind):
    settings = get_settings()
    if not settings.boardgame_import_worker_enabled:
        fail('worker_disabled', 503)
    if kind.startswith('bgg') and (not settings.bgg_enabled or not settings.bgg_api_token):
        fail('source_disabled', 503)


def new_job(db, actor, kind, params):
    member(actor)
    enabled(kind)
    owner_id = params.get('owner_user_id') or actor.id
    if owner_id != actor.id:
        admin(actor)
        get(db, User, owner_id)
    params = {**params, 'owner_user_id': owner_id}
    if kind == 'bgstats_file':
        dataset = params.get('source_dataset') or str(uuid4())
        params['source_dataset'] = dataset
        params['source_namespace'] = f'u:{owner_id}:r:{actor.id}:dataset:{dataset}'
    else:
        params['source_namespace'] = f'u:{owner_id}:r:{actor.id}:bgg:{params.get("username", "thing").casefold()}'
    job = ImportJob(id=str(uuid4()), kind=kind, requested_by=actor.id, params=params, state='queued',
                    progress={}, created_at=now(), updated_at=now(), revision=1, attempt_count=0)
    db.add(job)
    db.flush()
    audit(db, job, actor, 'create_job')
    return job


def private_root():
    settings = get_settings()
    base = Path(__file__).resolve().parents[2]
    root, media = Path(settings.boardgame_import_root), Path(settings.media_root)
    root = root.resolve() if root.is_absolute() else (base / root).resolve()
    media = media.resolve() if media.is_absolute() else (base / media).resolve()
    if root == media or root.is_relative_to(media):
        fail('private_import_storage_required', 503)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    return root


def save_original(raw):
    # Content-addressed originals are immutable and are never exposed under /media.
    sha = hashlib.sha256(raw).hexdigest()
    path = private_root() / (sha + '.json')
    try:
        with path.open('xb') as stream:
            stream.write(raw)
        path.chmod(0o600)
    except FileExistsError:
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            fail('source_storage_integrity', 503)
    return sha


def job_detail(job):
    fields = ['id', 'kind', 'state', 'progress', 'revision', 'attempt_count', 'next_attempt_at', 'error_code', 'error_message', 'created_at', 'updated_at']
    params = {k: v for k, v in job.params.items() if k in ('username', 'ids', 'from', 'to', 'owner_user_id', 'source_dataset', 'source_namespace')}
    return {**columns(job, fields), 'job_id': job.id, 'params': params, 'source_dataset': job.params.get('source_dataset')}


def persist_items(db, job, parsed):
    for values in parsed:
        item = db.scalar(select(ImportItem).where(ImportItem.job_id == job.id,
            ImportItem.source_kind == values['source_kind'], ImportItem.source_key == values['source_key']))
        fingerprint = digest(values['payload']['raw'])
        if item:
            if item.content_hash != fingerprint and item.state not in ('applied', 'linked', 'skipped'):
                item.state, item.error_code = 'needs_review', 'source_changed'
                item.revision += 1
                item.updated_at = now()
                item.payload = values['payload']
                item.content_hash = fingerprint
                item.decision = None
            continue
        state = 'ready' if values['source_kind'] == 'archive' else 'needs_review' if values['payload'].get('issues') else 'needs_mapping'
        item = ImportItem(job_id=job.id, content_hash=fingerprint, state=state,
                          created_at=now(), updated_at=now(), revision=1, **values)
        db.add(item)
    db.flush()


def source_for_item(db, item, play_id):
    """A re-import can reuse a play whose original source item belongs to an older job."""
    if play_id not in item.payload.get('applied_result', {}).get('play_ids', []):
        return None
    normalized = item.payload.get('normalized', {})
    if item.source_kind not in ('bgstats_play', 'bgg_play'):
        return None
    return db.scalar(select(PlaySource).where(PlaySource.play_id == play_id,
        PlaySource.provider == ('bgstats' if item.source_kind == 'bgstats_play' else 'bgg'),
        PlaySource.source_namespace == normalized.get('source_namespace'),
        PlaySource.source_play_id == normalized.get('source_id')))


def item_detail(db, item, actor):
    out = columns(item, ['id', 'source_kind', 'source_key', 'bgg_id', 'state', 'revision', 'content_hash', 'decision', 'error_code'])
    out['issues'] = item.payload.get('issues', [])
    out['normalized'] = item.payload.get('normalized', {})
    out['source'] = {'payload': item.payload.get('raw'), 'raw_xml': item.raw_xml}
    out['matches'] = []
    if item.bgg_id:
        game = db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id))
        if game and game.is_visible:
            out['matches'].append(columns(game, ['id', 'name', 'revision']))
    result = item.payload.get('applied_result', {})
    out['applied_result'] = result
    out['plays'] = []
    for identity in result.get('play_ids', []):
        obj = db.get(Play, identity)
        if obj and (obj.created_by == actor.id or plays.readable(db, obj, actor)):
            out['plays'].append(plays.detail(db, obj, actor, internal=True))
    return out


def decide_item(db, job, item, actor, payload):
    if job.params.get('purpose') == 'intake_preview':
        fail('use_intake_confirmation', 409)
    if job.state not in ('ready', 'partial', 'applied'):
        fail('job_busy', 409)
    check_revision(item, payload.expected_revision)
    action = payload.decision.action
    kinds = {'thing': {'create_game', 'update_game', 'skip'}, 'bgstats_game': {'create_game', 'update_game', 'skip'},
        'bgg_collection': {'create_inventory', 'link_inventory', 'skip'}, 'bgstats_copy': {'create_inventory', 'link_inventory', 'skip'},
        'bgg_play': {'create_play', 'link_play', 'update_play', 'skip'}, 'bgstats_play': {'create_play', 'link_play', 'update_play', 'skip'}}
    if action not in kinds.get(item.source_kind, set()):
        fail('decision_source_mismatch')
    if item.state in ('applied', 'linked') and action not in ('update_play', 'link_play', 'link_inventory', 'update_game', 'skip'):
        fail('source_already_applied', 409)
    if action in ('link_inventory', 'link_play', 'update_play', 'update_game') and not payload.decision.reason:
        fail('reason_required')
    item.decision = payload.decision.model_dump(mode='json')
    item.state, item.error_code = 'ready', None
    item.revision += 1
    item.updated_at = now()
    job.revision += 1
    job.updated_at = now()
    audit(db, item, actor, 'review_item', reason=payload.decision.reason)
    db.flush()
    return item


def lookup_mapping(db, provider, namespace, kind, external_id):
    return db.scalar(select(ImportMapping).where(ImportMapping.provider == provider,
        ImportMapping.source_namespace == namespace, ImportMapping.entity_type == kind, ImportMapping.external_id == str(external_id)))


def map_identity(db, actor, provider, namespace, kind, external_id, target_id, expected=None):
    field = {'game': 'target_game_id', 'player': 'target_person_id', 'location': 'target_location_id'}[kind]
    row = lookup_mapping(db, provider, namespace, kind, external_id)
    before = columns(row) if row else None
    if expected is not None:
        check_revision(row, expected)
    if row:
        if getattr(row, field) != target_id:
            # Automatic application only reuses a confirmed map. Explicit mapping
            # changes must have its current revision and are private to this dataset.
            if expected is None:
                fail('mapping_conflict', 409)
            setattr(row, field, target_id)
            row.revision += 1
            row.confirmed_by, row.updated_at = actor.id, now()
    else:
        row = ImportMapping(provider=provider, source_namespace=namespace, entity_type=kind, external_id=str(external_id),
            confirmed_by=actor.id, created_at=now(), updated_at=now(), revision=1, **{field: target_id})
        db.add(row)
    db.flush()
    if before is None or before[field] != target_id:
        audit(db, row, actor, 'confirm_mapping', before=before, after=columns(row))
    return row


def apply_mappings(db, job, actor, payload):
    check_revision(job, payload.expected_revision)
    if job.state not in ('ready', 'partial', 'applied'):
        fail('job_busy', 409)
    provider = 'bgstats' if job.kind == 'bgstats_file' else 'bgg'
    references = {'game': set(), 'player': set(), 'location': set()}
    for item in db.scalars(select(ImportItem).where(ImportItem.job_id == job.id, ImportItem.source_kind != 'archive')):
        normalized = item.payload.get('normalized', {})
        for key in ('game_ref', 'external_id'):
            if normalized.get(key) is not None:
                references['game'].add(str(normalized[key]))
        if item.bgg_id and provider == 'bgg':
            references['game'].add(str(item.bgg_id))
        for person in normalized.get('players', []):
            if not person.get('is_anonymous'):
                references['player'].add(str(person['source_player_ref']))
        if normalized.get('location_ref'):
            references['location'].add(str(normalized['location_ref']))
        for expansion in normalized.get('expansions', []):
            references['game'].add(str(expansion['game_ref']))
    for mapping in payload.items:
        if mapping.provider != provider or mapping.source_namespace != job.params['source_namespace']:
            fail('mapping_namespace_mismatch')
        if mapping.external_id not in references[mapping.entity_type]:
            fail('unknown_or_anonymous_source_reference')
        fields = [mapping.target_game_id, mapping.target_person_id, mapping.target_location_id]
        cls, target = {'game': (BoardGame, mapping.target_game_id), 'player': (Person, mapping.target_person_id),
                        'location': (Location, mapping.target_location_id)}[mapping.entity_type]
        if len([x for x in fields if x]) != 1 or not target:
            fail('mapping_target_mismatch')
        obj = get(db, cls, target, True)
        if (not obj.is_visible and obj.created_by != actor.id) or getattr(obj, 'merged_into_id', None):
            fail('not_found', 404)
        map_identity(db, actor, provider, mapping.source_namespace, mapping.entity_type, mapping.external_id, target,
                     mapping.mapping_revision)
    job.revision += 1
    job.updated_at = now()
    db.flush()


def schedule_apply(db, job, actor, payload):
    enabled(job.kind)
    check_revision(job, payload.expected_revision)
    if job.state not in ('ready', 'partial', 'applied'):
        fail('job_busy', 409)
    unique([i.id for i in payload.selection], 'duplicate_selection')
    for selection in payload.selection:
        item = private_item(db, job, selection.id, True)
        check_revision(item, selection.expected_revision)
        if item.decision is None or item.state != 'ready':
            fail('item_not_ready', 409)
    job.params = {**job.params, 'apply_selection': [i.model_dump() for i in payload.selection]}
    job.state, job.lease_owner, job.lease_expires_at = 'applying', None, None
    job.revision += 1
    job.updated_at = now()
    db.flush()


def provider_for(job):
    return 'bgstats' if job.kind == 'bgstats_file' else 'bgg'


def target_game(db, job, item, decision, actor):
    if decision.target_game_id:
        return catalog.game(db, decision.target_game_id, actor, usable=True, lock=True)
    if decision.play:
        return catalog.game(db, decision.play.game_id, actor, usable=True, lock=True)
    if decision.inventory:
        return catalog.game(db, decision.inventory.game_id, actor, usable=True, lock=True)
    normalized = item.payload['normalized']
    mapping = lookup_mapping(db, provider_for(job), job.params['source_namespace'], 'game', normalized.get('game_ref', normalized.get('external_id', item.source_key)))
    if mapping:
        return catalog.game(db, mapping.target_game_id, actor, usable=True, lock=True)
    if item.bgg_id:
        obj = db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id).with_for_update())
        if obj:
            return obj
    fail('game_mapping_required')


def import_game(db, job, item, actor, decision):
    projection = item.payload.get('projection') or item.payload['normalized'].get('projection', {})
    if decision.action == 'create_game':
        mapped = lookup_mapping(db, provider_for(job), job.params['source_namespace'], 'game',
            item.payload['normalized'].get('external_id', item.source_key))
        existing = get(db, BoardGame, mapped.target_game_id) if mapped else db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id)) if item.bgg_id else None
        if decision.target_game_id:
            existing = catalog.game(db, decision.target_game_id, actor, usable=True, lock=True)
            if item.source_kind == 'thing' and existing.bgg_id not in (None, item.bgg_id):
                fail('game_source_identity_conflict', 409)
        if existing:
            obj = existing
        else:
            form = decision.game or s.GameCreate(name=projection.get('name') or '未命名桌游', game_type=projection.get('game_type', 'base'))
            if item.source_kind == 'thing':
                form = form.model_copy(update={'bgg_id': item.bgg_id})
                obj = catalog.create_game(db, actor, form, source=item.payload)
                obj.bgg_raw_xml, obj.bgg_content_hash = item.raw_xml, item.content_hash
                obj.bgg_synced_at, obj.bgg_parser_version = now(), sources.PARSER_VERSION
                obj.bgg_request_params = {k: job.params[k] for k in ('ids',) if k in job.params}
            else:
                # BG Stats is an identity hint, not a fetched Thing response.
                form = form.model_copy(update={'bgg_id': None})
                obj = catalog.create_game(db, actor, form)
        map_identity(db, actor, provider_for(job), job.params['source_namespace'], 'game',
            item.payload['normalized'].get('external_id', item.source_key), obj.id)
    else:
        obj = target_game(db, job, item, decision, actor)
        admin(actor)
        check_revision(obj, decision.target_revision)
        if item.source_kind != 'thing' or obj.bgg_id not in (None, item.bgg_id):
            fail('standard_thing_binding_required')
        obj.bgg_id, obj.bgg_payload, obj.bgg_raw_xml = item.bgg_id, item.payload, item.raw_xml
        obj.bgg_synced_at, obj.bgg_content_hash, obj.bgg_parser_version = now(), item.content_hash, sources.PARSER_VERSION
        catalog.project_game(obj)
        touch(obj, actor)
    if item.source_kind == 'thing':
        for link in item.payload.get('raw', {}).get('children', []):
            attrs = link.get('attributes', {})
            if link.get('tag') != 'link' or attrs.get('type') != 'boardgameexpansion':
                continue
            candidate = db.scalar(select(BoardGame).where(BoardGame.bgg_id == sources.positive(attrs.get('id'))))
            if not candidate or candidate.id == obj.id:
                continue
            base_id, exp_id = (candidate.id, obj.id) if obj.game_type == 'expansion' else (obj.id, candidate.id)
            relation = db.get(ExpansionLink, (base_id, exp_id))
            if not relation:
                relation = ExpansionLink(base_game_id=base_id, expansion_game_id=exp_id, manual_decision='inherit',
                    note=None, updated_by=actor.id, updated_at=now(), revision=1)
                db.add(relation)
            relation.bgg_suggested = True
    item.target_game_id = obj.id
    audit(db, obj, actor, 'apply_source', reason=decision.reason, after={'source_item_id': item.id})
    return {'game_ids': [obj.id], **({'reused': True} if decision.action == 'create_game' and existing else {}),
            **({'updated': True} if decision.action == 'update_game' else {})}


def import_inventory(db, job, item, actor, decision):
    normalized = item.payload['normalized']
    provider, namespace, identity = provider_for(job), normalized['source_namespace'], normalized['source_id']
    if provider == 'bgstats':
        namespace = job.params['source_namespace']
    existing = list(db.scalars(select(InventorySource).where(InventorySource.provider == provider,
        InventorySource.source_namespace == namespace, InventorySource.source_id == identity).order_by(InventorySource.copy_index).with_for_update()))
    if existing:
        changed = any(source.content_hash != item.content_hash for source in existing)
        if changed and (decision.action != 'link_inventory' or len(existing) != 1 or normalized.get('quantity', 1) != 1):
            fail('source_changed', 409)
        for source in existing:
            box = get(db, Inventory, source.inventory_id, True)
            if not catalog.inventory_private(box, actor):
                fail('source_owned_elsewhere', 409)
            if decision.action == 'link_inventory':
                if decision.target_inventory_id != box.id:
                    fail('source_link_conflict', 409)
                check_revision(box, decision.target_revision)
            if changed:
                source.content_hash, source.source_item_id, source.updated_at = item.content_hash, item.id, now()
                box.source_snapshot, box.source_synced_at = item.payload['raw'], now()
                touch(box, actor)
        return {'inventory_ids': [x.inventory_id for x in existing], 'reused': True}
    game = target_game(db, job, item, decision, actor)
    if decision.action == 'link_inventory':
        box = get(db, Inventory, decision.target_inventory_id, True)
        if not catalog.inventory_private(box, actor):
            fail('own_inventory_only', 403)
        check_revision(box, decision.target_revision)
        if box.game_id != game.id or normalized.get('quantity', 1) != 1:
            fail('inventory_link_mismatch')
        boxes = [box]
    else:
        form = decision.inventory or s.InventoryCreate(game_id=game.id, owner_user_id=job.params['owner_user_id'],
                                                       quantity=normalized.get('quantity', 1), **normalized.get('inventory', {}))
        if not normalized.get('owned', True) and decision.inventory is None:
            fail('non_owned_copy_requires_explicit_inventory')
        if form.game_id != game.id or form.quantity != normalized.get('quantity', 1):
            fail('source_quantity_mismatch')
        boxes = catalog.create_inventory(db, actor, form, source='bgstats' if provider == 'bgstats' else 'bgg_collection')
    for index, box in enumerate(boxes, 1):
        box.source_snapshot, box.source_synced_at = item.payload['raw'], now()
        db.add(InventorySource(inventory_id=box.id, provider=provider, source_namespace=namespace, source_id=identity,
            copy_index=index, source_item_id=item.id, content_hash=item.content_hash, created_at=now(), updated_at=now()))
    item.target_inventory_id, item.target_game_id = boxes[0].id, game.id
    return {'inventory_ids': [b.id for b in boxes]}


def mapped_players(db, job, item, actor, decision):
    normalized = item.payload['normalized']
    choices = {c.source_slot: c for c in decision.players}
    unique([c.source_slot for c in decision.players], 'duplicate_source_slot')
    players, mapping_snapshot = [], []
    for source in normalized['players']:
        slot = source['source_slot']
        choice = choices.get(slot)
        if choice and (str(choice.source_player_ref) != str(source['source_player_ref']) or
            choice.is_anonymous != source['is_anonymous'] or
            choice.source_score_uuid and choice.source_score_uuid != source['source_score_uuid']):
            fail('source_slot_mismatch')
        base = {k: source.get(k) for k in ('seat_order', 'score', 'is_start_player', 'is_new_to_player', 'role_label')}
        base.update(rank=None, outcome=None, participant_kind=source.get('participant_kind', 'human'))
        if source['is_anonymous']:
            base.update(guest_key=source['guest_key'], display_name=choice.guest_label if choice else source.get('name') or '匿名玩家')
        else:
            mapped = lookup_mapping(db, provider_for(job), job.params['source_namespace'], 'player', source['source_player_ref'])
            if choice and choice.person_id:
                person = get(db, Person, choice.person_id, True)
                if not person.is_visible and person.created_by != actor.id:
                    fail('not_found', 404)
            elif mapped:
                person = get(db, Person, mapped.target_person_id, True)
                if not person.is_visible and person.created_by != actor.id:
                    fail('not_found', 404)
            elif choice and choice.create_person:
                person = catalog.new_person(db, actor, choice.create_person['display_name'], visible=False)
            else:
                fail('player_mapping_required', source_slot=slot)
            map_identity(db, actor, provider_for(job), job.params['source_namespace'], 'player', source['source_player_ref'], person.id)
            base['person_id'] = person.id
        players.append(base)
        mapping_snapshot.append(dict(source_slot=slot, source_player_ref=source['source_player_ref'],
            source_score_uuid=source.get('source_score_uuid'), person_id=base.get('person_id'), guest_key=base.get('guest_key')))
    return players, mapping_snapshot


def normalized_form(db, job, item, actor, decision):
    g = target_game(db, job, item, decision, actor)
    normalized = item.payload['normalized']
    if decision.play:
        if decision.play.game_id != g.id:
            fail('play_game_mismatch')
        return decision.play, []
    players, mapping = mapped_players(db, job, item, actor, decision)
    location_id = decision.location_id
    if decision.create_location:
        if set(decision.create_location) != {'name'}:
            fail('invalid_location_decision')
        existing = lookup_mapping(db, provider_for(job), job.params['source_namespace'], 'location', normalized.get('location_ref'))
        location_id = existing.target_location_id if existing else catalog.new_location(db, actor, decision.create_location['name'], False).id
    if location_id:
        location = get(db, Location, location_id)
        if not location.is_visible and location.created_by != actor.id:
            fail('not_found', 404)
        if normalized.get('location_ref'):
            map_identity(db, actor, provider_for(job), job.params['source_namespace'], 'location', normalized['location_ref'], location_id)
    expansions = []
    if decision.expansion_game_ids:
        expansion_ids = decision.expansion_game_ids
    else:
        expansion_ids = []
        for exp in normalized.get('expansions', []):
            match = lookup_mapping(db, provider_for(job), job.params['source_namespace'], 'game', exp['game_ref'])
            game = get(db, BoardGame, match.target_game_id) if match else db.scalar(select(BoardGame).where(BoardGame.bgg_id == exp['bgg_id'])) if exp['bgg_id'] else None
            if not game:
                fail('expansion_mapping_required')
            expansion_ids.append(game.id)
    expansions = [dict(game_id=i, compatibility_note=decision.compatibility_note) for i in expansion_ids]
    mode = normalized['competition_mode']
    teams, shared_score, cooperative_result = [], None, None
    resolved = False
    sources_people = normalized['players']
    if mode == 'individual' and normalized.get('source_result_valid'):
        resolved = True
        for player, source in zip(players, sources_people):
            player.update(outcome='win' if source.get('source_winner') is True else 'loss', rank=source.get('source_rank'))
    elif mode == 'team':
        buckets = {}
        for index, (player, source) in enumerate(zip(players, sources_people), 1):
            key = str(source.get('source_team') or '')
            if not key or key == '0':
                fail('team_assignment_requires_review')
            player.update(team_key=key, score=None)
            buckets.setdefault(key, []).append(source)
        for index, (key, members) in enumerate(buckets.items()):
            scores = {Decimal(m['score']) if m['score'] is not None else None for m in members}
            winners = {m.get('source_winner') for m in members}
            ranks = {m.get('source_rank') for m in members}
            teams.append(dict(client_key=key, name=key, sort_order=index,
                score=next(iter(scores)) if len(scores) == 1 else None,
                source_winner=next(iter(winners)) if len(winners) == 1 else None,
                source_rank=next(iter(ranks)) if len(ranks) == 1 else None))
        from app.services.boardgame_source_semantics import competitive_results
        resolved = competitive_results(teams, normalized['score_direction'], [])
        for team in teams:
            winner, rank = team.pop('source_winner'), team.pop('source_rank')
            team.update(outcome=('win' if winner is True else 'loss') if resolved else None, rank=rank if resolved else None)
    elif mode in ('solo', 'cooperative') and players:
        numbers = {Decimal(v) if v is not None else None for p in players for v in [p.pop('score', None)]}
        shared_score = next(iter(numbers)) if len(numbers) == 1 else None
        flags = {p.get('source_winner') for p in sources_people}
        if flags == {True}:
            resolved, cooperative_result = True, 'success'
        # All false can also mean no result was recorded, so failure stays unknown.
    elif mode == 'unscored':
        for player in players:
            player['score'] = None
    status = 'draft' if not normalized.get('played_on') or not players else 'abandoned' if normalized.get('incomplete') else 'completed'
    if status == 'abandoned':
        resolved, cooperative_result = False, None
        for unit in players + teams:
            unit.update(rank=None, outcome=None)
    variant = str(normalized.get('variant_key') or normalized.get('variant_label') or '')
    if len(variant) > 128:
        variant = digest(variant)
    values = dict(game_id=g.id, status=status, played_on=normalized.get('played_on'),
        started_at=normalized.get('started_at'), round_count=normalized.get('round_count'), note=normalized.get('note'),
        rules_snapshot={'variant_key': variant}, stats_exclusion=normalized.get('stats_exclusion', 'none'),
        exclusion_reason='来源明确排除统计' if normalized.get('stats_exclusion', 'none') != 'none' else None,
        duration_minutes=normalized.get('duration_minutes'), location_id=location_id,
        location_label=get(db, Location, location_id).name if location_id else normalized.get('location_name'),
        play_environment=normalized['play_environment'], competition_mode=mode,
        score_direction=normalized['score_direction'] if mode != 'unscored' else 'none',
        result_status='resolved' if resolved else 'unknown', result_source='source' if resolved else 'unknown',
        cooperative_result=cooperative_result, shared_score=shared_score, players=players, teams=teams, expansions=expansions)

    return s.PlayCreate.model_validate(values), mapping


def import_sheet(db, item, play, actor, slot_map):
    raw_sheet = item.payload['normalized'].get('scoresheet')
    if not raw_sheet:
        return
    from app.services.boardgame_scoresheet import save_sheet
    from app.core.exceptions import AppError
    from pydantic import ValidationError
    players, _, _ = plays.children(db, play)
    # slot_map is in original source order; normalized seats may differ.
    by_identity = {(p.person_id, p.guest_key): p for p in players}
    uuids = {m['source_score_uuid']: by_identity.get((m['person_id'], m['guest_key'])) for m in slot_map if m.get('source_score_uuid')}
    groups, subjects, cells = [], {}, []
    source_groups = raw_sheet.get('groups', raw_sheet.get('rounds', []))
    supported = play.competition_mode == 'individual' and isinstance(source_groups, list) and bool(uuids)
    if supported:
        for gi, group in enumerate(source_groups, 1):
            rows = []
            for ri, row in enumerate(group.get('rows', []), 1):
                key = f'group:{gi}/row:{ri}'
                rows.append(dict(key=key, label=row.get('label') or f'计分项 {ri}', is_aggregate=row.get('isTotal') is True))
                for uuid, value in row.get('scores', {}).items():
                    player = uuids.get(uuid)
                    if player is None:
                        supported = False
                        continue
                    subject_key = f'p:{player.id}'
                    subjects[subject_key] = dict(key=subject_key, kind='player', player_id=player.id)
                    try:
                        from decimal import Decimal
                        number = Decimal(str(value))
                        if not number.is_finite():
                            raise ValueError()
                        cell = dict(row_key=key, subject_key=subject_key, value_number=str(number))
                    except (ValueError, ArithmeticError):
                        cell = dict(row_key=key, subject_key=subject_key, value_text=str(value))
                    cells.append(cell)
            groups.append(dict(key=f'group:{gi}', label=group.get('label') or f'分组 {gi}', kind='round' if 'rounds' in raw_sheet else 'category', rows=rows))
    if supported:
        try:
            form = s.Sheet.model_validate(dict(groups=groups, subjects=list(subjects.values()), cells=cells,
                recorded_totals=[dict(subject_key=f'p:{p.id}', value_number=safe(p.score)) for p in players if f'p:{p.id}' in subjects]))
            with db.begin_nested():
                sheet = save_sheet(db, play, actor, form, 0, '导入原始计分表', parent_touched=True)
                sheet.source_item_id = item.id
                db.flush()
            return
        except (ValidationError, AppError):
            supported = False
    sheet = PlayScoresheet(**stamp(actor, play_id=play.id, source_item_id=item.id, schema_version=1,
        projection_version=1, play_revision=play.revision, parse_status='unsupported', template_key=None,
        display_data={}, issues=['source_sheet_requires_review'], content_hash=digest(raw_sheet)))
    db.add(sheet)
    db.flush()


def import_play(db, job, item, actor, decision):
    n = item.payload['normalized']
    provider, namespace, identity = provider_for(job), n['source_namespace'], n['source_id']
    existing = list(db.scalars(select(PlaySource).where(PlaySource.provider == provider, PlaySource.source_namespace == namespace,
        PlaySource.source_play_id == identity).order_by(PlaySource.segment_index).with_for_update()))
    if existing and decision.action == 'create_play':
        if any(s.content_hash != item.content_hash for s in existing):
            fail('source_changed', 409)
        if any(get(db, Play, s.play_id).created_by != actor.id for s in existing):
            fail('source_owned_elsewhere', 409)
        return {'play_ids': [s.play_id for s in existing], 'reused': True}
    if decision.action in ('link_play', 'update_play'):
        obj = get(db, Play, decision.target_play_id, True)
        if obj.created_by != actor.id and not plays.readable(db, obj, actor):
            fail('not_found', 404)
        check_revision(obj, decision.target_play_revision or decision.target_revision)
        if decision.action == 'update_play':
            if obj.publication_status != 'held' or obj.created_by != actor.id:
                fail('held_update_only', 403)
            if not existing or any(s.play_id != obj.id for s in existing):
                fail('source_update_target_mismatch')
            form, mapping = normalized_form(db, job, item, actor, decision)
            current = plays.to_input(db, obj)
            # Preserve source slots' existing row IDs where the identity is unchanged.
            by_identity = {(p.get('person_id'), p.get('guest_key')): p['id'] for p in current['players']}
            values = form.model_dump(mode='json')
            for p in values['players']:
                p['id'] = by_identity.get((p.get('person_id'), p.get('guest_key')))
            by_team = {t['name']: t['id'] for t in current['teams']}
            for team in values['teams']:
                team['id'] = by_team.get(team['name'])
            sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
            if sheet:
                if not decision.replace_scoresheet:
                    fail('source_sheet_update_requires_confirmation', 409)
                values.update(clear_scoresheet=True, sheet_revision=sheet.revision)
            patch = s.PlayPatch.model_validate(dict(**values, expected_revision=obj.revision, reason=decision.reason))
            plays.save_play(db, actor, patch, obj, internal=True)
            import_sheet(db, item, obj, actor, mapping)
            for source in existing:
                source.content_hash, source.source_item_id = item.content_hash, item.id
                source.last_applied_play_revision, source.updated_at = obj.revision, now()
                source.mapping_snapshot = {'players': mapping, 'identity_namespace': job.params['source_namespace']}
            return {'play_ids': [obj.id], 'updated': True}
        if target_game(db, job, item, decision, actor).id != obj.game_id:
            fail('play_game_mismatch')
        if existing:
            if any(s.play_id != obj.id for s in existing):
                fail('source_link_conflict', 409)
            return {'play_ids': [obj.id], 'reused': True}
        rows, mappings = [obj], [[]]
    else:
        if decision.segment_count != n.get('quantity', 1):
            fail('quantity_split_confirmation_required')
        if decision.segment_count > 1:
            if len(decision.segments) != decision.segment_count:
                fail('explicit_segments_required')
            game = target_game(db, job, item, decision, actor)
            if any(form.game_id != game.id for form in decision.segments):
                fail('play_game_mismatch')
            forms, mapping = decision.segments, []
            if decision.segment_player_slots:
                if len(decision.segment_player_slots) != len(forms):
                    fail('segment_slot_mismatch')
                source_players, source_mappings = mapped_players(db, job, item, actor, decision)
                slots = {row['source_slot']: (player, mapped) for row, player, mapped in zip(
                    n['players'], source_players, source_mappings)}
        else:
            if decision.segments or decision.segment_player_slots:
                fail('unexpected_segments')
            form, mapping = normalized_form(db, job, item, actor, decision)
            forms = [form]
        rows, mappings = [], []
        for index, form in enumerate(forms):
            clone = form.model_copy(deep=True)
            segment_mapping = mapping
            if decision.segment_player_slots:
                references = decision.segment_player_slots[index]
                if len(references) != len(clone.players) or len(references) > 100:
                    fail('segment_slot_mismatch')
                unique([slot for slot in references if slot is not None], 'duplicate_source_slot')
                segment_mapping = []
                for player, slot in zip(clone.players, references):
                    if slot is None:
                        continue
                    if slot not in slots:
                        fail('source_slot_mismatch')
                    source_player, mapped = slots[slot]
                    for key in ('id', 'person_id', 'user_id', 'guest_key'):
                        setattr(player, key, source_player.get(key))
                    player.display_name = source_player.get('display_name') or player.display_name
                    segment_mapping.append(mapped)
            if index:
                for p in clone.players:
                    if p.guest_key:
                        p.guest_key = uuid4()
            if decision.segment_player_slots:
                actual = {slot: player for slot, player in zip(decision.segment_player_slots[index], clone.players)
                          if slot is not None}
                segment_mapping = [{**mapped, 'guest_key': actual[mapped['source_slot']].guest_key}
                                   for mapped in segment_mapping]
                clone = s.PlayCreate.model_validate(clone.model_dump(mode='python'))
            obj = plays.save_play(db, actor, clone, internal=True, origin=provider)
            if decision.segment_count == 1:
                import_sheet(db, item, obj, actor, mapping)
            rows.append(obj)
            mappings.append(segment_mapping)
    for index, (obj, mapping) in enumerate(zip(rows, mappings), 1):
        db.add(PlaySource(play_id=obj.id, provider=provider, source_namespace=namespace, source_play_id=identity,
            segment_index=index, source_item_id=item.id, content_hash=item.content_hash, last_applied_play_revision=obj.revision,
            mapping_snapshot={'players': safe(mapping), 'identity_namespace': job.params['source_namespace']}, created_at=now(), updated_at=now()))
    db.flush()
    return {'play_ids': [p.id for p in rows]}


def apply_item(db, job, item, actor):
    decision = ImportDecision.model_validate(item.decision)
    if decision.action != 'skip' and not set(item.payload.get('issues', [])) <= set(decision.acknowledged_issues):
        fail('source_issues_unacknowledged')
    if decision.action == 'skip':
        result = {}
    elif decision.action in ('create_game', 'update_game'):
        result = import_game(db, job, item, actor, decision)
    elif decision.action in ('create_inventory', 'link_inventory'):
        result = import_inventory(db, job, item, actor, decision)
    else:
        result = import_play(db, job, item, actor, decision)
    # Snapshot the successful operation; a later un-applied decision must not
    # rewrite what the task's report says has already happened.
    result['operation'] = ('skipped' if decision.action == 'skip' else 'updated' if result.get('updated')
        else 'reused' if result.get('reused') else 'linked' if decision.action.startswith('link') else 'created')
    item.payload = {**item.payload, 'applied_result': result}
    item.state = 'skipped' if decision.action == 'skip' else 'linked' if decision.action.startswith('link') else 'applied'
    item.error_code, item.updated_at, item.revision = None, now(), item.revision + 1
    audit(db, item, actor, 'apply_item', reason=decision.reason, after=result)
    db.flush()
    return result

"""Private read models and explicit, revision-checked historical publication.

Source originals never leave the requesting account. Candidate matches are hints,
not identity assertions. Publishing uses a token covering the reviewed local play,
source item and mapping revisions, and runs in one transaction.
"""
from sqlalchemy import select, or_, func

from app.models.boardgame import (ImportItem, ImportMapping, Play, PlaySource, Person,
                                  BoardGame, Location, AuditEvent, PlayScoresheet)
from app.schemas.boardgame import PlayCreate
from app.services import boardgame_import as imports, boardgame_play as plays
from app.services.boardgame_common import columns, digest, get, check_revision, fail, audit, touch, now, safe


def mapping_stmt(job):
    return select(ImportMapping).where(ImportMapping.provider == imports.provider_for(job),
        ImportMapping.source_namespace == job.params['source_namespace'])


def mapping_detail(db, row, actor):
    result = columns(row)
    cls, identity = (BoardGame, row.target_game_id) if row.entity_type == 'game' else (
        Person, row.target_person_id) if row.entity_type == 'player' else (Location, row.target_location_id)
    target = db.get(cls, identity)
    readable = target and (target.is_visible or target.created_by == actor.id)
    result['target'] = dict(id=target.id, name=getattr(target, 'name', getattr(target, 'display_name', None)),
        revision=target.revision, user_id=getattr(target, 'user_id', None)) if readable else None
    return result


def review_token(db, job, item, obj):
    maps = list(db.execute(mapping_stmt(job).with_only_columns(ImportMapping.id, ImportMapping.revision)
        .order_by(ImportMapping.id)).all())
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
    people, _, _ = plays.children(db, obj)
    person_versions = list(db.execute(select(Person.id, Person.revision).where(
        Person.id.in_([p.person_id for p in people if p.person_id])).order_by(Person.id)).all())
    return digest(dict(job=job.id, actor=job.requested_by, item=(item.id, item.revision, item.content_hash),
        play=(obj.id, obj.revision, obj.publication_status), sheet=(sheet.id, sheet.revision) if sheet else None,
        mappings=[list(r) for r in maps], people=[list(r) for r in person_versions]))


def preview(db, job, item, actor):
    n = item.payload.get('normalized', {})
    maps = list(db.scalars(mapping_stmt(job).order_by(ImportMapping.id)))
    by_key = {(m.entity_type, m.external_id): m for m in maps}
    game_map = by_key.get(('game', str(n.get('game_ref', n.get('external_id', item.bgg_id)))))
    location_map = by_key.get(('location', str(n.get('location_ref'))))
    game_id = (item.decision or {}).get('target_game_id') or (game_map.target_game_id if game_map else None)
    if not game_id and item.bgg_id:
        game_id = db.scalar(select(BoardGame.id).where(BoardGame.bgg_id == item.bgg_id, BoardGame.is_visible.is_(True)))
    player_slots = []
    for player in n.get('players', []):
        match = by_key.get(('player', str(player['source_player_ref']))) if not player['is_anonymous'] else None
        player_slots.append({**player, 'mapping': mapping_detail(db, match, actor) if match else None})
    result = dict(item_id=item.id, revision=item.revision, source_hash=item.content_hash,
        normalized=n, player_slots=player_slots, mapped_game_id=game_id,
        location_mapping=mapping_detail(db, location_map, actor) if location_map else None,
        issues=item.payload.get('issues', []), same_source=[], candidates=[], applied_plays=[])
    if item.source_kind not in ('bgstats_play', 'bgg_play'):
        return result
    provider, namespace = imports.provider_for(job), n['source_namespace']
    source_rows = list(db.scalars(select(PlaySource).where(PlaySource.provider == provider,
        PlaySource.source_namespace == namespace, PlaySource.source_play_id == n['source_id'])))
    for source in source_rows:
        obj = db.get(Play, source.play_id)
        # A globally stable source ID may be encountered from another account;
        # do not reveal its play, owner, or revision in private import previews.
        if obj.created_by != actor.id:
            result['same_source'].append({'available': False, 'conflict': 'source_owned_elsewhere'})
            continue
        old_item = db.get(ImportItem, source.source_item_id)
        old = old_item.payload.get('normalized', {})
        result['same_source'].append(dict(play_id=obj.id, revision=obj.revision,
            publication_status=obj.publication_status, changed=source.content_hash != item.content_hash,
            locally_modified=obj.revision != source.last_applied_play_revision,
            differences=[dict(field=k, before=old.get(k), after=n.get(k)) for k in sorted(set(old) | set(n))
                if k not in ('identity_namespace', 'source_namespace') and old.get(k) != n.get(k)]))
    if game_id and n.get('played_on'):
        stmt = select(Play).where(Play.game_id == game_id, Play.played_on == n['played_on'],
            Play.status != 'voided', or_(Play.created_by == actor.id,
            (Play.publication_status == 'published') & (Play.status != 'draft'))).order_by(Play.id.desc()).limit(21)
        candidates = list(db.scalars(stmt))
        result['more_candidates'] = len(candidates) > 20
        expected_people = {m.target_person_id for p in n.get('players', [])
            if (m := by_key.get(('player', str(p['source_player_ref'])))) and not p['is_anonymous']}
        for obj in candidates[:20]:
            people, _, _ = plays.children(db, obj)
            actual_people = {p.person_id for p in people if p.person_id}
            result['candidates'].append(dict(id=obj.id, revision=obj.revision, played_on=safe(obj.played_on),
                game_name=obj.game_snapshot.get('name'), duration_minutes=obj.duration_minutes,
                players=[dict(name=p.display_name_snapshot, score=safe(p.score), outcome=p.outcome) for p in people],
                publication_status=obj.publication_status,
                match_basis=['same_game', 'same_date'] + (['same_mapped_players'] if expected_people and expected_people == actual_people else []),
                linked_to_source=any(s.play_id == obj.id for s in source_rows)))
    ids = set(item.payload.get('applied_result', {}).get('play_ids', []))
    for identity in sorted(ids):
        obj = db.get(Play, identity)
        if not obj or obj.created_by != actor.id:
            continue
        detail = plays.detail(db, obj, actor, internal=True)
        people, _, _ = plays.children(db, obj)
        unresolved = [p.display_name_snapshot for p in people if p.person_id and not db.get(Person, p.person_id).user_id]
        detail.update(publication_status=obj.publication_status, review_token=review_token(db, job, item, obj), unmatched_people=unresolved,
            can_publish=obj.publication_status == 'held' and obj.status in ('completed', 'abandoned'))
        result['applied_plays'].append(detail)
    return result


def report(db, job):
    counts = [dict(kind=kind, state=state, count=count) for kind, state, count in db.execute(
        select(ImportItem.source_kind, ImportItem.state, func.count()).where(ImportItem.job_id == job.id,
        ImportItem.source_kind != 'archive').group_by(ImportItem.source_kind, ImportItem.state))]
    errors = [dict(code=code, count=count) for code, count in db.execute(select(ImportItem.error_code, func.count())
        .where(ImportItem.job_id == job.id, ImportItem.error_code.is_not(None)).group_by(ImportItem.error_code))]
    # Reused source associations retain the first item's provenance. Count this
    # job's server-written application results, including repeated imports.
    outcomes = {key: dict(items=0, games=0, inventory=0, plays=0)
                for key in ('created', 'reused', 'linked', 'updated', 'skipped', 'legacy_unknown')}
    ids = set()
    for payload in db.scalars(select(ImportItem.payload).where(ImportItem.job_id == job.id)):
        result = payload.get('applied_result')
        if result is None:
            continue
        count = outcomes[result.get('operation', 'legacy_unknown')]
        count['items'] += 1
        for label, key in (('games','game_ids'), ('inventory','inventory_ids'), ('plays','play_ids')):
            count[label] += len(set(result.get(key, [])))
        ids.update(result.get('play_ids', []))
    ids = sorted(ids)
    published = {}
    for start in range(0, len(ids), 500):
        for state, count in db.execute(select(Play.publication_status, func.count()).where(
            Play.id.in_(ids[start:start+500]), Play.created_by == job.requested_by).group_by(Play.publication_status)):
            published[state] = published.get(state, 0) + count
    return dict(job=imports.job_detail(job), counts=counts, errors=errors, publication_counts=published,
        application_outcomes=outcomes,
        next_step='等待来源处理' if job.state in ('queued', 'fetching', 'parsing', 'applying', 'retry_wait') else
        '核对待匹配 / 失败条目；已保存历史保持私有，逐局确认后才公开',
        rules=dict(originals_private=True, automatic_publication=False, automatic_name_matching=False,
                   automatic_source_deletions=False))


def publish(db, job, actor, payload):
    check_revision(job, payload.expected_revision)
    if job.state not in ('ready', 'applied', 'partial'):
        fail('job_busy', 409)
    if len({s.play_id for s in payload.selection}) != len(payload.selection):
        fail('duplicate_selection')
    rows = []
    for selection in sorted(payload.selection, key=lambda s: s.play_id):
        item = imports.private_item(db, job, selection.item_id, True)
        obj = get(db, Play, selection.play_id, True)
        source = imports.source_for_item(db, item, obj.id)
        if not source or obj.created_by != actor.id:
            fail('not_found', 404)
        check_revision(obj, selection.expected_revision)
        if selection.review_token != review_token(db, job, item, obj):
            fail('review_changed', 409)
        if obj.publication_status != 'held' or obj.status not in ('completed', 'abandoned'):
            fail('historical_play_not_publishable', 409)
        form = PlayCreate.model_validate(plays.to_input(db, obj))
        plays.validate_context(db, actor, form, obj, internal=True)
        # Context validation acquires identity locks; reject mapping changes that
        # happened while those locks were being acquired.
        if selection.review_token != review_token(db, job, item, obj):
            fail('review_changed', 409)
        plays.result_preview(form, verify=True)
        if not payload.acknowledge_unmatched_people and any(p.person_id and not get(db, Person, p.person_id).user_id
            for p in form.players):
            fail('unmatched_people_confirmation_required')
        rows.append(obj)
    for obj in rows:
        obj.publication_status = 'published'
        touch(obj, actor)
        audit(db, obj, actor, 'publish_history', reason=payload.reason,
              before={'publication_status':'held'}, after={'publication_status':'published'})
    job.revision += 1
    job.updated_at = now()
    audit(db, job, actor, 'publish_history', reason=payload.reason, after={'play_ids':[p.id for p in rows]})
    db.flush()
    return [p.id for p in rows]

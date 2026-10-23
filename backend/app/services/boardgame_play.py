"""Play aggregates: permission checks, results and stable child-row updates."""

from copy import deepcopy
from uuid import uuid4

from sqlalchemy import delete, func, select

from app.models import Activity, User
from app.models.boardgame import (Play, PlayPlayer, PlayTeam, PlayExpansion, Person, Location, GamePlan,
    Ruleset, PlayScoresheet, ScoresheetCell, PlayReport, PlayObserver)
from app.schemas.boardgame import PlayCreate, PlayPatch
from app.services import boardgame_activity as activities, boardgame_catalog as catalog
from app.services.boardgame_common import (audit, check_revision, columns, digest, fail, get, member,
    now, safe, stamp, touch, unique, user_summary, TZ)

PLAY_FIELDS = ['id', 'game_id', 'activity_id', 'original_activity_id', 'plan_id', 'inventory_id', 'origin',
    'status', 'played_on', 'started_at', 'duration_minutes', 'location_label', 'location_id', 'play_environment',
    'competition_mode', 'score_direction', 'result_status', 'tie_policy', 'shared_score', 'cooperative_result',
    'rules_snapshot', 'comparison_key', 'game_snapshot', 'activity_snapshot', 'note', 'change_reason',
    'shared_score_status', 'end_reason', 'round_count', 'result_source', 'result_reason', 'tiebreak_applied',
    'stats_exclusion', 'exclusion_reason', 'timer_status', 'timer_elapsed_seconds', 'timer_resumed_at', 'timer_stopped_at',
    'created_at', 'updated_at', 'revision']


def can_edit(db, obj, actor):
    if actor.role not in ('user', 'admin'):
        return False
    if obj.created_by == actor.id or actor.role == 'admin':
        return True
    a = db.get(Activity, obj.activity_id) if obj.activity_id else None
    return bool(a and a.created_by == actor.id)


def readable(db, obj, actor):
    if obj.publication_status != 'published':
        return False
    return obj.status != 'draft' or can_edit(db, obj, actor)


def play(db, identity, actor, lock=False):
    obj = get(db, Play, identity, lock)
    if not readable(db, obj, actor):
        fail('not_found', 404)
    return obj


def children(db, obj):
    return (list(db.scalars(select(PlayPlayer).where(PlayPlayer.play_id == obj.id).order_by(PlayPlayer.seat_order))),
            list(db.scalars(select(PlayTeam).where(PlayTeam.play_id == obj.id).order_by(PlayTeam.sort_order, PlayTeam.id))),
            list(db.scalars(select(PlayExpansion).where(PlayExpansion.play_id == obj.id).order_by(
                PlayExpansion.sort_order, PlayExpansion.expansion_game_id))))


def to_input(db, obj):
    players, teams, expansions = children(db, obj)
    data = {k: getattr(obj, k) for k in PlayCreate.model_fields if hasattr(obj, k)}
    data['status'] = obj.status if obj.status != 'voided' else 'draft'
    rules = obj.rules_snapshot or {}
    from app.schemas.boardgame import DefaultRules
    data['rules_snapshot'] = {k: v for k, v in rules.items() if k in DefaultRules.model_fields}
    data['ruleset_id'] = rules.get('ruleset_id')
    data['teams'] = [dict(client_key=str(t.id), **columns(t, ['id', 'name', 'score', 'score_status', 'rank', 'outcome', 'sort_order'])) for t in teams]
    data['players'] = [dict(display_name=p.display_name_snapshot, team_key=str(p.team_id) if p.team_id else None,
        **columns(p, ['id', 'person_id', 'guest_key', 'seat_order', 'score', 'score_status', 'rank', 'outcome', 'is_start_player',
                       'role_label', 'is_new_to_player', 'participant_kind'])) for p in players]
    data['observers'] = [dict(display_name=p.display_name_snapshot, **columns(p,
        ['id', 'person_id', 'guest_key', 'observer_role'])) for p in db.scalars(select(PlayObserver).where(PlayObserver.play_id == obj.id))]
    data['expansions'] = [dict(game_id=e.expansion_game_id, **columns(e,
        ['inventory_id', 'modules_note', 'compatibility_note', 'sort_order'])) for e in expansions]
    return safe(data)


def result_preview(form, verify=False):
    """One result validator is used for suggestions and every persisted result."""
    data = form.model_dump()
    players, teams = data['players'], data['teams']
    mode, status, direction = data['competition_mode'], data['status'], data['score_direction']
    data['tiebreak_applied'] = False
    if data['stats_exclusion'] != 'none' and not data['exclusion_reason']:
        fail('exclusion_reason_required')
    def score_state(row, score_key='score', state_key='score_status'):
        state = row.get(state_key) or ('recorded' if row[score_key] is not None else 'unrecorded')
        if (state == 'recorded') != (row[score_key] is not None):
            fail('score_status_value_conflict')
        row[state_key] = state
    for row in players + teams:
        score_state(row)
        if row['score_status'] == 'gave_up' and status == 'completed':
            if row.get('outcome') not in (None, 'loss') or row.get('rank') is not None:
                fail('gave_up_cannot_win_or_rank')
            row['outcome'] = 'loss'
    score_state(data, 'shared_score', 'shared_score_status')
    if status == 'completed' and mode in ('solo', 'cooperative') and (
        data['shared_score_status'] == 'gave_up' or mode == 'solo' and any(p['score_status'] == 'gave_up' for p in players)):
        if data['cooperative_result'] not in (None, 'failure'):
            fail('gave_up_cannot_win')
        data['result_status'], data['cooperative_result'] = 'resolved', 'failure'
    if status == 'abandoned':
        data['end_reason'] = data.get('end_reason') or 'unfinished'
    elif data.get('end_reason') is not None:
        fail('end_reason_requires_abandoned')
    unique([p['seat_order'] for p in players], 'duplicate_seat')
    if sum(p['is_start_player'] is True for p in players) > 1:
        fail('multiple_start_players')
    unique([p['user_id'] for p in players if p.get('user_id')], 'duplicate_user')
    unique([p['person_id'] for p in players if p['person_id']], 'duplicate_person')
    unique([p['guest_key'] for p in players if p['guest_key']], 'duplicate_guest')
    unique([t['client_key'] for t in teams], 'duplicate_team')
    unique([p['id'] for p in players if p['id']], 'duplicate_player_id')
    unique([t['id'] for t in teams if t['id']], 'duplicate_team_id')
    if status != 'draft' and not players:
        fail('players_required')
    if mode == 'individual' and status == 'completed' and len(players) < 2:
        fail('individual_requires_two_players')
    if mode == 'solo' and (len(players) > 1 or (status != 'draft' and len(players) != 1)):
        fail('solo_requires_one_player')
    if mode != 'team' and (teams or any(p['team_key'] for p in players)):
        fail('teams_not_allowed')
    if mode == 'team':
        team_keys = {t['client_key'] for t in teams}
        if any(p['team_key'] not in team_keys for p in players):
            fail('invalid_team')
        if set(p['team_key'] for p in players) != team_keys:
            fail('empty_team')
        if status == 'completed' and len(teams) < 2:
            fail('team_requires_two_teams')
    competitive = mode in ('individual', 'team')
    if mode != 'individual' and any(p['score'] is not None or p['rank'] is not None or
        p['outcome'] is not None and not (p['score_status'] == 'gave_up' and p['outcome'] == 'loss') for p in players):
        fail('personal_result_not_allowed')
    if mode not in ('solo', 'cooperative') and (data['shared_score'] is not None or data['cooperative_result']):
        fail('shared_result_not_allowed')
    if mode == 'unscored' and (direction != 'none' or data['result_status'] != 'unknown'):
        fail('invalid_unscored_result')
    units = teams if mode == 'team' else players if mode == 'individual' else []
    resolved = data['result_status'] == 'resolved'
    if status == 'abandoned' and resolved:
        fail('abandoned_result_unknown')
    if not resolved:
        data['result_source'] = 'unknown'
        if data['cooperative_result'] or any(u['rank'] is not None or
            u['outcome'] and not (u['score_status'] == 'gave_up' and u['outcome'] == 'loss') for u in units):
            fail('unknown_result_has_outcome')
    elif mode in ('cooperative', 'solo'):
        if not data['cooperative_result']:
            fail('shared_result_required')
        data['result_source'] = 'source' if data['result_source'] == 'source' else 'manual_winner'
    elif competitive:
        if not units:
            fail('result_units_required')
        from app.services.boardgame_results import resolve_units
        resolve_units(data, units, verify)
    tied = sum(u.get('rank') == 1 for u in units) > 1
    return data, dict(suggested_players=safe(players), suggested_teams=safe(teams), requires_tie_decision=tied, issues=[])


def duplicate_candidates(db, form, actor, exclude_id=None):
    if not form.played_on or not form.players:
        return []
    stmt = select(Play).where(Play.game_id == form.game_id, Play.played_on == form.played_on,
        Play.publication_status == 'published', Play.status.in_(['completed', 'draft']))
    if exclude_id:
        stmt = stmt.where(Play.id != exclude_id)
    def identity(p):
        pid = p.person_id or (db.scalar(select(Person.id).where(Person.user_id == p.user_id)) if p.user_id else None)
        return ('p', pid) if pid else ('u', p.user_id) if p.user_id else ('g', str(p.guest_key))
    proposed = sorted(identity(p) for p in form.players)
    candidates = []
    current_game = catalog.display_games(db, {form.game_id}, actor).get(form.game_id)
    for obj in db.scalars(stmt.order_by(Play.id)):
        if not readable(db, obj, actor):
            continue
        people, _, _ = children(db, obj)
        identity = sorted(('p', p.person_id) if p.person_id else ('g', p.guest_key) for p in people)
        if identity == proposed and (form.activity_id is None or form.activity_id == obj.activity_id):
            candidates.append(dict(id=obj.id, game=current_game or obj.game_snapshot, played_on=safe(obj.played_on),
                player_names=[p.display_name_snapshot for p in people], revision=obj.revision))
    return candidates


def validate_context(db, actor, form, existing=None, internal=False):
    member(actor)
    # Native recording selects mini-program accounts. Imported references are
    # matched explicitly later and can still use their private person IDs.
    for player in sorted((p for p in [*form.players, *form.observers] if p.user_id), key=lambda p: p.user_id):
        user = get(db, User, player.user_id, True)
        person = catalog.provision_person(db, user)
        if person is None:
            fail('player_must_be_member')
        player.person_id, player.user_id = person.id, None
    game = catalog.game(db, form.game_id, actor, usable=not existing or existing.game_id != form.game_id, lock=True)
    if game.game_type == 'expansion' and not game.is_standalone:
        fail('expansion_not_standalone')
    if form.status != 'draft':
        if not form.played_on or form.played_on > now().date():
            fail('invalid_played_on')
    if form.started_at:
        if not form.started_at.tzinfo:
            fail('timezone_required')
        started = form.started_at.astimezone(TZ).replace(tzinfo=None)
        if form.played_on and started.date() != form.played_on:
            fail('date_time_mismatch')
        if form.status != 'draft' and started > now():
            fail('future_started_at')
    a = activities.activity(db, form.activity_id) if form.activity_id else None
    # Corrections to an already recorded result remain possible after check-in is
    # revoked. New records and draft completion recheck current eligibility.
    requires_record = not existing or existing.status == 'draft' or existing.activity_id != form.activity_id
    if a and requires_record and not internal:
        activities.require_record(db, a, actor)
    if not a and actor.role != 'admin' and not internal and not (existing and existing.origin in ('bgg', 'bgstats') and existing.created_by == actor.id):
        my_person = db.scalar(select(Person.id).where(Person.user_id == actor.id))
        if my_person is None or not any(p.person_id == my_person for p in [*form.players, *form.observers]):
            fail('standalone_must_include_self', 403)
    if form.plan_id:
        plan = get(db, GamePlan, form.plan_id, True)
        if plan.activity_id != form.activity_id or plan.game_id != form.game_id:
            fail('plan_context_mismatch')
    catalog.validate_box(db, form.inventory_id, form.game_id, actor)
    catalog.validate_expansions(db, actor, form.game_id, form.expansions)
    unique([p.person_id for p in [*form.players, *form.observers] if p.person_id], 'duplicate_person')
    unique([p.guest_key for p in [*form.players, *form.observers] if p.guest_key], 'duplicate_guest')
    existing_people = {p.person_id for p in children(db, existing)[0]} if existing else set()
    if existing:
        existing_people.update(db.scalars(select(PlayObserver.person_id).where(PlayObserver.play_id == existing.id)))
    for player in [*form.players, *form.observers]:
        if player.person_id:
            person = get(db, Person, player.person_id, True)
            if (not person.is_visible and person.id not in existing_people and (not internal or person.created_by != actor.id)) or person.merged_into_id:
                fail('invalid_person')
    if form.location_id:
        location = get(db, Location, form.location_id, True)
        if not location.is_visible and (not existing or existing.location_id != location.id) and (not internal or location.created_by != actor.id):
            fail('invalid_location')
    if form.ruleset_id:
        ruleset = get(db, Ruleset, form.ruleset_id)
        if ruleset.game_id != game.id or ruleset.configuration['expansion_ids'] != sorted(e.game_id for e in form.expansions):
            fail('ruleset_context_mismatch')
        rules = ruleset.configuration['rules']
        if rules['competition_mode'] != form.competition_mode or rules['score_direction'] != form.score_direction:
            fail('ruleset_mode_mismatch')
    return game, a


def update_children(db, obj, actor, data, replace_sheet=False, internal=False):
    old_players, old_teams, _ = children(db, obj)
    players_by_id, teams_by_id = {p.id: p for p in old_players}, {t.id: t for t in old_teams}
    for rows, known in ((data['players'], players_by_id), (data['teams'], teams_by_id)):
        if any(r.get('id') and r['id'] not in known for r in rows):
            fail('foreign_play_child')
    removed_players = set(players_by_id) - {p['id'] for p in data['players'] if p.get('id')}
    removed_teams = set(teams_by_id) - {t['id'] for t in data['teams'] if t.get('id')}
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
    if sheet and replace_sheet:
        db.execute(delete(ScoresheetCell).where(ScoresheetCell.sheet_id == sheet.id))
    elif sheet and (removed_players or removed_teams):
        if db.scalar(select(ScoresheetCell.id).where(ScoresheetCell.play_id == obj.id,
            (ScoresheetCell.player_id.in_(removed_players)) | (ScoresheetCell.team_id.in_(removed_teams))).limit(1)):
            fail('scoresheet_subject_in_use', 409)
    # Vacate unique seat/person slots before applying reorder or identity changes.
    for index, row in enumerate(old_players):
        row.seat_order = 100000 + index
        row.person_id, row.guest_key, row.team_id = None, str(uuid4()), None
    db.flush()
    for identity in removed_players:
        db.delete(players_by_id[identity])
    db.flush()
    team_keys = {}
    for entry in data['teams']:
        row = teams_by_id.get(entry.get('id')) or PlayTeam(play_id=obj.id)
        for key in ('name', 'score', 'score_status', 'rank', 'outcome', 'sort_order'):
            setattr(row, key, entry[key])
        db.add(row)
        db.flush()
        team_keys[entry['client_key']] = row.id
    for entry in data['players']:
        row = players_by_id.get(entry.get('id')) or PlayPlayer(play_id=obj.id)
        for key in ('person_id', 'guest_key', 'score', 'score_status', 'rank', 'outcome', 'seat_order',
                    'is_start_player', 'role_label', 'is_new_to_player', 'participant_kind'):
            value = entry[key]
            setattr(row, key, str(value) if key == 'guest_key' and value else value)
        row.team_id = team_keys.get(entry['team_key'])
        if row.person_id:
            person = get(db, Person, row.person_id)
            user = user_summary(db, person.user_id)
            row.display_name_snapshot = user['nickname'] if user else person.display_name
            row.avatar_snapshot = user['avatar_url'] if user else None
        else:
            row.display_name_snapshot, row.avatar_snapshot = entry['display_name'], None
        db.add(row)
    db.flush()
    for identity in removed_teams:
        db.delete(teams_by_id[identity])
    old_observers = {p.id: p for p in db.scalars(select(PlayObserver).where(PlayObserver.play_id == obj.id))}
    if any(p['id'] and p['id'] not in old_observers for p in data['observers']):
        fail('foreign_play_observer')
    for old in old_observers.values():
        old.person_id, old.guest_key = None, str(uuid4())
    db.flush()
    for entry in data['observers']:
        row = old_observers.pop(entry['id'], None) or PlayObserver(play_id=obj.id)
        row.person_id, row.guest_key = entry['person_id'], str(entry['guest_key']) if entry['guest_key'] else None
        row.observer_role = entry['observer_role']
        row.display_name_snapshot = get(db, Person, row.person_id).display_name if row.person_id else entry['display_name']
        db.add(row)
    for row in old_observers.values():
        db.delete(row)
    db.execute(delete(PlayExpansion).where(PlayExpansion.play_id == obj.id))
    for e in data['expansions']:
        db.add(PlayExpansion(play_id=obj.id, expansion_game_id=e['game_id'], game_snapshot=columns(
            catalog.game(db, e['game_id'], actor), catalog.GAME_PUBLIC), **{k: e[k] for k in (
                'inventory_id', 'modules_note', 'compatibility_note', 'sort_order')}))
    db.flush()


def save_play(db, actor, payload, existing=None, *, internal=False, origin='manual'):
    if existing:
        if not can_edit(db, existing, actor) and not internal:
            fail('play_edit_forbidden', 403)
        check_revision(existing, payload.expected_revision)
        if existing.status == 'voided':
            fail('voided_requires_restore', 409)
        if existing.status != 'draft' and not payload.reason:
            fail('reason_required')
        values = to_input(db, existing)
        values.update(payload.model_dump(exclude_unset=True, exclude={
            'expected_revision', 'reason', 'sheet', 'sheet_revision', 'clear_scoresheet'}))
        if existing.competition_mode == 'team' and ('teams' in payload.model_fields_set) != ('players' in payload.model_fields_set):
            fail('team_update_requires_players_and_teams')
        form = PlayCreate.model_validate(values)
    else:
        form = payload
        if any(p.id for p in [*form.players, *form.observers]) or any(t.id for t in form.teams):
            fail('new_play_cannot_reference_child_ids')
    g, a = validate_context(db, actor, form, existing, internal)
    data, _ = result_preview(form, verify=True)
    if existing:
        sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == existing.id))
        original = to_input(db, existing)
        # Carrying notes, inventory choices and list order are not scoring rules.
        changed_rules = any(original.get(k) != safe(data.get(k)) for k in
            ('game_id', 'competition_mode', 'score_direction', 'rules_snapshot', 'ruleset_id', 'tie_policy'))
        changed_rules |= sorted(e['game_id'] for e in original['expansions']) != sorted(e['game_id'] for e in data['expansions'])
        if sheet and changed_rules and payload.sheet is None and not payload.clear_scoresheet:
            fail('scoresheet_update_required', 409)
    if not internal and (not existing or existing.status == 'draft' and form.status == 'completed'):
        candidates = duplicate_candidates(db, form, actor, existing.id if existing else None)
        if not {c['id'] for c in candidates} <= set(form.duplicate_ack_ids):
            fail('duplicate_confirmation_required', 409, candidates=candidates)
    before = {'play': columns(existing, PLAY_FIELDS), 'participants': to_input(db, existing)} if existing else None
    previous_status = existing.status if existing else None
    obj = existing or Play(**stamp(actor, origin=origin, publication_status='held' if internal else 'published',
                                   stats_exclusion='none', game_snapshot={}))
    for key in PlayCreate.model_fields:
        if hasattr(Play, key) and key != 'rules_snapshot':
            value = data[key]
            if key == 'started_at' and value:
                value = value.astimezone(TZ).replace(tzinfo=None)
            setattr(obj, key, value)
    obj.tiebreak_applied = data['tiebreak_applied']
    if form.location_id:
        obj.location_label = get(db, Location, form.location_id).name
    rules = data['rules_snapshot']
    if form.ruleset_id:
        rules = get(db, Ruleset, form.ruleset_id).configuration['rules']
    obj.rules_snapshot = {**rules, 'competition_mode': form.competition_mode, 'score_direction': form.score_direction,
                          'ruleset_id': form.ruleset_id}
    if not existing or existing.game_id != form.game_id:
        obj.game_snapshot = columns(g, catalog.GAME_PUBLIC)
    # Existing game_id has already been assigned above; refresh when snapshot refers to another game.
    if obj.game_snapshot.get('id') != g.id:
        obj.game_snapshot = columns(g, catalog.GAME_PUBLIC)
    if a:
        obj.original_activity_id = a.id
        obj.activity_snapshot = dict(id=a.id, name=a.name, start_time=safe(a.start_time), end_time=safe(a.end_time))
    elif not existing or 'activity_id' in payload.model_fields_set:
        obj.original_activity_id, obj.activity_snapshot = None, None
    obj.comparison_key = digest(dict(game_id=g.id, rules={k: v for k, v in obj.rules_snapshot.items() if k != 'ruleset_id'},
        expansion_ids=sorted(e.game_id for e in form.expansions), player_count=len(form.players), tie_policy=form.tie_policy,
        team_sizes=sorted(sum(p.team_key == t.client_key for p in form.players) for t in form.teams)))
    obj.change_reason = getattr(payload, 'reason', None)
    if existing and obj.status != previous_status and obj.status in ('completed', 'abandoned') and obj.timer_status in ('running', 'paused'):
        settle_timer(obj, preserve_duration='duration_minutes' in payload.model_fields_set)
    if existing:
        touch(obj, actor)
    db.add(obj)
    db.flush()
    replacing = bool(existing and (payload.sheet is not None or payload.clear_scoresheet))
    if existing and payload.sheet and payload.clear_scoresheet:
        fail('sheet_and_clear_conflict')
    update_children(db, obj, actor, data, replacing, internal)
    from app.services.boardgame_scoresheet import refresh_sheet, save_sheet, clear_sheet
    if existing and payload.sheet:
        save_sheet(db, obj, actor, payload.sheet, payload.sheet_revision, payload.reason, parent_touched=True)
    elif existing and payload.clear_scoresheet:
        clear_sheet(db, obj, actor, payload.sheet_revision, payload.reason, parent_touched=True)
    else:
        refresh_sheet(db, obj)
    audit(db, obj, actor, 'edit' if existing else 'create', before, obj.change_reason,
          {'play': columns(obj, PLAY_FIELDS), 'participants': to_input(db, obj)})
    db.flush()
    return obj


def attach_display_games(db, rows, actor):
    ids = {r['game_id'] for r in rows}
    ids.update(e['expansion_game_id'] for r in rows for e in r['expansions'])
    games = catalog.display_games(db, ids, actor)
    for row in rows:
        row['game'] = games.get(row['game_id'], row['game_snapshot'])
        for expansion in row['expansions']:
            expansion['game'] = games.get(expansion['expansion_game_id'], expansion['game_snapshot'])
    return rows


def detail(db, obj, actor, internal=False, current_names=True):
    if not internal and not readable(db, obj, actor):
        fail('not_found', 404)
    out = columns(obj, PLAY_FIELDS)
    out['timer_current_seconds'] = obj.timer_elapsed_seconds + (
        max(0, int((now() - obj.timer_resumed_at).total_seconds())) if obj.timer_status == 'running' else 0)
    people, teams, expansions = children(db, obj)
    user_ids = dict(db.execute(select(Person.id, Person.user_id).where(Person.id.in_([p.person_id for p in people if p.person_id]))).all())
    users = {uid: user_summary(db, uid) for uid in set(user_ids.values()) if uid}
    editable = can_edit(db, obj, actor)
    out.update(players=[{**columns(p), 'user_id':user_ids.get(p.person_id),
                         'user': users.get(user_ids.get(p.person_id))} for p in people], teams=[columns(t) for t in teams],
        observers=[columns(p) for p in db.scalars(select(PlayObserver).where(PlayObserver.play_id == obj.id))],
        player_count=len(people), human_player_count=sum(p.participant_kind == 'human' for p in people),
        expansions=[columns(e) for e in expansions], created_by=user_summary(db, obj.created_by),
        permissions={'can_edit': editable, 'can_report': obj.publication_status == 'published' and (
            editable or actor.id in user_ids.values())},
        statistics_eligibility=dict(counts_as_play=obj.publication_status == 'published' and obj.status == 'completed'
            and obj.stats_exclusion != 'all', counts_for_win_rate=obj.publication_status == 'published' and
            obj.status == 'completed' and obj.stats_exclusion == 'none' and obj.competition_mode != 'unscored' and (
                obj.result_status == 'resolved' or any(p.score_status == 'gave_up' for p in people) or any(t.score_status == 'gave_up' for t in teams)),
            comparison_key=obj.comparison_key, reasons=[r for r, yes in (
                ('held', obj.publication_status == 'held'), ('not_completed', obj.status != 'completed'),
                ('unknown_result', obj.result_status == 'unknown'), ('excluded', obj.stats_exclusion != 'none')) if yes]),
        open_report_count=db.scalar(select(func.count()).select_from(PlayReport).where(
            PlayReport.play_id == obj.id, PlayReport.status == 'open')))
    return attach_display_games(db, [out], actor)[0] if current_names else out


def settle_timer(obj, preserve_duration=False):
    moment = now()
    if obj.timer_status == 'running':
        obj.timer_elapsed_seconds += max(0, int((moment - obj.timer_resumed_at).total_seconds()))
    if obj.timer_elapsed_seconds > 6000000:
        fail('timer_duration_too_large')
    obj.timer_status, obj.timer_resumed_at, obj.timer_stopped_at = 'stopped', None, moment
    if not preserve_duration:
        obj.duration_minutes = (obj.timer_elapsed_seconds + 59) // 60 or None


def timer_action(db, obj, actor, payload):
    if not can_edit(db, obj, actor):
        fail('play_edit_forbidden', 403)
    check_revision(obj, payload.expected_revision)
    if obj.status in ('voided', 'abandoned'):
        fail('timer_requires_active_play', 409)
    if obj.status != 'draft' and not payload.reason:
        fail('reason_required')
    allowed = {'start': ('idle',), 'pause': ('running',), 'resume': ('paused',),
               'stop': ('running', 'paused'), 'restore': ('stopped',)}
    if obj.timer_status not in allowed[payload.action]:
        fail('timer_state_conflict', 409, current_timer_status=obj.timer_status)
    before = columns(obj, PLAY_FIELDS)
    moment = now()
    if obj.timer_status == 'running':
        obj.timer_elapsed_seconds += max(0, int((moment - obj.timer_resumed_at).total_seconds()))
        if obj.timer_elapsed_seconds > 6000000:
            fail('timer_duration_too_large')
    if payload.action in ('start', 'resume'):
        obj.timer_status, obj.timer_resumed_at = 'running', moment
        if payload.action == 'start' and obj.started_at is None:
            obj.started_at, obj.played_on = moment, moment.date()
    else:
        obj.timer_status, obj.timer_resumed_at = ('stopped' if payload.action == 'stop' else 'paused'), None
    if payload.action == 'stop':
        obj.timer_stopped_at = moment
        obj.duration_minutes = (obj.timer_elapsed_seconds + 59) // 60 or None
    elif payload.action == 'restore':
        obj.timer_stopped_at = None
    touch(obj, actor)
    from app.services.boardgame_scoresheet import refresh_sheet
    refresh_sheet(db, obj)
    audit(db, obj, actor, 'timer_' + payload.action, before, payload.reason, columns(obj, PLAY_FIELDS))
    db.flush()
    return obj


def change_status(db, obj, actor, payload, action):
    if not can_edit(db, obj, actor):
        fail('play_edit_forbidden', 403)
    check_revision(obj, payload.expected_revision)
    if action == 'void':
        if not payload.reason:
            fail('reason_required')
        obj.status = 'voided'
        if obj.timer_status in ('running', 'paused'):
            settle_timer(obj)
        touch(obj, actor)
        audit(db, obj, actor, 'void', reason=payload.reason)
        db.flush()
        return obj
    target = payload.target_status if action == 'restore' else {'complete': 'completed', 'abandon': 'abandoned'}[action]
    if action == 'restore':
        if obj.status != 'voided':
            fail('not_voided', 409)
        obj.status = 'draft'
    values = payload.model_dump(exclude_unset=True, exclude={'target_status'})
    values['status'] = target
    if target == 'abandoned':
        current = to_input(db, obj)
        values.update(result_status='unknown', result_source='unknown', result_reason=None, cooperative_result=None)
        for key in ('players', 'teams'):
            values[key] = values.get(key, current[key])
            for row in values[key]:
                row['rank'], row['outcome'] = None, None
    else:
        values['end_reason'] = None
    return save_play(db, actor, PlayPatch.model_validate(values), obj)


def copy_play(db, obj, actor, activity_id=None):
    data = to_input(db, obj)
    data.update(activity_id=activity_id, plan_id=None, status='draft', played_on=None, started_at=None,
                duration_minutes=None, result_status='unknown', shared_score=None, shared_score_status='unrecorded',
                end_reason=None, cooperative_result=None, result_source='auto', result_reason=None, round_count=None)
    for p in data['players']:
        p.update(id=None, score=None, score_status='unrecorded', rank=None, outcome=None)
        if p['guest_key']:
            p['guest_key'] = str(uuid4())
    for t in data['teams']:
        t.update(id=None, score=None, score_status='unrecorded', rank=None, outcome=None)
    for observer in data['observers']:
        observer['id'] = None
        if observer['guest_key']:
            observer['guest_key'] = str(uuid4())
    return save_play(db, actor, PlayCreate.model_validate(data))

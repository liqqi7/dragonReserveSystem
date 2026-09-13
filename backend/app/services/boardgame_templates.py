"""Selectable immutable template versions and generic sheet generation."""

from sqlalchemy import select

from app.models.boardgame import PlayExpansion, PlayPlayer, PlayTeam, ScoresheetTemplate
from app.schemas.boardgame import Sheet, SheetGroup, SheetRow, SheetSubject
from app.services.boardgame_common import admin, audit, columns, digest, fail, get, stamp, unique
from app.services.boardgame_scoresheet import definition


def matches(selection, expansions, variant, player_count, mode):
    return (sorted(selection.get('expansion_ids', [])) == sorted(expansions)
            and selection.get('variant_key', '') == variant
            and (not selection.get('min_players') or player_count >= selection['min_players'])
            and (not selection.get('max_players') or player_count <= selection['max_players'])
            and (not selection.get('mode') or selection['mode'] == mode))


def template_detail(obj):
    return columns(obj, ['id', 'game_id', 'name', 'template_family', 'version_number', 'semantic_version',
                         'selection', 'sheet_definition', 'is_active', 'revision'])


def create_template(db, actor, payload):
    admin(actor)
    from app.services.boardgame_catalog import game, validate_expansions
    from app.schemas.boardgame import Expansion
    game(db, payload.game_id, actor, usable=True, lock=True)
    selected = payload.selection
    validate_expansions(db, actor, payload.game_id, [Expansion(game_id=g) for g in selected.expansion_ids])
    if selected.min_players and selected.max_players and selected.min_players > selected.max_players:
        fail('invalid_template_player_range')
    form = payload.definition.model_copy(deep=True)
    if form.subjects or form.cells or form.recorded_totals or form.template_id:
        fail('template_must_not_contain_play_data')
    form.schema_version, form.template_family, form.template_version = 2, payload.template_family, payload.version_number
    form.template_key, form.apply_totals = payload.template_family, True
    from app.services.boardgame_calculation import calculate
    form, _ = calculate(form)
    unique(payload.additive_row_keys, 'duplicate_additive_row')
    additive = {r.key for g in form.groups for r in g.rows if r.contributes and not r.is_aggregate and r.kind != 'text' and not r.repeat_of}
    if not set(payload.additive_row_keys) <= additive or payload.additive_row_keys and form.scoring_method in ('best_round', 'rounds_won'):
        fail('invalid_additive_rows')
    existing = db.scalar(select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == payload.game_id,
        ScoresheetTemplate.template_family == payload.template_family, ScoresheetTemplate.version_number == payload.version_number))
    if existing:
        fail('template_version_exists', 409, template_id=existing.id)
    defined = definition(form)
    obj = ScoresheetTemplate(**stamp(actor, game_id=payload.game_id, name=payload.name,
        template_family=payload.template_family, version_number=payload.version_number,
        definition=defined, definition_hash=digest(defined), semantic_version=payload.semantic_version,
        selection=selected.model_dump(mode='json'), sheet_definition=form.model_dump(mode='json'),
        additive_row_keys=payload.additive_row_keys, is_active=True))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create_template', after=template_detail(obj))
    return obj


def validate_selection(db, play, form):
    template = get(db, ScoresheetTemplate, form.template_id)
    if not template.sheet_definition or template.game_id != play.game_id:
        fail('template_game_mismatch')
    expansions = list(db.scalars(select(PlayExpansion.expansion_game_id).where(PlayExpansion.play_id == play.id)))
    player_count = len(list(db.scalars(select(PlayPlayer.id).where(PlayPlayer.play_id == play.id))))
    if not matches(template.selection, expansions, play.rules_snapshot.get('variant_key', ''), player_count, play.competition_mode):
        fail('template_context_mismatch')
    # Repeated rows can vary in count; their inherited semantics are validated by calculate().
    reference = Sheet.model_validate(template.sheet_definition)
    candidate = form.model_copy(deep=True)
    for group in candidate.groups:
        group.rows = [row for row in group.rows if row.repeat_of is None]
    if definition(candidate) != definition(reference):
        fail('template_definition_changed')
    return template


def make_sheet(db, play, payload):
    if (payload.template_id is None) == (payload.builtin is None):
        fail('choose_template_or_builtin')
    if payload.template_id:
        template = get(db, ScoresheetTemplate, payload.template_id)
        if not template.is_active or not template.sheet_definition:
            fail('template_unavailable')
        form = Sheet.model_validate(template.sheet_definition)
        form.template_id = template.id
    else:
        rounds = payload.builtin == 'rounds'
        form = Sheet(schema_version=2, sheet_type=payload.builtin, scoring_method=payload.scoring_method,
            apply_totals=True, groups=[SheetGroup(key=f'round:{i+1}' if rounds else 'categories',
                label=f'第 {i+1} 轮' if rounds else '分项', kind='round' if rounds else 'category',
                rows=[SheetRow(key=f'round:{i+1}/points' if rounds else 'points', label='得分', repeatable=True)])
                for i in range(payload.round_count if rounds else 1)], subjects=[], cells=[])
    if play.competition_mode == 'individual':
        form.subjects = [SheetSubject(key=f'p:{p.id}', kind='player', player_id=p.id)
            for p in db.scalars(select(PlayPlayer).where(PlayPlayer.play_id == play.id).order_by(PlayPlayer.seat_order))]
    elif play.competition_mode == 'team':
        form.subjects = [SheetSubject(key=f't:{t.id}', kind='team', team_id=t.id)
            for t in db.scalars(select(PlayTeam).where(PlayTeam.play_id == play.id).order_by(PlayTeam.sort_order, PlayTeam.id))]
    elif play.competition_mode in ('solo', 'cooperative'):
        form.subjects = [SheetSubject(key='shared', kind='shared')]
    else:
        fail('choose_scoring_mode_for_sheet')
    if not form.subjects:
        fail('players_required')
    if payload.template_id:
        validate_selection(db, play, form)
    return form

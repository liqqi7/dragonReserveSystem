"""Validated score sheets and rebuildable numeric projections."""

from decimal import Decimal

from sqlalchemy import delete, select

from app.models.boardgame import PlayPlayer, PlayTeam, PlayScoresheet, ScoresheetCell, ScoresheetTemplate
from app.schemas.boardgame import Sheet, PlayCreate
from app.services.boardgame_common import admin, audit, check_revision, columns, digest, fail, safe, stamp, touch, unique


def definition(form):
    result = {'schema_version': form.schema_version, 'groups': [dict(key=g.key, kind=g.kind,
        rows=[dict(key=r.key, is_aggregate=r.is_aggregate) for r in g.rows]) for g in form.groups]}
    if form.schema_version == 2:
        result.update(sheet_type=form.sheet_type, scoring_method=form.scoring_method,
                      template_family=form.template_family, template_version=form.template_version)
        result['groups'] = [dict(key=g.key, kind=g.kind,
            rows=[r.model_dump(mode='json', exclude={'label'}) for r in g.rows if r.repeat_of is None]) for g in form.groups]
    return result


def validate_sheet(db, play, form, check_totals=True):
    players = {p.id: p for p in db.scalars(select(PlayPlayer).where(PlayPlayer.play_id == play.id))}
    teams = {t.id: t for t in db.scalars(select(PlayTeam).where(PlayTeam.play_id == play.id))}
    unique([g.key for g in form.groups], 'duplicate_group_key')
    all_rows = [(g, r) for g in form.groups for r in g.rows]
    if len(all_rows) > 500:
        fail('too_many_sheet_rows')
    unique([r.key for _, r in all_rows], 'duplicate_row_key')
    unique([s.key for s in form.subjects], 'duplicate_subject_key')
    unique([(c.row_key, c.subject_key) for c in form.cells], 'duplicate_cell')
    unique([t.subject_key for t in form.recorded_totals], 'duplicate_total')
    rows = {r.key: (i, g, r) for i, (g, r) in enumerate(all_rows)}
    subjects = {}
    expected_kind = {'individual': 'player', 'team': 'team', 'cooperative': 'shared', 'solo': 'shared'}.get(play.competition_mode)
    for subject in form.subjects:
        if subject.kind != expected_kind:
            fail('sheet_subject_mode_mismatch')
        if subject.kind == 'player':
            if subject.player_id not in players or subject.team_id or subject.key != f'p:{subject.player_id}':
                fail('foreign_sheet_player')
            score = players[subject.player_id].score
        elif subject.kind == 'team':
            if subject.team_id not in teams or subject.player_id or subject.key != f't:{subject.team_id}':
                fail('foreign_sheet_team')
            score = teams[subject.team_id].score
        else:
            if subject.player_id or subject.team_id or subject.key != 'shared':
                fail('invalid_shared_subject')
            score = play.shared_score
        subjects[subject.key] = (subject, score)
    for c in form.cells:
        if c.row_key not in rows or c.subject_key not in subjects:
            fail('unknown_cell_reference')
    for total in form.recorded_totals:
        if total.subject_key not in subjects:
            fail('unknown_total_subject')
        score = subjects[total.subject_key][1]
        if check_totals and score != total.value_number:
            fail('final_score_conflict', 409, subject_key=total.subject_key)
    return rows, subjects


def calculated(db, play, form):
    from app.services.boardgame_calculation import calculate
    _, subjects = validate_sheet(db, play, form, check_totals=False)
    excluded = []
    for key, (subject, _) in subjects.items():
        status = db.get(PlayPlayer, subject.player_id).score_status if subject.kind == 'player' else db.get(PlayTeam, subject.team_id).score_status if subject.kind == 'team' else play.shared_score_status
        if status not in ('recorded', 'unrecorded'):
            excluded.append(key)
    return calculate(form, play.score_direction, excluded)


def apply_totals(db, play, form):
    """The enclosing request owns the single play/sheet transaction and revision."""
    from app.services import boardgame_play as plays
    values = {t.subject_key: t.value_number for t in form.recorded_totals}
    players, teams, _ = plays.children(db, play)
    expected = {f'p:{p.id}' for p in players} if play.competition_mode == 'individual' else {f't:{t.id}' for t in teams} if play.competition_mode == 'team' else {'shared'}
    if set(values) != expected:
        fail('auto_sheet_requires_all_subjects')
    for subject in form.subjects:
        row = db.get(PlayPlayer, subject.player_id) if subject.kind == 'player' else db.get(PlayTeam, subject.team_id) if subject.kind == 'team' else play
        score_key, state_key = ('shared_score', 'shared_score_status') if subject.kind == 'shared' else ('score', 'score_status')
        if getattr(row, state_key) in ('recorded', 'unrecorded'):
            setattr(row, score_key, values[subject.key])
            setattr(row, state_key, 'recorded' if values[subject.key] is not None else 'unrecorded')
    data = plays.to_input(db, play)
    data['result_source'], data['result_reason'] = 'auto', None
    for unit in data['players'] + data['teams']:
        unit['rank'], unit['outcome'] = None, None
    units = teams if play.competition_mode == 'team' else players
    if play.competition_mode in ('individual', 'team'):
        active = [u for u in units if u.score_status != 'gave_up']
        ready = form.scoring_method != 'scores_only' and play.score_direction in ('high', 'low') and all(u.score is not None for u in active)
        data['result_status'] = 'resolved' if ready and play.status != 'abandoned' else 'unknown'
    elif form.scoring_method == 'scores_only':
        data['result_status'], data['cooperative_result'] = 'unknown', None
    result, _ = plays.result_preview(PlayCreate.model_validate(data))
    for key in ('result_status', 'result_source', 'result_reason', 'tiebreak_applied', 'cooperative_result'):
        setattr(play, key, result[key])
    for entries, cls in ((result['players'], PlayPlayer), (result['teams'], PlayTeam)):
        for entry in entries:
            row = db.get(cls, entry['id'])
            row.rank, row.outcome = entry['rank'], entry['outcome']


def project(db, play, sheet, form):
    rows, subjects = validate_sheet(db, play, form)
    db.execute(delete(ScoresheetCell).where(ScoresheetCell.sheet_id == sheet.id))
    review = db.scalar(select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == play.game_id,
                        ScoresheetTemplate.definition_hash == digest(definition(form))))
    sheet.sheet_comparison_key = digest(dict(comparison_key=play.comparison_key, definition=review.definition_hash,
        semantic_version=review.semantic_version)) if review else None
    sheet.play_revision = play.revision
    sheet.projection_version += 1
    provided = {(c.row_key, c.subject_key): c for c in form.cells}
    if len(rows) * len(subjects) > 20000:
        fail('too_many_projected_cells')
    for row_key, (order, group, row) in rows.items():
        if row.repeat_of:
            continue
        for subject_key, (subject, _) in subjects.items():
            cell = provided.get((row_key, subject_key))
            value = cell.value_number if cell else None
            repeats = [r.key for _, _, r in rows.values() if r.repeat_of == row_key]
            if repeats:
                values = [value] + [provided[(key, subject_key)].value_number if (key, subject_key) in provided else None for key in repeats]
                value = sum(values, Decimal(0)) if all(v is not None for v in values) else None
            db.add(ScoresheetCell(sheet_id=sheet.id, play_id=play.id, row_key=row.key, group_key=group.key,
                row_label=row.label, row_order=order, subject_kind=subject.kind, subject_key=subject.key,
                player_id=subject.player_id, team_id=subject.team_id, value_number=value,
                value_text=cell.value_text if cell else None, is_aggregate=row.is_aggregate, projection_version=sheet.projection_version))
    db.flush()


def refresh_sheet(db, play):
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == play.id))
    if sheet and sheet.parse_status == 'parsed':
        project(db, play, sheet, Sheet.model_validate(sheet.display_data))


def save_sheet(db, play, actor, form, expected, reason=None, parent_touched=False):
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == play.id).with_for_update())
    check_revision(sheet, expected)
    if play.status != 'draft' and not reason:
        fail('reason_required')
    if form.schema_version == 2:
        if form.template_id:
            from app.services.boardgame_templates import validate_selection
            validate_selection(db, play, form)
        form, _ = calculated(db, play, form)
        if form.apply_totals:
            apply_totals(db, play, form)
    elif form.apply_totals:
        fail('automatic_sheet_requires_schema_2')
    validate_sheet(db, play, form)
    if not parent_touched:
        touch(play, actor)
    if sheet:
        touch(sheet, actor)
    else:
        sheet = PlayScoresheet(**stamp(actor, play_id=play.id, schema_version=form.schema_version,
            projection_version=1, play_revision=play.revision))
        db.add(sheet)
    sheet.template_key, sheet.parse_status = form.template_key, 'parsed'
    sheet.schema_version = form.schema_version
    sheet.display_data = form.model_dump(mode='json')
    sheet.content_hash = digest(sheet.display_data)
    sheet.issues = []
    db.flush()
    project(db, play, sheet, form)
    audit(db, play, actor, 'save_scoresheet', reason=reason,
          after={'sheet_id': sheet.id, 'sheet_revision': sheet.revision, 'content_hash': sheet.content_hash})
    return sheet


def clear_sheet(db, play, actor, expected, reason=None, parent_touched=False):
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == play.id).with_for_update())
    if not sheet:
        fail('not_found', 404)
    check_revision(sheet, expected)
    if not reason:
        fail('reason_required')
    db.execute(delete(ScoresheetCell).where(ScoresheetCell.sheet_id == sheet.id))
    audit(db, play, actor, 'clear_scoresheet', reason=reason, before={'content_hash': sheet.content_hash})
    db.delete(sheet)
    if not parent_touched:
        touch(play, actor)
    db.flush()


def review_template(db, play, actor, payload):
    admin(actor)
    check_revision(play, payload.expected_revision)
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == play.id).with_for_update())
    if not sheet or sheet.parse_status != 'parsed':
        fail('parsed_sheet_required')
    check_revision(sheet, payload.sheet_revision)
    form = Sheet.model_validate(sheet.display_data)
    defined = definition(form)
    row_keys = {r.key for g in form.groups for r in g.rows if not r.is_aggregate and r.contributes and r.kind != 'text' and not r.repeat_of}
    unique(payload.additive_row_keys, 'duplicate_additive_row')
    if not set(payload.additive_row_keys) <= row_keys or payload.additive_row_keys and form.scoring_method in ('best_round', 'rounds_won'):
        fail('invalid_additive_rows')
    fingerprint = digest(defined)
    review = db.scalar(select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == play.game_id,
                       ScoresheetTemplate.definition_hash == fingerprint).with_for_update())
    if review:
        if review.semantic_version != payload.semantic_version or review.additive_row_keys != payload.additive_row_keys:
            fail('template_already_reviewed', 409, template_id=review.id)
    else:
        review = ScoresheetTemplate(**stamp(actor, game_id=play.game_id, definition=defined,
            definition_hash=fingerprint, semantic_version=payload.semantic_version, additive_row_keys=payload.additive_row_keys))
        db.add(review)
        db.flush()
    touch(play, actor)
    touch(sheet, actor)
    project(db, play, sheet, form)
    audit(db, play, actor, 'review_template', reason=payload.reason, after={'template_id': review.id})
    return sheet


def detail(db, play, sheet):
    form = Sheet.model_validate(sheet.display_data) if sheet.parse_status == 'parsed' else None
    review = db.scalar(select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == play.game_id,
        ScoresheetTemplate.definition_hash == digest(definition(form)))) if form else None
    out = columns(sheet, ['id', 'play_id', 'revision', 'play_revision', 'schema_version', 'projection_version',
                         'parse_status', 'template_key', 'sheet_comparison_key'])
    out.update(sheet.display_data if form else dict(groups=[], subjects=[], cells=[], recorded_totals=[]))
    out['template_review'] = columns(review, ['id', 'semantic_version', 'additive_row_keys', 'revision']) if review else None
    out['warnings'] = sheet.issues
    if form and form.schema_version == 2:
        _, summary = calculated(db, play, form)
        out['calculation'] = safe(summary)
    return out

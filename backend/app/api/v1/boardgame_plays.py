"""Published play aggregates and scoresheets. Imports use their own private routes."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.boardgame_deps import enabled, body_limit, write_db
from app.api.deps import get_current_user
from app.api.v1.boardgames import created
from app.core.database import get_db
from app.models import Activity, User
from app.models.boardgame import BoardGame, Play, PlayPlayer, PlayReport, PlayScoresheet, ScoresheetTemplate, Person, AuditEvent
from app.schemas import boardgame as s
from app.services import boardgame_play as p, boardgame_scoresheet as sheets, boardgame_statistics as stats
from app.services.boardgame_common import audit, check_revision, columns, fail, get, member, now, page, safe, user_summary

router = APIRouter(tags=['boardgame-plays'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.get('/boardgame-plays/options')
def play_options(actor: User = Depends(get_current_user)):
    return {
        'score_statuses': [
            {'value': code, 'label': label, 'requires_score': code == 'recorded'}
            for code, label in [('unrecorded', '未填写'), ('recorded', '已记分'),
                                ('gave_up', '摆烂不算分了'), ('unfinished', '没开完'), ('table_flip', '掀桌了')]
        ],
        'end_reasons': [{'value': 'unfinished', 'label': '没开完'}, {'value': 'table_flip', 'label': '掀桌结束'}],
        'result_sources': ['auto', 'manual_winner', 'manual_rank', 'tiebreak'],
        'stats_exclusions': [{'value': 'none', 'label': '正常统计'}, {'value': 'wins', 'label': '不计胜负'},
                             {'value': 'all', 'label': '不计全部统计'}],
        'participant_kinds': [{'value': 'human', 'label': '玩家'}, {'value': 'automa', 'label': '机器人 / Automa'}],
        'observer_roles': [{'value': 'teacher', 'label': '讲解员'}, {'value': 'moderator', 'label': '主持人'}],
        'rules': {'zero_is_recorded': True, 'gave_up_counts_as_loss': True,
                  'other_special_statuses_imply_loss': False,
                  'abandoned_counts_as_completed': False},
    }


@router.get('/boardgame-plays')
def play_list(request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    q = stats.parse_query(request)
    stmt = select(Play).where(*stats.predicates(db, q, actor, public_list=True))
    return page(db, stmt, Play.id, lambda r: p.detail(db, r, actor), q.limit, q.cursor, {**stats.echo(q), 'actor': actor.id})


@router.post('/boardgame-plays/duplicate-preview')
def duplicate_preview(payload: s.PlayCreate, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_common import digest
    member(actor)
    candidates = p.duplicate_candidates(db, payload, actor)
    return {'candidates': candidates, 'fingerprint': digest(candidates)}


@router.post('/boardgame-plays/result-preview')
def result_preview(payload: s.PlayCreate, actor: User = Depends(get_current_user)):
    member(actor)
    return p.result_preview(payload)[1]


@router.post('/boardgame-plays', status_code=201)
def play_create(payload: s.PlayCreate, request: Request, response: Response, db: Session = Depends(write_db),
                actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'play:create', lambda: p.save_play(db, actor, payload).id,
                   Play, lambda obj: p.detail(db, obj, actor))[0]


@router.get('/boardgame-plays/{play_id}')
def play_detail(play_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.play(db, play_id, actor), actor)


@router.patch('/boardgame-plays/{play_id}')
def play_patch(play_id: int, payload: s.PlayPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.save_play(db, actor, payload, p.play(db, play_id, actor, True)), actor)


@router.post('/boardgame-plays/{play_id}/timer')
def play_timer(play_id: int, payload: s.TimerAction, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.timer_action(db, p.play(db, play_id, actor, True), actor, payload), actor)


@router.post('/boardgame-plays/{play_id}/complete')
def play_complete(play_id: int, payload: s.PlayPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.change_status(db, p.play(db, play_id, actor, True), actor, payload, 'complete'), actor)


@router.post('/boardgame-plays/{play_id}/abandon')
def play_abandon(play_id: int, payload: s.PlayPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.change_status(db, p.play(db, play_id, actor, True), actor, payload, 'abandon'), actor)


@router.post('/boardgame-plays/{play_id}/void')
def play_void(play_id: int, payload: s.RequiredReason, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.change_status(db, p.play(db, play_id, actor, True), actor, payload, 'void'), actor)


@router.post('/boardgame-plays/{play_id}/restore')
def play_restore(play_id: int, payload: s.PlayRestore, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return p.detail(db, p.change_status(db, p.play(db, play_id, actor, True), actor, payload, 'restore'), actor)


@router.post('/boardgame-plays/{play_id}/copy', status_code=201)
def play_copy(play_id: int, payload: s.PlayCopy, request: Request, response: Response, db: Session = Depends(write_db),
              actor: User = Depends(get_current_user)):
    obj = p.play(db, play_id, actor)
    return created(db, actor, request, response, payload, f'play:copy:{play_id}',
        lambda: p.copy_play(db, obj, actor, payload.activity_id).id, Play, lambda r: p.detail(db, r, actor))[0]


@router.get('/boardgame-plays/{play_id}/history')
def play_history(play_id: int, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                 db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    p.play(db, play_id, actor)
    return page(db, select(AuditEvent).where(AuditEvent.entity_type == 'plays', AuditEvent.entity_id == str(play_id)), AuditEvent.id,
        lambda r: dict(**columns(r, ['id', 'entity_revision', 'action', 'reason', 'created_at']), actor=user_summary(db, r.actor_user_id)),
        limit, cursor, {'play': play_id})


@router.post('/boardgame-plays/{play_id}/reports', status_code=201)
def report_create(play_id: int, payload: s.ReportCreate, request: Request, response: Response,
                  db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = p.play(db, play_id, actor)
    participated = db.scalar(select(PlayPlayer.id).join(Person, Person.id == PlayPlayer.person_id).where(
        PlayPlayer.play_id == obj.id, Person.user_id == actor.id))
    if not p.can_edit(db, obj, actor) and not participated:
        fail('report_participant_required', 403)
    def create():
        row = PlayReport(play_id=play_id, reported_by=actor.id, message=payload.message, status='open',
                         created_at=now(), updated_at=now(), revision=1)
        db.add(row)
        db.flush()
        audit(db, row, actor, 'report')
        return row.id
    return created(db, actor, request, response, payload, f'play:report:{play_id}', create,
                   PlayReport, lambda r: columns(r))[0]


@router.get('/boardgame-play-reports')
def reports(scope: str = 'actionable', status: Literal['open', 'resolved', 'dismissed'] | None = None, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
            db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    stmt = select(PlayReport).join(Play, Play.id == PlayReport.play_id).where(Play.publication_status == 'published')
    if scope == 'reported_by_me':
        stmt = stmt.where(PlayReport.reported_by == actor.id)
    elif scope == 'actionable':
        if actor.role != 'admin':
            stmt = stmt.where(or_(Play.created_by == actor.id, Play.activity_id.in_(select(Activity.id).where(Activity.created_by == actor.id))))
    else:
        fail('invalid_report_scope')
    if status:
        stmt = stmt.where(PlayReport.status == status)
    def render(row):
        play = get(db, Play, row.play_id)
        return {**columns(row), 'game': columns(get(db, BoardGame, play.game_id), ['id', 'name', 'cover_url']),
                'played_on': safe(play.played_on), 'reporter': user_summary(db, row.reported_by),
                'resolver': user_summary(db, row.resolved_by), 'permissions': {'can_resolve': p.can_edit(db, play, actor)}}
    return page(db, stmt, PlayReport.id, render, limit, cursor, dict(scope=scope, status=status, actor=actor.id))


@router.patch('/boardgame-play-reports/{report_id}')
def resolve_report(report_id: int, payload: s.ReportPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    report = get(db, PlayReport, report_id, True)
    obj = p.play(db, report.play_id, actor, True)
    if not p.can_edit(db, obj, actor):
        fail('report_edit_forbidden', 403)
    check_revision(report, payload.expected_revision)
    report.status, report.resolution, report.resolved_by = payload.status, payload.resolution, actor.id
    report.updated_at, report.revision = now(), report.revision + 1
    audit(db, report, actor, 'resolve_report')
    return columns(report)


def editable_sheet_play(db, play_id, actor, expected):
    obj = p.play(db, play_id, actor, True)
    if not p.can_edit(db, obj, actor):
        fail('play_edit_forbidden', 403)
    check_revision(obj, expected)
    return obj


@router.get('/boardgame-plays/{play_id}/scoresheet')
def sheet_detail(play_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    obj = p.play(db, play_id, actor)
    sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
    if not sheet:
        fail('not_found', 404)
    return sheets.detail(db, obj, sheet)


@router.put('/boardgame-plays/{play_id}/scoresheet')
def put_sheet(play_id: int, payload: s.SheetPut, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = editable_sheet_play(db, play_id, actor, payload.expected_revision)
    sheet = sheets.save_sheet(db, obj, actor, payload.sheet, payload.sheet_revision, payload.reason)
    return sheets.detail(db, obj, sheet)


@router.delete('/boardgame-plays/{play_id}/scoresheet', status_code=204)
def delete_sheet(play_id: int, expected_revision: int = Query(ge=1), sheet_revision: int = Query(ge=1),
                 reason: str = Query(min_length=1, max_length=500), db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = editable_sheet_play(db, play_id, actor, expected_revision)
    sheets.clear_sheet(db, obj, actor, sheet_revision, reason)
    return Response(status_code=204)


@router.post('/boardgame-plays/{play_id}/scoresheet/review-template')
def review_sheet(play_id: int, payload: s.SheetReview, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = editable_sheet_play(db, play_id, actor, payload.expected_revision)
    return sheets.detail(db, obj, sheets.review_template(db, obj, actor, payload))


@router.post('/boardgame-plays/{play_id}/scoresheet/preview')
def preview_sheet(play_id: int, payload: s.SheetPut, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    obj = editable_sheet_play(db, play_id, actor, payload.expected_revision)
    form, summary = sheets.calculated(db, obj, payload.sheet)
    return {'sheet': form.model_dump(mode='json'), 'calculation': safe(summary), 'play_revision': obj.revision}


@router.post('/boardgame-plays/{play_id}/scoresheet/from-template')
def sheet_from_template(play_id: int, payload: s.TemplateUse, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_templates import make_sheet
    obj = editable_sheet_play(db, play_id, actor, payload.expected_revision)
    form = make_sheet(db, obj, payload)
    return sheets.detail(db, obj, sheets.save_sheet(db, obj, actor, form, payload.sheet_revision, payload.reason))


@router.get('/boardgame-score-templates')
def template_list(game_id: int = Query(gt=0), play_id: int | None = Query(None, gt=0),
                  limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                  db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_templates import matches, template_detail
    from app.services.boardgame_catalog import game
    game(db, game_id, actor)
    query = select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == game_id,
        ScoresheetTemplate.is_active.is_(True), ScoresheetTemplate.sheet_definition.is_not(None))
    eligible = None
    if play_id:
        obj = p.play(db, play_id, actor)
        if obj.game_id != game_id:
            fail('template_game_mismatch')
        players, _, expansions = p.children(db, obj)
        eligible = [t.id for t in db.scalars(query) if matches(t.selection, [e.expansion_game_id for e in expansions],
            obj.rules_snapshot.get('variant_key', ''), len(players), obj.competition_mode)]
        query = query.where(ScoresheetTemplate.id.in_(eligible))
    result = page(db, query, ScoresheetTemplate.id, template_detail, limit, cursor, {'game_id': game_id, 'play_id': play_id, 'eligible': eligible})
    result['builtins'] = [{'key': 'generic', 'name': '通用记分纸', 'scoring_methods': ['best_total', 'scores_only']},
                          {'key': 'rounds', 'name': '按轮次记分', 'scoring_methods': ['best_total', 'best_round', 'rounds_won', 'scores_only']}]
    return result


@router.get('/boardgame-score-templates/{template_id}')
def template_detail(template_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_templates import template_detail
    from app.services.boardgame_catalog import game
    obj = get(db, ScoresheetTemplate, template_id)
    game(db, obj.game_id, actor)
    if not obj.sheet_definition:
        fail('template_not_selectable', 404)
    return template_detail(obj)


@router.post('/boardgame-score-templates', status_code=201)
def template_create(payload: s.TemplateCreate, request: Request, response: Response,
                    db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    from app.services.boardgame_templates import create_template, template_detail
    return created(db, actor, request, response, payload, 'create_score_template',
        lambda: create_template(db, actor, payload).id, ScoresheetTemplate, template_detail)[0]

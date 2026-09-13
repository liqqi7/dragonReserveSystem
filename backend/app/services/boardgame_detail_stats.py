"""Detailed analytics with SQL sample sets and explicit player/unit denominators."""

from sqlalchemy import Integer, String, and_, case, cast, func, literal, or_, select
from sqlalchemy.orm import aliased

from app.models.boardgame import Play, PlayPlayer, PlayTeam
from app.services import boardgame_statistics as s
from app.services.boardgame_common import fail, safe


def require_game_mode(q):
    if not q.game_id or q.mode not in ('individual', 'team', 'solo', 'cooperative'):
        fail('game_and_single_scoring_mode_required')


def outcome_condition(kind, eligible, outcome):
    won = outcome.in_(['win', 'success'])
    return {'eligible': eligible, 'winner': and_(eligible, won), 'non_winner': and_(eligible, ~won),
            'draw': and_(eligible, outcome == 'draw'), 'unknown': ~eligible}[kind]


def participant_filters(q, sid=None):
    clauses = [PlayPlayer.participant_kind == 'human']
    if sid:
        clauses.append(PlayPlayer.person_id == sid)
    if q.first_player is not None:
        clauses.append(PlayPlayer.is_start_player.is_(q.first_player))
        if q.first_player is False:
            first = aliased(PlayPlayer)
            clauses.append(PlayPlayer.play_id.in_(select(first.play_id).where(first.is_start_player.is_(True))))
    if q.new_player is not None:
        clauses.append(PlayPlayer.is_new_to_player.is_(q.new_player))
    if q.role_label is not None:
        clauses.append(PlayPlayer.role_label == q.role_label)
    if q.role_missing is not None:
        clauses.append(PlayPlayer.role_label.is_(None) if q.role_missing else PlayPlayer.role_label.is_not(None))
    return clauses


def participants(db, q, actor):
    require_game_mode(q)
    eligible, outcome, gave_up = s.participant_outcome(q.mode)
    score = PlayPlayer.score if q.mode == 'individual' else PlayTeam.score if q.mode == 'team' else Play.shared_score
    score = case((gave_up, None), else_=score)
    query = select(PlayPlayer.id.label('key'), Play.id.label('play_id'), PlayPlayer.person_id,
        PlayPlayer.display_name_snapshot.label('name'), PlayPlayer.is_start_player, PlayPlayer.is_new_to_player,
        PlayPlayer.role_label, Play.played_on, Play.started_at, eligible.label('eligible'), outcome.label('outcome'),
        score.label('score'), Play.stats_exclusion, Play.comparison_key,
        func.coalesce(Play.rules_snapshot['variant_key'].as_string(), '').label('variant_key')).join(Play, Play.id == PlayPlayer.play_id)
    if q.mode == 'team':
        query = query.join(PlayTeam, PlayTeam.id == PlayPlayer.team_id)
    query = query.where(Play.id.in_(s.filtered_ids(db, q, actor)), *participant_filters(q, s.subject(db, q, actor)))
    if q.result_filter:
        query = query.where(outcome_condition(q.result_filter, eligible, outcome))
    return query.subquery()


def result_units(db, q, actor, ignore_subject=False):
    """A team/shared score appears once, regardless of the number of human members."""
    require_game_mode(q)
    ids = s.filtered_ids(db, q, actor)
    sid = s.subject(db, q, actor) if not ignore_subject else None
    cls = PlayPlayer if q.mode == 'individual' else PlayTeam if q.mode == 'team' else Play
    score = cls.score if cls is not Play else Play.shared_score
    score_status = cls.score_status if cls is not Play else Play.shared_score_status
    outcome = cls.outcome if cls is not Play else Play.cooperative_result
    gave_up = score_status == 'gave_up'
    if sid and cls is not PlayPlayer:
        matched = select(PlayPlayer.id).where(PlayPlayer.person_id == sid, PlayPlayer.score_status == 'gave_up')
        matched = matched.where(PlayPlayer.team_id == cls.id) if cls is PlayTeam else matched.where(PlayPlayer.play_id == Play.id)
        gave_up = or_(gave_up, matched.exists())
    eligible = and_(Play.stats_exclusion == 'none', or_(Play.result_status == 'resolved', gave_up))
    outcome = case((gave_up, 'loss' if cls is not Play else 'failure'), else_=outcome)
    score = case((gave_up, None), else_=score)
    query = select(cls.id.label('key'), Play.id.label('play_id'), Play.played_on, Play.started_at,
        Play.score_direction, Play.result_status, Play.comparison_key, Play.stats_exclusion,
        score.label('score'), outcome.label('outcome'), eligible.label('eligible'))
    if cls is not Play:
        query = query.select_from(cls).join(Play, Play.id == cls.play_id)
    if not ignore_subject:
        if cls is PlayPlayer:
            query = query.where(*participant_filters(q, sid))
        else:
            matched = select(PlayPlayer.id).where(*participant_filters(q, sid))
            matched = matched.where(PlayPlayer.team_id == cls.id) if cls is PlayTeam else matched.where(PlayPlayer.play_id == Play.id)
            query = query.where(matched.exists())
    query = query.where(Play.id.in_(ids))
    if q.result_filter and not ignore_subject:
        query = query.where(outcome_condition(q.result_filter, eligible, outcome))
    return query.subquery()


def rate(db, rows, condition):
    known = and_(condition, rows.c.eligible)
    total, eligible, wins = db.execute(select(s.count_true(condition), s.count_true(known),
        s.count_true(and_(known, rows.c.outcome.in_(['win', 'success']))))).one()
    total, eligible, wins = int(total or 0), int(eligible or 0), int(wins or 0)
    return {'sample_count': total, 'eligible_samples': eligible, 'unknown_or_excluded_samples': total - eligible,
            'wins': wins, 'win_rate': wins / eligible if eligible else None}


def detailed(db, q, actor):
    rows = participants(db, q, actor)
    ids = s.filtered_ids(db, q, actor)
    play_count, rounds_samples, average_rounds, tiebreaks = db.execute(select(func.count(), func.count(Play.round_count),
        func.avg(Play.round_count), s.count_true(Play.tiebreak_applied.is_(True))).where(Play.id.in_(ids))).one()
    result = dict(play_count=play_count, sample_unit='human_participation',
        result=rate(db, rows, literal(True)), first_player=rate(db, rows, rows.c.is_start_player.is_(True)),
        not_first_player=rate(db, rows, and_(rows.c.is_start_player.is_(False), rows.c.play_id.in_(select(
            PlayPlayer.play_id).where(PlayPlayer.is_start_player.is_(True))))),
        new_player=rate(db, rows, rows.c.is_new_to_player.is_(True)),
        experienced_player=rate(db, rows, rows.c.is_new_to_player.is_(False)),
        first_player_recorded_play_count=db.scalar(select(func.count(PlayPlayer.play_id.distinct())).where(
            PlayPlayer.play_id.in_(ids), PlayPlayer.is_start_player.is_(True))),
        new_player_flag_missing_samples=db.scalar(select(func.count()).select_from(rows).where(rows.c.is_new_to_player.is_(None))),
        rounds={'known_play_count': rounds_samples, 'missing_play_count': play_count-rounds_samples,
                'average': s.decimal_score(average_rounds)}, tiebreak_play_count=int(tiebreaks or 0),
        drilldowns={key:s.drilldown(q, **value) for key, value in {
            'winners': {'result_filter':'winner'}, 'non_winners': {'result_filter':'non_winner'},
            'first_player':{'first_player':True}, 'new_player':{'new_player':True}, 'tiebreak':{'tiebreak_only':True}}.items()})
    result['first_player_missing_play_count'] = play_count - result['first_player_recorded_play_count']
    if not q.comparison_key:
        result.update(scores=None, score_reason='comparison_key_required')
        return result
    units = result_units(db, q, actor)
    won = and_(units.c.eligible, units.c.outcome.in_(['win','success']))
    lost = and_(units.c.eligible, units.c.outcome.in_(['loss','failure']))
    summary = dict(db.execute(select(func.count().label('unit_count'), func.count(units.c.score).label('known_scores'),
        func.avg(units.c.score).label('average'), func.avg(case((won, units.c.score))).label('winning_average'),
        func.count(case((won, units.c.score))).label('winning_score_samples'),
        func.max(case((lost, units.c.score))).label('highest_losing_score'),
        func.min(case((lost, units.c.score))).label('lowest_losing_score'),
        func.count(case((lost, units.c.score))).label('losing_score_samples'))).mappings().one())
    direction = db.scalar(select(Play.score_direction).where(Play.id.in_(ids)).limit(1))
    summary.update(sample_unit={'individual':'player', 'team':'team'}.get(q.mode, 'play'), score_direction=direction,
        best_losing_score=safe(summary['lowest_losing_score'] if direction == 'low' else summary['highest_losing_score']),
        missing_scores=summary['unit_count']-summary['known_scores'])
    for key in ('average','winning_average'):
        summary[key] = s.decimal_score(summary[key])
    # Per-play top-two margin uses all actual result units, including automa.
    all_units = result_units(db, q, actor, ignore_subject=True)
    comparable = select(all_units.c.play_id, func.count().label('n'), func.count(all_units.c.score).label('scored'),
        func.count(all_units.c.score.distinct()).label('distinct_scores')).group_by(all_units.c.play_id).subquery()
    complete_ids = select(comparable.c.play_id).where(comparable.c.n == comparable.c.scored, comparable.c.n >= 2)
    ordering = all_units.c.score.asc() if direction == 'low' else all_units.c.score.desc()
    ordered = select(all_units, func.row_number().over(partition_by=all_units.c.play_id,
        order_by=[ordering, all_units.c.key]).label('position')).where(all_units.c.play_id.in_(complete_ids)).subquery()
    top_two = select(ordered.c.play_id, (func.max(ordered.c.score)-func.min(ordered.c.score)).label('margin')).where(
        ordered.c.position <= 2).group_by(ordered.c.play_id).subquery()
    margin_count, margin_average = db.execute(select(func.count(), func.avg(top_two.c.margin))).one() if direction in ('high','low') and q.mode in ('individual','team') else (0,None)
    summary.update(margin_samples=margin_count, average_margin=s.decimal_score(margin_average),
        tied_score_play_count=db.scalar(select(func.count()).select_from(comparable).where(comparable.c.n == comparable.c.scored,
            comparable.c.n > comparable.c.distinct_scores)),
        score_comparison_play_count=db.scalar(select(func.count()).select_from(comparable).where(comparable.c.n == comparable.c.scored)))
    result['scores'] = safe(summary)
    return result


def streaks(db, q, actor):
    if q.result_filter:
        fail('streak_result_filter_not_supported')
    rows = participants(db, q, actor)
    win = case((and_(rows.c.eligible, rows.c.outcome.in_(['win','success'])), 1), else_=0)
    ordering = [rows.c.played_on, rows.c.started_at.is_(None), rows.c.started_at, rows.c.play_id]
    numbered = select(rows.c.person_id, rows.c.play_id, rows.c.played_on, win.label('win'),
        func.row_number().over(partition_by=rows.c.person_id, order_by=ordering).label('position'),
        func.sum(1-win).over(partition_by=rows.c.person_id, order_by=ordering, rows=(None,0)).label('run')).where(
        rows.c.person_id.is_not(None)).subquery()
    runs = select(numbered.c.person_id, numbered.c.run, cast(func.sum(numbered.c.win), Integer).label('wins'),
        func.max(numbered.c.position).label('end_position')).group_by(numbered.c.person_id, numbered.c.run).subquery()
    ranked_runs = select(runs, func.row_number().over(partition_by=runs.c.person_id,
        order_by=runs.c.end_position.desc()).label('last_run')).subquery()
    summary = select(ranked_runs.c.person_id.label('key'), func.max(ranked_runs.c.wins).label('longest'),
        func.max(case((ranked_runs.c.last_run == 1, ranked_runs.c.wins), else_=0)).label('current')).group_by(ranked_runs.c.person_id)
    return {**s.ranked(db, q, summary, 'longest', lambda r: {'person':s.person_info(db, r['key']),
        'longest_win_streak':r['longest'], 'current_win_streak':r['current'], 'rank':r['rank'],
        'drilldown':s.drilldown(q, subject_person_id=r['key'])}),
        'sequence': 'selected_plays_in_date_time_id_order', 'unknown_draw_loss_or_excluded_breaks_streak': True,
        'anonymous_players_included': False}


def score_curve(db, q, actor):
    if not q.comparison_key:
        fail('comparison_key_required')
    units = result_units(db, q, actor)
    stmt = select(units.c.key, units.c.play_id, units.c.played_on, units.c.score, units.c.outcome, units.c.eligible,
        func.dense_rank().over(order_by=units.c.played_on).label('date_order'))
    result = s.ranked(db, q, stmt, 'date_order', lambda r: {'play_id': r['play_id'], 'subject_id':r['key'],
        'played_on':safe(r['played_on']), 'score':safe(r['score']), 'score_missing':r['score'] is None,
        'outcome':r['outcome'] if r['eligible'] else None,
        'path':f'/boardgame-plays/{r["play_id"]}'}, descending=False)
    result['sample_unit'] = {'individual':'player', 'team':'team'}.get(q.mode, 'play')
    return result


def variants(db, q, actor):
    rows = participants(db, q, actor)
    # NULL role has its own explicit key, separate from an actual empty role.
    role = case((rows.c.role_label.is_(None), '0:'), else_=literal('1:')+rows.c.role_label)
    key = cast(func.length(rows.c.variant_key), String) + literal(':') + rows.c.variant_key + role
    stmt = select(key.label('key'), rows.c.variant_key, rows.c.role_label,
        func.count(rows.c.play_id.distinct()).label('play_count'), func.count().label('participant_samples'),
        s.count_true(rows.c.eligible).label('result_samples'),
        s.count_true(and_(rows.c.eligible, rows.c.outcome.in_(['win','success']))).label('wins')).group_by(
            key, rows.c.variant_key, rows.c.role_label)
    return s.ranked(db, q, stmt, 'play_count', lambda r: {**safe(r),
        'win_rate':r['wins']/r['result_samples'] if r['result_samples'] else None,
        'drilldown':s.drilldown(q, variant_key=r['variant_key'], role_label=r['role_label'],
            role_missing=True if r['role_label'] is None else None)})

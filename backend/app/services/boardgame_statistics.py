"""Statistics over a unique filtered play set; never aggregate source payloads."""

import base64
import calendar
import json
from datetime import date, timedelta
from decimal import Decimal

from pydantic import ValidationError
from sqlalchemy import and_, case, cast, false, Float, Integer, func, literal, or_, select

from app.models import Activity, User
from app.models.boardgame import (Play, PlayPlayer, PlayTeam, PlayExpansion, BoardGame, Person, Location,
    Nomination, PlayScoresheet, ScoresheetCell, ScoresheetTemplate, PlayTagLink)
from app.schemas.boardgame_stats import PlayQuery
from app.services import boardgame_activity as activity_service
from app.services.boardgame_common import columns, cursor_value, digest, fail, get, now, safe

LIST_KEYS = {'activity_ids', 'location_ids', 'person_ids', 'player_counts', 'expansion_ids', 'weekdays',
             'tag_ids', 'exclude_tag_ids', 'exclude_game_ids'}


def parse_query(request):
    data = {}
    for key in request.query_params.keys():
        values = request.query_params.getlist(key)
        if key in LIST_KEYS:
            data[key] = values
        elif len(values) != 1:
            fail('duplicate_query_parameter', field=key)
        else:
            data[key] = values[0]
    try:
        query = PlayQuery.model_validate(data)
    except ValidationError:
        fail('invalid_query')
    for key in LIST_KEYS:
        if key in data:
            setattr(query, key, sorted(set(getattr(query, key))))
    return query


def date_range(q):
    supplied = {k for k in ('year', 'month', 'quarter', 'from_date', 'to_date') if getattr(q, k) is not None}
    expected = {'all': set(), 'month': {'year', 'month'}, 'quarter': {'year', 'quarter'}, 'year': {'year'},
                'custom': {'from_date', 'to_date'}}[q.period]
    if supplied != expected:
        fail('invalid_period_parameters')
    if q.period == 'all':
        return None, None
    if q.period == 'custom':
        if q.from_date > q.to_date:
            fail('invalid_date_range')
        return q.from_date, q.to_date
    month = q.month if q.period == 'month' else (q.quarter - 1) * 3 + 1 if q.period == 'quarter' else 1
    end_month = month if q.period == 'month' else month + 2 if q.period == 'quarter' else 12
    return date(q.year, month, 1), date(q.year, end_month, calendar.monthrange(q.year, end_month)[1])


def weekday(db):
    if db.bind.dialect.name == 'sqlite':
        return (cast(func.strftime('%w', Play.played_on), Float) + 6) % 7 + 1
    return func.weekday(Play.played_on) + 1


def visible_identity(db, cls, identity):
    obj = get(db, cls, identity)
    if not obj.is_visible:
        fail('not_found', 404)
    return obj


def subject(db, q, actor, default_self=False):
    own = db.scalar(select(Person.id).where(Person.user_id == actor.id))
    if q.scope == 'mine' and q.subject_person_id and q.subject_person_id != own:
        fail('mine_subject_mismatch')
    if q.subject_person_id:
        visible_identity(db, Person, q.subject_person_id)
        return q.subject_person_id
    return own if q.scope == 'mine' or default_self else None


def predicates(db, q, actor, *, status='completed', public_list=False, apply_subject=True):
    start, end = date_range(q)
    if q.location_ids and q.location_missing is not None or q.activity_ids and q.activity_missing is not None:
        fail('conflicting_missing_filter')
    if q.person_match and not q.person_ids or q.expansion_match and not q.expansion_ids:
        fail('match_requires_ids')
    if q.without_expansions and q.expansion_ids or q.player_count and q.player_counts:
        fail('conflicting_filter')
    if q.user_id and q.person_ids:
        fail('conflicting_person_filter')
    if q.scope == 'mine' and q.user_id and q.user_id != actor.id:
        fail('mine_user_mismatch')
    if any(p < 1 or p > 100 for p in q.player_counts) or any(w < 1 or w > 7 for w in q.weekdays):
        fail('invalid_filter_value')
    for cls, ids in ((Person, q.person_ids), (Location, q.location_ids)):
        for identity in ids:
            visible_identity(db, cls, identity)
    conditions = [Play.publication_status == 'published']
    from app.services.boardgame_collection import tag_ids_owned
    tag_ids_owned(db, actor, q.tag_ids + q.exclude_tag_ids)
    if q.tag_ids:
        tagged = select(PlayTagLink.play_id).where(PlayTagLink.tag_id.in_(q.tag_ids))
        if q.tag_match == 'all':
            tagged = tagged.group_by(PlayTagLink.play_id).having(func.count() == len(q.tag_ids))
        conditions.append(Play.id.in_(tagged))
    if q.exclude_tag_ids:
        conditions.append(~Play.id.in_(select(PlayTagLink.play_id).where(PlayTagLink.tag_id.in_(q.exclude_tag_ids))))
    if q.exclude_game_ids:
        conditions.append(~Play.game_id.in_(q.exclude_game_ids))
    if q.inventory_id:
        conditions.append(or_(Play.inventory_id == q.inventory_id, Play.id.in_(select(PlayExpansion.play_id).where(
            PlayExpansion.inventory_id == q.inventory_id))))
    if q.eligible_only:
        conditions.extend([Play.status == 'completed', Play.stats_exclusion != 'all'])
    if public_list:
        if q.recorded_by == 'me':
            conditions.append(Play.created_by == actor.id)
        if q.status in ('draft', 'voided'):
            if q.status == 'draft' and q.recorded_by != 'me':
                fail('draft_requires_recorded_by')
            conditions.append(Play.status == q.status)
        else:
            conditions.append(Play.status == q.status if q.status else Play.status.in_(['completed', 'abandoned']))
    else:
        if q.recorded_by or q.status:
            fail('statistics_status_is_fixed')
        conditions += [Play.status == status, Play.stats_exclusion != 'all']
    if start:
        conditions.extend([Play.played_on >= start, Play.played_on <= end])
    for field, value in [('game_id', q.game_id or q.base_game_id), ('origin', q.origin),
                         ('competition_mode', q.mode), ('comparison_key', q.comparison_key)]:
        if value is not None:
            conditions.append(getattr(Play, field) == value)
    if q.environment != 'all':
        conditions.append(Play.play_environment == q.environment)
    if q.variant_key is not None:
        conditions.append(Play.rules_snapshot['variant_key'].as_string() == q.variant_key)
    if q.tiebreak_only:
        conditions.append(Play.tiebreak_applied.is_(True))
    if q.activity_ids:
        conditions.append(Play.original_activity_id.in_(q.activity_ids))
    if q.activity_missing is not None:
        conditions.append(Play.original_activity_id.is_(None) if q.activity_missing else Play.original_activity_id.is_not(None))
    if q.location_ids:
        conditions.append(Play.location_id.in_(q.location_ids))
    if q.location_missing is not None:
        conditions.append(Play.location_id.is_(None) if q.location_missing else Play.location_id.is_not(None))
    if q.weekdays:
        conditions.append(weekday(db).in_(q.weekdays))
    count_players = select(func.count()).select_from(PlayPlayer).where(PlayPlayer.play_id == Play.id).correlate(Play).scalar_subquery()
    selected_counts = q.player_counts or ([q.player_count] if q.player_count else [])
    if selected_counts:
        conditions.append(count_players.in_(selected_counts))
    person_ids = q.person_ids
    if q.user_id:
        resolved_person = db.scalar(select(Person.id).where(Person.user_id == q.user_id))
        person_ids = [resolved_person] if resolved_person else [-1]
    if person_ids:
        match_count = select(func.count()).select_from(PlayPlayer).where(PlayPlayer.play_id == Play.id,
            PlayPlayer.person_id.in_(person_ids)).correlate(Play).scalar_subquery()
        conditions.append(match_count >= 1 if (q.person_match or 'any') == 'any' else match_count == len(person_ids))
        if q.person_match == 'exactly':
            conditions.append(count_players == len(person_ids))
    if q.scope == 'mine':
        own_plays = select(PlayPlayer.play_id).join(Person, Person.id == PlayPlayer.person_id).where(Person.user_id == actor.id)
        conditions.append(Play.id.in_(own_plays))
    sid = subject(db, q, actor) if apply_subject else None
    if sid:
        conditions.append(Play.id.in_(select(PlayPlayer.play_id).where(PlayPlayer.person_id == sid)))
    if q.result_filter or q.first_player is not None or q.new_player is not None:
        from app.services.boardgame_detail_stats import participant_filters, outcome_condition
        matched = select(PlayPlayer.play_id).join(Play, Play.id == PlayPlayer.play_id)
        if q.mode == 'team':
            matched = matched.join(PlayTeam, PlayTeam.id == PlayPlayer.team_id)
        if q.result_filter:
            if q.mode not in ('individual', 'team', 'solo', 'cooperative'):
                fail('single_mode_required')
            eligible, outcome, _ = participant_outcome(q.mode)
            matched = matched.where(outcome_condition(q.result_filter, eligible, outcome))
        matched = matched.where(*participant_filters(q, sid))
        conditions.append(Play.id.in_(matched))
    if q.new_to_person_id:
        visible_identity(db, Person, q.new_to_person_id)
        conditions.append(Play.id.in_(select(PlayPlayer.play_id).where(PlayPlayer.person_id == q.new_to_person_id,
                                                                      PlayPlayer.is_new_to_player.is_(True))))
    expansion_count = select(func.count()).select_from(PlayExpansion).where(PlayExpansion.play_id == Play.id).correlate(Play).scalar_subquery()
    if q.without_expansions:
        conditions.append(expansion_count == 0)
    if q.expansion_ids:
        for identity in q.expansion_ids:
            visible_identity(db, BoardGame, identity)
        matched = select(func.count()).select_from(PlayExpansion).where(PlayExpansion.play_id == Play.id,
            PlayExpansion.expansion_game_id.in_(q.expansion_ids)).correlate(Play).scalar_subquery()
        conditions.append(matched >= 1 if (q.expansion_match or 'any') == 'any' else matched == len(q.expansion_ids))
        if q.expansion_match == 'exactly':
            conditions.append(expansion_count == len(q.expansion_ids))
    if q.role_label is not None and q.role_missing is not None:
        fail('conflicting_role_filter')
    if q.role_label is not None or q.role_missing is not None:
        role = PlayPlayer.role_label.is_(None) if q.role_missing else PlayPlayer.role_label.is_not(None) if q.role_missing is False else PlayPlayer.role_label == q.role_label
        role_query = select(PlayPlayer.play_id).where(role)
        if sid:
            role_query = role_query.where(PlayPlayer.person_id == sid)
        conditions.append(Play.id.in_(role_query))
    if q.sheet_comparison_key or q.row_key:
        sheet_query = select(PlayScoresheet.play_id).where(PlayScoresheet.parse_status == 'parsed',
            PlayScoresheet.play_revision == Play.revision).correlate(Play)
        if q.sheet_comparison_key:
            sheet_query = sheet_query.where(PlayScoresheet.sheet_comparison_key == q.sheet_comparison_key)
        if q.row_key:
            sheet_query = sheet_query.join(ScoresheetCell, ScoresheetCell.sheet_id == PlayScoresheet.id).where(
                ScoresheetCell.row_key == q.row_key, ScoresheetCell.projection_version == PlayScoresheet.projection_version)
        conditions.append(Play.id.in_(sheet_query))
    return conditions


def filtered_ids(db, q, actor, **kwargs):
    return select(Play.id).where(*predicates(db, q, actor, **kwargs))


def echo(q):
    return q.model_dump(mode='json', by_alias=True, exclude={'limit', 'cursor', 'sort', 'bucket', 'dimension'}, exclude_none=True)


def drilldown(q, **extra):
    values = {**echo(q), 'status': 'completed', 'eligible_only': True, **safe(extra)}
    return {'path': '/boardgame-plays', 'query': {k: v for k, v in values.items() if v is not None and v != []}}


def metadata(db, q, actor):
    start, end = date_range(q)
    return dict(definition_version='5', scope=q.scope, filters={**echo(q), 'from': safe(start), 'to': safe(end)},
        generated_at=safe(now()), data_start_date=safe(db.scalar(select(func.min(Play.played_on)).where(
            Play.publication_status == 'published', Play.status == 'completed', Play.stats_exclusion != 'all'))),
        excluded_summary={'held': 'not_in_public_scope', 'unknown_results': 'excluded_from_result_denominators'})


def count_true(condition):
    return cast(func.sum(case((condition, 1), else_=0)), Integer)


def decimal_score(value):
    # AVG returns float on SQLite and Decimal on MySQL. Keep the HTTP type stable.
    return format(Decimal(str(value)).quantize(Decimal('0.000001')), 'f') if value is not None else None


def ranked(db, q, stmt, metric, render, *, key='key', descending=True, secondary=None):
    grouped = stmt.subquery()
    value = grouped.c[metric]
    rank_stmt = select(grouped, func.rank().over(order_by=[value.is_(None), value.desc() if descending else value.asc()]).label('rank'))
    ranked_rows = rank_stmt.subquery()
    total = db.scalar(select(func.count()).select_from(grouped))
    signature = digest({'filters': echo(q), 'sort': q.sort, 'metric': metric, 'desc': descending, 'secondary': secondary})
    query = select(ranked_rows)
    if q.cursor:
        try:
            cursor = json.loads(base64.urlsafe_b64decode(q.cursor))
            if cursor['f'] != signature:
                fail('cursor_filter_mismatch')
            last_value, last_key = cursor['value'], cursor['key']
            # Null values sort last and are represented by a separate predicate.
            v, k = ranked_rows.c[metric], ranked_rows.c[key]
            last_key = cursor_value(last_key, k)
            if last_value is not None:
                last_value = cursor_value(last_value, v)
            tied_after = k > last_key
            if secondary:
                s = ranked_rows.c[secondary]
                secondary_value = cursor_value(cursor['secondary'], s)
                tied_after = or_(s < secondary_value, and_(s == secondary_value, k > last_key))
            if last_value is None:
                query = query.where(v.is_(None), tied_after)
            else:
                comparison = v < last_value if descending else v > last_value
                query = query.where(or_(comparison, v.is_(None), and_(v == last_value, tied_after)))
        except (KeyError, TypeError, ValueError, UnicodeError):
            fail('invalid_cursor')
    v = ranked_rows.c[metric]
    ordering = [v.is_(None), v.desc() if descending else v.asc()]
    if secondary:
        ordering.append(ranked_rows.c[secondary].desc())
    ordering.append(ranked_rows.c[key])
    rows = list(db.execute(query.order_by(*ordering).limit(q.limit + 1)).mappings())
    more, rows = len(rows) > q.limit, rows[:q.limit]
    cursor = None
    if more:
        last = rows[-1]
        cursor = base64.urlsafe_b64encode(json.dumps({'f': signature, 'value': safe(last[metric]), 'key': safe(last[key]),
            'secondary': safe(last[secondary]) if secondary else None}).encode()).decode()
    return dict(items=[render(dict(r)) for r in rows], total_items=total, has_more=more, next_cursor=cursor)


def person_info(db, identity):
    p = get(db, Person, identity)
    user = db.get(User, p.user_id) if p.user_id else None
    return {'id': p.id, 'display_name': user.nickname if user else p.display_name,
            'user': columns(user, ['id', 'nickname', 'avatar_url']) if user else None}


def basic_aggregates():
    return [func.count().label('completed_play_count'), func.sum(Play.duration_minutes).label('known_duration_minutes'),
            func.count(Play.duration_minutes).label('duration_known_count')]


def add_missing(row):
    row['duration_missing_count'] = row['completed_play_count'] - row['duration_known_count']
    if row['completed_play_count'] == 0:
        row['known_duration_minutes'] = 0
    elif row['known_duration_minutes'] is not None:
        row['known_duration_minutes'] = int(row['known_duration_minutes'])
    return safe(row)


def overview(db, q, actor):
    ids = filtered_ids(db, q, actor)
    stats = dict(db.execute(select(*basic_aggregates(), func.count(Play.game_id.distinct()).label('game_count'),
        func.count(Play.played_on.distinct()).label('played_day_count')).where(Play.id.in_(ids))).mappings().one())
    stats = add_missing(stats)
    stats['average_duration_minutes'] = (stats['known_duration_minutes'] / stats['duration_known_count']) if stats['duration_known_count'] else None
    players = db.execute(select(func.count().label('player_appearances'), func.count(PlayPlayer.person_id.distinct()).label('named_player_count'))
                         .where(PlayPlayer.play_id.in_(ids))).mappings().one()
    stats.update(players)
    stats['registered_player_count'] = db.scalar(select(func.count(Person.id.distinct())).join(PlayPlayer, PlayPlayer.person_id == Person.id)
        .where(PlayPlayer.play_id.in_(ids), Person.user_id.is_not(None)))
    counts = list(db.scalars(select(func.count()).select_from(Play).where(Play.id.in_(ids)).group_by(Play.game_id).order_by(func.count().desc())))
    stats['h_index'] = max((i for i, count in enumerate(counts, 1) if count >= i), default=0)
    stats['play_milestones'] = [dict(threshold=t, game_count=sum(c >= t for c in counts)) for t in (5, 10, 25, 100)]
    stats['abandoned_count'] = db.scalar(select(func.count()).select_from(Play).where(Play.id.in_(filtered_ids(db, q, actor, status='abandoned'))))
    sid = subject(db, q, actor)
    stats['subject_person_id'] = sid
    stats['new_to_player_game_count'] = db.scalar(select(func.count(Play.game_id.distinct())).join(PlayPlayer, PlayPlayer.play_id == Play.id)
        .where(Play.id.in_(ids), PlayPlayer.person_id == sid, PlayPlayer.is_new_to_player.is_(True))) if sid else None
    if sid is None:
        stats['new_to_player_reason'] = 'subject_required'
    stats['results_by_mode'] = {mode: result_summary(db, q, actor, ids, mode, sid) for mode in ('individual', 'team', 'cooperative', 'solo')}
    return stats


def participant_outcome(mode):
    """A member who gives up has a known non-win even if the table is unresolved."""
    gave_up = PlayPlayer.score_status == 'gave_up'
    source = PlayPlayer.outcome
    if mode == 'team':
        gave_up = or_(gave_up, PlayTeam.score_status == 'gave_up')
        source = PlayTeam.outcome
    elif mode in ('cooperative', 'solo'):
        gave_up = or_(gave_up, Play.shared_score_status == 'gave_up')
        source = Play.cooperative_result
    outcome = case((gave_up, 'failure' if mode in ('cooperative', 'solo') else 'loss'), else_=source)
    eligible = and_(Play.stats_exclusion == 'none', or_(Play.result_status == 'resolved', gave_up))
    return eligible, outcome, gave_up


def result_summary(db, q, actor, ids, mode, sid=None):
    valid = [Play.id.in_(ids), Play.competition_mode == mode, Play.stats_exclusion == 'none']
    if mode in ('individual', 'team'):
        cls = PlayPlayer if mode == 'individual' else PlayTeam
        gave_up = cls.score_status == 'gave_up'
        if mode == 'team' and sid:
            gave_up = or_(gave_up, select(PlayPlayer.id).where(PlayPlayer.person_id == sid,
                PlayPlayer.team_id == PlayTeam.id, PlayPlayer.score_status == 'gave_up').exists())
        outcome = case((gave_up, 'loss'), else_=cls.outcome)
        query = select(func.count().label('eligible_samples'), count_true(outcome == 'win').label('wins'),
                       count_true(outcome == 'draw').label('draws'), count_true(outcome == 'loss').label('losses'))
        query = query.select_from(cls).join(Play, Play.id == cls.play_id).where(*valid,
            or_(Play.result_status == 'resolved', gave_up))
        if sid:
            query = query.where(PlayPlayer.person_id == sid) if cls is PlayPlayer else query.where(PlayTeam.id.in_(
                select(PlayPlayer.team_id).where(PlayPlayer.person_id == sid)))
        result = dict(db.execute(query).mappings().one())
        rate_key, numerator = 'win_rate', result['wins']
        result['sample_unit'] = 'player_result' if mode == 'individual' else 'team_result'
    else:
        gave_up = Play.shared_score_status == 'gave_up'
        if sid:
            gave_up = or_(gave_up, select(PlayPlayer.id).where(PlayPlayer.person_id == sid,
                PlayPlayer.play_id == Play.id, PlayPlayer.score_status == 'gave_up').exists())
        outcome = case((gave_up, 'failure'), else_=Play.cooperative_result)
        result = dict(db.execute(select(func.count().label('eligible_samples'),
            count_true(outcome == 'success').label('successes'), count_true(outcome == 'failure').label('failures')).where(
                *valid, or_(Play.result_status == 'resolved', gave_up))).mappings().one())
        rate_key, numerator = 'success_rate', result['successes']
        result['sample_unit'] = 'play'
    for key in ('wins', 'draws', 'losses', 'successes', 'failures'):
        if key in result:
            result[key] = result[key] or 0
    result[rate_key] = numerator / result['eligible_samples'] if q.game_id and result['eligible_samples'] else None
    if not q.game_id:
        result['rate_reason'] = 'game_required'
    result['unknown_result_play_count'] = db.scalar(select(func.count()).select_from(Play).where(Play.id.in_(ids),
        Play.competition_mode == mode, Play.result_status == 'unknown'))
    return result


def most_played(db, q, actor):
    ids = filtered_ids(db, q, actor)
    player_count = select(func.count()).select_from(PlayPlayer).where(PlayPlayer.play_id == Play.id).correlate(Play).scalar_subquery()
    stmt = select(Play.game_id.label('key'), func.count().label('play_count'), cast(func.sum(player_count), Integer).label('player_appearances'),
                  func.max(Play.played_on).label('last_played_on')).where(Play.id.in_(ids)).group_by(Play.game_id)
    return ranked(db, q, stmt, 'play_count', lambda r: dict(**safe(r), game=columns(get(db, BoardGame, r['key']), ['id', 'name', 'original_name', 'cover_url']),
                                                           drilldown=drilldown(q, game_id=r['key'])))


def players(db, q, actor):
    ids = filtered_ids(db, q, actor)
    sid = subject(db, q, actor)
    base = select(PlayPlayer.person_id.label('key'), func.count().label('play_count')).join(Play, Play.id == PlayPlayer.play_id).where(
        Play.id.in_(ids), PlayPlayer.person_id.is_not(None)).group_by(PlayPlayer.person_id)
    if q.scope == 'mine' or sid:
        base = base.where(PlayPlayer.person_id == sid if sid else false())
    if not q.game_id:
        if q.sort != 'play_count':
            fail('game_required_for_result_ranking')
        return ranked(db, q, base, 'play_count', lambda r: dict(**safe(r), person=person_info(db, r['key']),
             drilldown=drilldown(q, person_ids=[r['key']], person_match='all')))
    if q.mode not in ('individual', 'team', 'cooperative', 'solo'):
        fail('single_mode_required')
    if q.mode == 'team':
        base = base.join(PlayTeam, PlayTeam.id == PlayPlayer.team_id)
        result_column, score, rank = PlayTeam.outcome, PlayTeam.score, PlayTeam.rank
    elif q.mode == 'individual':
        result_column, score, rank = PlayPlayer.outcome, PlayPlayer.score, PlayPlayer.rank
    else:
        result_column, score, rank = Play.cooperative_result, Play.shared_score, literal(None)
    valid, result_column, gave_up = participant_outcome(q.mode)
    score = case((gave_up, None), else_=score)
    samples = count_true(valid)
    wins = count_true(and_(valid, result_column == ('win' if q.mode in ('team', 'individual') else 'success')))
    rate = cast(wins, Float) / func.nullif(samples, 0)
    base = base.add_columns(samples.label('eligible_games'), wins.label('wins'),
        count_true(and_(valid, result_column == 'draw')).label('draws'), rate.label('rate'),
        func.count(score).label('score_samples'), func.avg(score).label('average_score'),
        func.min(score).label('min_score'), func.max(score).label('max_score'),
        func.count(rank).label('rank_samples'), func.avg(rank).label('average_rank'))
    metric = {'play_count': 'play_count', 'win_rate': 'rate', 'success_rate': 'rate', 'average_score': 'average_score'}.get(q.sort)
    if metric is None or metric == 'average_score' and not q.comparison_key:
        fail('invalid_player_sort')
    if metric == 'rate':
        base = base.having(samples >= 1)
    direction = db.scalar(select(Play.score_direction).where(Play.id.in_(ids)).limit(1))
    def render(r):
        competitive = q.mode in ('individual', 'team')
        result = dict(kind=q.mode, eligible_games=r['eligible_games'])
        if competitive:
            result.update(wins=r['wins'], draws=r['draws'], losses=r['eligible_games'] - r['wins'] - r['draws'], win_rate=r['rate'])
        else:
            result.update(successes=r['wins'], failures=r['eligible_games'] - r['wins'], success_rate=r['rate'])
        first = db.scalar(select(func.min(Play.played_on)).join(PlayPlayer, PlayPlayer.play_id == Play.id).where(
            PlayPlayer.person_id == r['key'], Play.game_id == q.game_id, Play.publication_status == 'published',
            Play.status == 'completed', Play.stats_exclusion != 'all'))
        return dict(person=person_info(db, r['key']), play_count=r['play_count'], rank=r['rank'], result=result,
            first_recorded_on=safe(first), score=dict(sample_unit={'individual': 'player', 'team': 'team'}.get(q.mode, 'play'),
                samples=r['score_samples'], average=decimal_score(r['average_score']), best=safe(r['min_score'] if direction == 'low' else r['max_score']),
                direction=direction) if q.comparison_key else None,
            rank_summary=dict(samples=r['rank_samples'], average=float(r['average_rank']) if r['average_rank'] is not None else None) if competitive and q.comparison_key else None,
            drilldown=drilldown(q, person_ids=[r['key']], person_match='all'))
    return ranked(db, q, base, metric, render, descending=not (metric == 'average_score' and direction == 'low'))


def comparison_groups(db, q, actor):
    ids = filtered_ids(db, q, actor)
    stmt = select(Play.comparison_key.label('key'), func.count().label('play_count'), func.min(Play.id).label('example_id'))
    stmt = stmt.where(Play.id.in_(ids)).group_by(Play.comparison_key)
    def render(r):
        obj = get(db, Play, r['example_id'])
        return dict(comparison_key=r['key'], play_count=r['play_count'], rules=obj.rules_snapshot,
                    drilldown=drilldown(q, comparison_key=r['key']))
    return ranked(db, q, stmt, 'play_count', render)


def expansions(db, q, actor):
    stmt = select(PlayExpansion.expansion_game_id.label('key'), func.count().label('play_count')).where(
        PlayExpansion.play_id.in_(filtered_ids(db, q, actor))).group_by(PlayExpansion.expansion_game_id)
    return ranked(db, q, stmt, 'play_count', lambda r: dict(**safe(r), game=columns(get(db, BoardGame, r['key']), ['id', 'name', 'original_name']),
        drilldown=drilldown(q, expansion_ids=[r['key']], expansion_match='all', without_expansions=False)))


def breakdowns(db, q, actor):
    if q.dimension == 'weekday':
        key, fixed = weekday(db), list(range(1, 8))
    elif q.dimension == 'environment':
        key, fixed = Play.play_environment, ['online', 'offline', 'unknown']
    else:
        key, fixed = select(func.count()).select_from(PlayPlayer).where(PlayPlayer.play_id == Play.id).correlate(Play).scalar_subquery(), None
    rows = {r['key']: dict(r) for r in db.execute(select(key.label('key'), *basic_aggregates()).where(
        Play.id.in_(filtered_ids(db, q, actor))).group_by(key)).mappings()}
    keys = fixed if fixed is not None else sorted(rows)
    out = []
    for k in keys:
        row = rows.get(k, dict(key=k, completed_play_count=0, known_duration_minutes=0, duration_known_count=0))
        if q.dimension == 'weekday':
            extra = {'weekdays': [int(k)]}
        elif q.dimension == 'environment':
            extra = {'environment': k}
        else:
            extra = {'player_counts': [k]}
        out.append(dict(**add_missing(row), label=str(k), drilldown=drilldown(q, **extra)))
    return {'items': out}


def locations(db, q, actor):
    # Use 0 for the missing bucket so keyset pagination remains total and stable.
    key = func.coalesce(Play.location_id, 0)
    stmt = select(key.label('key'), *basic_aggregates(), func.count(Play.game_id.distinct()).label('game_count'))
    stmt = stmt.where(Play.id.in_(filtered_ids(db, q, actor))).group_by(key)
    return ranked(db, q, stmt, 'completed_play_count', lambda r: dict(**add_missing(r),
        location=columns(get(db, Location, r['key']), ['id', 'name']) if r['key'] else None,
        drilldown=drilldown(q, location_ids=[r['key']] if r['key'] else [], location_missing=None if r['key'] else True)))


def partners(db, q, actor):
    sid = subject(db, q, actor, default_self=True)
    if sid is None:
        return dict(items=[], total_items=0, has_more=False, next_cursor=None, reason='subject_unbound')
    q = q.model_copy(update={'subject_person_id': sid})
    stmt = select(PlayPlayer.person_id.label('key'), func.count().label('shared_play_count'),
        func.count(Play.game_id.distinct()).label('game_count'), func.max(Play.played_on).label('last_played_on')).join(Play,
        Play.id == PlayPlayer.play_id).where(Play.id.in_(filtered_ids(db, q, actor)),
            PlayPlayer.person_id.is_not(None), PlayPlayer.person_id != sid).group_by(PlayPlayer.person_id)
    return ranked(db, q, stmt, 'shared_play_count', lambda r: dict(**safe(r), person=person_info(db, r['key']),
        drilldown=drilldown(q, person_ids=[sid, r['key']], person_match='all')))


def trends(db, q, actor):
    if q.period == 'all' and q.bucket != 'activity':
        today = now().date()
        start = date(today.year - 1, today.month, 1) if today.month < 12 else date(today.year, 1, 1)
        # Exactly the latest twelve calendar months including the current month.
        month_index = today.year * 12 + today.month - 12
        start = date(month_index // 12, month_index % 12 + 1, 1)
        q = q.model_copy(update={'period': 'custom', 'from_date': start, 'to_date': today})
    if q.bucket == 'activity':
        key = func.coalesce(Play.original_activity_id, 0)
    else:
        key = Play.played_on
    rows = list(db.execute(select(key.label('key'), *basic_aggregates()).where(Play.id.in_(filtered_ids(db, q, actor))).group_by(key)).mappings())
    grouped = {}
    for row in rows:
        day = row['key']
        if q.bucket == 'activity':
            k = day
        elif q.bucket == 'day':
            k = day.isoformat()
        elif q.bucket == 'month':
            k = day.strftime('%Y-%m')
        elif q.bucket == 'quarter':
            k = f'{day.year}-Q{(day.month - 1) // 3 + 1}'
        else:
            k = str(day.year)
        current = grouped.setdefault(k, dict(key=k, completed_play_count=0, known_duration_minutes=0, duration_known_count=0))
        for field in ('completed_play_count', 'known_duration_minutes', 'duration_known_count'):
            current[field] += row[field] or 0
    start, end = date_range(q)
    if q.bucket != 'activity':
        if (end - start).days > 3660:
            fail('trend_range_too_large')
        day = start
        while day <= end:
            k = day.isoformat() if q.bucket == 'day' else day.strftime('%Y-%m') if q.bucket == 'month' else f'{day.year}-Q{(day.month - 1) // 3 + 1}' if q.bucket == 'quarter' else str(day.year)
            grouped.setdefault(k, dict(key=k, completed_play_count=0, known_duration_minutes=0, duration_known_count=0))
            day += timedelta(days=1)
    out = []
    for k, row in sorted(grouped.items()):
        if row['completed_play_count'] and not row['duration_known_count']:
            row['known_duration_minutes'] = None
        if q.bucket == 'activity':
            extra = dict(activity_ids=[k] if k else [], activity_missing=None if k else True)
        else:
            if q.bucket == 'day':
                first = last = date.fromisoformat(k)
            elif q.bucket == 'month':
                year, month = map(int, k.split('-')); first, last = date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])
            elif q.bucket == 'quarter':
                year, quarter = k.split('-Q'); month = (int(quarter) - 1) * 3 + 1
                first, last = date(int(year), month, 1), date(int(year), month + 2, calendar.monthrange(int(year), month + 2)[1])
            else:
                first, last = date(int(k), 1, 1), date(int(k), 12, 31)
            extra = {'period': 'custom', 'year': None, 'month': None, 'quarter': None, 'from': max(first, start), 'to': min(last, end)}
        out.append(dict(**add_missing(row), drilldown=drilldown(q, **extra)))
    return {'items': out, 'filters': {**echo(q), 'from': safe(start), 'to': safe(end)}}


def wanted(db, q, actor, game_id=None):
    allowed = {'scope', 'activity_ids', 'period', 'year', 'month', 'quarter', 'from_date', 'to_date', 'game_id', 'limit', 'cursor', 'sort'}
    if q.model_fields_set - allowed:
        fail('unsupported_wanted_filter')
    activity_service.sync_all(db)
    start, end = date_range(q)
    conditions = [Nomination.state.in_(['active', 'frozen']), Activity.status.not_in(activity_service.INACTIVE)]
    if q.activity_ids:
        conditions.append(Activity.id.in_(q.activity_ids))
    if start:
        conditions += [Activity.start_time >= start, Activity.start_time < end + timedelta(days=1)]
    if q.game_id or game_id:
        conditions.append(Nomination.game_id == (q.game_id or game_id))
    if game_id:
        key = Activity.id
    else:
        key = Nomination.game_id
    mine = count_true(Nomination.user_id == actor.id)
    stmt = select(key.label('key'), func.count().label('nomination_count'),
        func.count(Activity.id.distinct()).label('activity_count'), mine.label('my_activity_count')).join(
            Activity, Activity.id == Nomination.activity_id).where(*conditions).group_by(key)
    if q.scope == 'mine':
        stmt = stmt.having(mine > 0)
    def render(r):
        out = safe(r)
        if game_id:
            out['activity'] = columns(get(db, Activity, r['key']), ['id', 'name', 'start_time'])
        else:
            out['game'] = columns(get(db, BoardGame, r['key']), ['id', 'name', 'original_name', 'cover_url'])
            out['drilldown'] = {'path': f'/boardgame-stats/wanted/{r["key"]}/sources', 'query': q.model_dump(
                mode='json', by_alias=True, include=allowed - {'limit', 'cursor', 'sort'}, exclude_none=True)}
        return out
    return ranked(db, q, stmt, 'my_activity_count' if q.scope == 'mine' else 'nomination_count', render,
                  secondary='nomination_count' if q.scope == 'mine' else 'activity_count')


def roles(db, q, actor):
    if not q.game_id or not q.mode or not q.comparison_key:
        fail('game_mode_comparison_required')
    sid = subject(db, q, actor)
    key = case((PlayPlayer.role_label.is_(None), '0:'), else_=literal('1:') + PlayPlayer.role_label)
    valid, outcome, _ = participant_outcome(q.mode)
    stmt = select(key.label('key'), PlayPlayer.role_label.label('role_label'),
        func.count(Play.id.distinct()).label('play_count'), func.count().label('participant_sample_count'),
        count_true(valid).label('result_samples'), count_true(and_(valid, outcome.in_(['win', 'success']))).label('wins'),
        count_true(and_(valid, outcome == 'draw')).label('draws')).join(Play, Play.id == PlayPlayer.play_id)
    if q.mode == 'team':
        stmt = stmt.join(PlayTeam, PlayTeam.id == PlayPlayer.team_id)
    if q.mode == 'individual':
        stmt = stmt.add_columns(func.count(PlayPlayer.score).label('score_samples'), func.avg(PlayPlayer.score).label('average_score'),
            func.min(PlayPlayer.score).label('min_score'), func.max(PlayPlayer.score).label('max_score'))
    if sid:
        stmt = stmt.where(PlayPlayer.person_id == sid)
    stmt = stmt.where(Play.id.in_(filtered_ids(db, q, actor))).group_by(key, PlayPlayer.role_label)
    def render(r):
        if 'average_score' in r:
            r['average_score'] = decimal_score(r['average_score'])
        r = safe(r)
        eligible, wins = r['result_samples'] or 0, r.pop('wins') or 0
        draws = r.pop('draws') or 0
        result = dict(kind=q.mode, sample_unit='participant', eligible_samples=eligible)
        if q.mode in ('individual', 'team'):
            result.update(wins=wins, draws=draws, losses=eligible-wins-draws, win_rate=wins/eligible if eligible else None)
        else:
            result.update(successes=wins, failures=eligible-wins, success_rate=wins/eligible if eligible else None)
        r.update(result=result, drilldown=drilldown(q, role_label=r['role_label'], role_missing=True if r['role_label'] is None else None))
        if q.mode != 'individual':
            r.update(score_samples=0, average_score=None, min_score=None, max_score=None)
        return r
    return ranked(db, q, stmt, 'play_count', render)


def sheet_cells(db, q, actor):
    ids = filtered_ids(db, q, actor)
    sid = subject(db, q, actor)
    from sqlalchemy.orm import aliased
    stale = aliased(ScoresheetCell)
    valid = [Play.id.in_(ids), PlayScoresheet.parse_status == 'parsed', PlayScoresheet.play_revision == Play.revision,
        PlayScoresheet.sheet_comparison_key.is_not(None), ScoresheetCell.projection_version == PlayScoresheet.projection_version,
        ~select(stale.id).where(stale.sheet_id == PlayScoresheet.id,
            stale.projection_version != PlayScoresheet.projection_version).exists()]
    if q.sheet_comparison_key:
        valid.append(PlayScoresheet.sheet_comparison_key == q.sheet_comparison_key)
    if sid:
        player_ids = select(PlayPlayer.id).where(PlayPlayer.person_id == sid)
        team_ids = select(PlayPlayer.team_id).where(PlayPlayer.person_id == sid)
        valid.append(or_(ScoresheetCell.player_id.in_(player_ids), ScoresheetCell.team_id.in_(team_ids),
                         ScoresheetCell.subject_kind == 'shared'))
    return select(ScoresheetCell).join(PlayScoresheet, PlayScoresheet.id == ScoresheetCell.sheet_id).join(
        Play, Play.id == PlayScoresheet.play_id).where(*valid)


def sheet_results(db, q, actor):
    """Attach one result to each score-sheet subject, never multiply team cells by players."""
    cells = sheet_cells(db, q, actor).subquery()
    sid = subject(db, q, actor)
    gave_up = case((cells.c.subject_kind == 'player', PlayPlayer.score_status == 'gave_up'),
                  (cells.c.subject_kind == 'team', PlayTeam.score_status == 'gave_up'),
                  else_=Play.shared_score_status == 'gave_up')
    if sid:
        from sqlalchemy.orm import aliased
        personal = aliased(PlayPlayer)
        gave_up = or_(gave_up, select(personal.id).where(personal.play_id == Play.id,
            personal.person_id == sid, personal.score_status == 'gave_up').exists())
    eligible = and_(Play.stats_exclusion == 'none', or_(Play.result_status == 'resolved', gave_up))
    outcome = case((gave_up, 'loss'), (cells.c.subject_kind == 'player', PlayPlayer.outcome),
                   (cells.c.subject_kind == 'team', PlayTeam.outcome), else_=Play.cooperative_result)
    query = select(cells, eligible.label('result_eligible'), outcome.label('subject_outcome')).join(
        Play, Play.id == cells.c.play_id).outerjoin(PlayPlayer, PlayPlayer.id == cells.c.player_id).outerjoin(
        PlayTeam, PlayTeam.id == cells.c.team_id)
    if q.result_filter:
        from app.services.boardgame_detail_stats import outcome_condition
        query = query.where(outcome_condition(q.result_filter, eligible, outcome))
    return query.subquery()


def scoresheet_groups(db, q, actor):
    cells = sheet_cells(db, q, actor).subquery()
    # Count one subject per sheet, independent of its number of score categories.
    subjects = select(cells.c.sheet_id, cells.c.subject_key).distinct().subquery()
    per_sheet = select(subjects.c.sheet_id, func.count().label('n')).group_by(subjects.c.sheet_id).subquery()
    sheets = select(cells.c.sheet_id).distinct()
    stmt = select(PlayScoresheet.sheet_comparison_key.label('key'), func.count().label('play_count'),
        cast(func.sum(per_sheet.c.n), Integer).label('subject_samples'), func.min(PlayScoresheet.play_id).label('example_play_id'))
    stmt = stmt.join(per_sheet, per_sheet.c.sheet_id == PlayScoresheet.id).where(PlayScoresheet.id.in_(sheets))
    stmt = stmt.group_by(PlayScoresheet.sheet_comparison_key)
    def render(r):
        obj = get(db, Play, r['example_play_id'])
        sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
        return dict(sheet_comparison_key=r['key'], comparison_key=obj.comparison_key, template_key=sheet.template_key,
            play_count=r['play_count'], subject_samples=r['subject_samples'],
            drilldown=drilldown(q, sheet_comparison_key=r['key']))
    return ranked(db, q, stmt, 'play_count', render)


def score_rows(db, q, actor):
    if not q.game_id or not q.sheet_comparison_key:
        fail('game_sheet_comparison_required')
    cells = sheet_results(db, q, actor)
    sheet = db.scalar(select(PlayScoresheet).join(Play, Play.id == PlayScoresheet.play_id).where(
        Play.game_id == q.game_id, PlayScoresheet.sheet_comparison_key == q.sheet_comparison_key,
        PlayScoresheet.id.in_(select(cells.c.sheet_id))).limit(1))
    review = None
    if sheet:
        from app.services.boardgame_scoresheet import definition
        from app.schemas.boardgame import Sheet
        review = db.scalar(select(ScoresheetTemplate).where(ScoresheetTemplate.game_id == q.game_id,
            ScoresheetTemplate.definition_hash == digest(definition(Sheet.model_validate(sheet.display_data)))))
    mode = q.mode or (get(db, Play, sheet.play_id).competition_mode if sheet else None)
    additive = review.additive_row_keys if review else []
    complete = None
    if additive:
        complete = select(cells.c.sheet_id, cells.c.subject_key, func.sum(cells.c.value_number).label('total')).where(
            cells.c.row_key.in_(additive)).group_by(cells.c.sheet_id, cells.c.subject_key).having(
                func.count(cells.c.value_number) == len(additive)).subquery()
    total, samples = db.execute(select(func.sum(complete.c.total), func.count()).select_from(complete)).one() if complete is not None else (None, 0)
    stmt = select(cells.c.row_key.label('key'), func.min(cells.c.row_label).label('row_label'),
        func.min(cells.c.row_order).label('row_order'), func.count().label('sample_count'),
        func.count(cells.c.value_number).label('numeric_samples'), func.avg(cells.c.value_number).label('average'),
        func.min(cells.c.value_number).label('min'), func.max(cells.c.value_number).label('max')).where(
            cells.c.is_aggregate.is_(False)).group_by(cells.c.row_key)
    if q.row_key:
        stmt = stmt.where(cells.c.row_key == q.row_key)
    def render(r):
        numerator = db.scalar(select(func.sum(cells.c.value_number)).join(complete, and_(complete.c.sheet_id == cells.c.sheet_id,
            complete.c.subject_key == cells.c.subject_key)).where(cells.c.row_key == r['key'])) if complete is not None and r['key'] in additive else None
        rate = numerator / total if numerator is not None and total else None
        by_result = {}
        for label, condition in (('winner', and_(cells.c.result_eligible, cells.c.subject_outcome.in_(['win','success']))),
            ('non_winner', and_(cells.c.result_eligible, cells.c.subject_outcome.in_(['loss','draw','failure']))),
            ('unknown', ~cells.c.result_eligible)):
            n, known, mean = db.execute(select(func.count(), func.count(cells.c.value_number), func.avg(cells.c.value_number)).where(
                cells.c.row_key == r['key'], condition)).one()
            by_result[label] = dict(subject_samples=n, numeric_samples=known, missing_samples=n-known,
                average=decimal_score(mean), drilldown=drilldown(q, row_key=r['key'], result_filter=label, mode=mode))
        return dict(row_key=r['key'], row_label=r['row_label'], sample_count=r['sample_count'], numeric_samples=r['numeric_samples'],
            missing_samples=r['sample_count']-r['numeric_samples'], average=decimal_score(r['average']), min=safe(r['min']), max=safe(r['max']),
            contribution_rate=float(rate) if rate is not None else None, contribution_samples=samples if numerator is not None else 0,
            contribution_reason=None if rate is not None else 'zero_or_incomplete_denominator' if additive else 'non_additive_or_unknown_template',
            by_result=by_result, drilldown=drilldown(q, row_key=r['key']))
    return ranked(db, q, stmt, 'row_order', render, descending=False)

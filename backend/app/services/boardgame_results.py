"""Competitive result resolution without inventing missing score or rank values."""

from app.services.boardgame_common import fail


def resolve_units(data, units, verify):
    eligible = [u for u in units if u['score_status'] != 'gave_up']
    direction = data['score_direction']
    source = data['result_source']
    winners = [u for u in eligible if u.get('outcome') == 'win']
    scores_complete = bool(eligible) and all(u['score'] is not None for u in eligible)
    ranks_complete = bool(eligible) and all(u['rank'] is not None for u in eligible)
    if source in ('auto', 'source'):
        method = 'score' if direction in ('high', 'low') and scores_complete else 'manual_rank' if ranks_complete else 'manual_winner'
    else:
        method = source
    if method not in ('score', 'manual_rank', 'manual_winner', 'tiebreak'):
        fail('result_source_required')
    data['result_source'] = source if source == 'source' else method
    data['tiebreak_applied'] = method == 'tiebreak'
    if not eligible:
        return
    if method == 'manual_winner':
        draws = [u for u in eligible if u.get('outcome') == 'draw']
        if not winners and len(draws) < 2:
            fail('winner_required')
        if winners and draws:
            fail('winner_draw_conflict')
        leading = winners or draws
        if direction in ('high', 'low') and scores_complete:
            best = (max if direction == 'high' else min)(u['score'] for u in eligible)
            if any(u['score'] != best for u in leading):
                fail('winner_score_conflict')
            tied = [u for u in eligible if u['score'] == best]
            if len(leading) < len(tied):
                fail('tiebreak_source_required')
        known_ranks = [u['rank'] for u in eligible if u['rank'] is not None]
        if any(u['rank'] is not None and ((u in leading and u['rank'] != 1) or (u not in leading and u['rank'] == 1)) for u in eligible):
            fail('winner_rank_conflict')
        if known_ranks and any(r > len(units) for r in known_ranks):
            fail('invalid_competition_ranks')
        for unit in eligible:
            expected = 'win' if unit in winners else 'draw' if unit in draws else 'loss'
            if verify and unit['outcome'] not in (None, expected):
                fail('inconsistent_result')
            unit['outcome'] = expected
        return
    if method in ('score', 'tiebreak'):
        if direction not in ('high', 'low') or not scores_complete:
            fail('complete_scores_required')
        ordered = sorted([u['score'] for u in eligible], reverse=direction == 'high')
        ranks = [ordered.index(u['score']) + 1 for u in eligible]
        if method == 'tiebreak':
            top = [u for u, rank in zip(eligible, ranks) if rank == 1]
            if not data.get('result_reason'):
                fail('tiebreak_reason_required')
            if len(top) < 2 or not winners or len(winners) >= len(top) or any(u not in top for u in winners):
                fail('invalid_tiebreak_winners')
            ranks = [1 if u in winners else len(winners) + 1 if u in top else rank for u, rank in zip(eligible, ranks)]
    else:
        if not ranks_complete:
            fail('manual_ranks_required')
        ranks = [u['rank'] for u in eligible]
        ordered = sorted(ranks)
        if any(r != ordered.index(r) + 1 for r in ranks):
            fail('invalid_competition_ranks')
        if direction in ('high', 'low') and scores_complete:
            for first in eligible:
                for second in eligible:
                    if first['rank'] < second['rank'] and (first['score'] < second['score'] if direction == 'high' else first['score'] > second['score']):
                        fail('rank_score_conflict')
    tied = ranks.count(1) > 1
    for unit, rank in zip(eligible, ranks):
        outcome = 'loss' if rank > 1 else 'draw' if tied and data['tie_policy'] == 'draw' else 'win'
        if verify and ((unit['rank'] is not None and unit['rank'] != rank) or (unit['outcome'] and unit['outcome'] != outcome)):
            fail('inconsistent_result')
        unit['rank'], unit['outcome'] = rank, outcome

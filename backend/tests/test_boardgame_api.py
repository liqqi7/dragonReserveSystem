"""Synthetic HTTP acceptance cases; never loads the user's export or credentials."""

from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, text

from app.core.config import get_settings
from app.models import ActivityParticipant
from app.models.boardgame import BoardGame, Inventory, Person, Nomination, Play, PlayPlayer, ScoresheetCell
from app.services.boardgame_catalog import provision_person
from app.services.boardgame_common import now


@pytest.fixture(autouse=True)
def boardgame_feature(monkeypatch, db_session):
    monkeypatch.setattr(get_settings(), 'boardgame_enabled', True)
    if db_session.bind.dialect.name == 'sqlite':
        db_session.execute(text('PRAGMA foreign_keys=ON'))
    db_session.commit()


def create(client, headers, path, payload, expected=201, key=None):
    response = client.post('/api/v1' + path, headers={**headers, 'Idempotency-Key': key or str(uuid4())}, json=payload)
    assert response.status_code == expected, response.text
    return response.json()


def game(client, headers, name='虚构测试游戏', **values):
    return create(client, headers, '/boardgames', {'name': name, **values})


def people(db, *users):
    ids = [provision_person(db, user).id for user in users]
    db.commit()
    return ids


def play_form(game_id, persons, **extra):
    return dict(game_id=game_id, played_on=now().date().isoformat(), status='completed',
        competition_mode='individual', score_direction='high', result_status='resolved',
        players=[dict(person_id=pid, seat_order=i+1, score=str(10-i)) for i, pid in enumerate(persons)], **extra)


def test_catalog_inventory_permissions_and_idempotency(client, db_session, user_headers, normal_user, second_user_headers, second_user, admin_headers):
    key = str(uuid4())
    g = create(client, user_headers, '/boardgames', {'name': '虚构库存游戏'}, key=key)
    repeated = create(client, user_headers, '/boardgames', {'name': '虚构库存游戏'}, key=key)
    assert repeated['id'] == g['id']
    create(client, user_headers, '/boardgames', {'name': '不同请求'}, expected=409, key=key)
    result = create(client, user_headers, '/boardgame-inventory', dict(game_id=g['id'], owner_user_id=normal_user.id,
        quantity=2, purchased_on='2026-01-01', storage_location='私人位置', remark='私人备注'))
    assert len(result['items']) == 2
    box = result['items'][0]
    assert box['internal']['storage_location'] == '私人位置'
    public = client.get(f'/api/v1/boardgame-inventory/{box["id"]}', headers=second_user_headers).json()
    assert 'internal' not in public
    denied = client.patch(f'/api/v1/boardgame-inventory/{box["id"]}', headers=second_user_headers,
                         json={'expected_revision': 1, 'remark': '越权'})
    assert denied.status_code == 403
    create(client, user_headers, '/boardgame-inventory', dict(game_id=g['id'], owner_user_id=second_user.id), expected=403)
    create(client, second_user_headers, '/boardgame-inventory', dict(game_id=g['id'], owner_user_id=second_user.id))
    denied = client.patch(f'/api/v1/boardgames/{g["id"]}', headers=user_headers,
                         json={'expected_revision': 1, 'set_overrides': {'name': '改共享资料'}})
    assert denied.status_code == 403
    assert client.get(f'/api/v1/boardgames/{g["id"]}/source', headers=user_headers).status_code == 403


def test_recording_and_stats_do_not_count_recorder(client, db_session, user_headers, admin_headers,
    normal_user, second_user, admin_user, signed_up_activity):
    ids = people(db_session, normal_user, second_user, admin_user)
    g = game(client, user_headers)
    form = play_form(g['id'], [ids[1], ids[2]], activity_id=signed_up_activity.id)
    create(client, user_headers, '/boardgame-plays', form, expected=403)
    participant = db_session.scalar(select(ActivityParticipant).where(ActivityParticipant.user_id == normal_user.id,
                                                                      ActivityParticipant.activity_id == signed_up_activity.id))
    participant.checked_in_at = now()
    db_session.commit()
    obj = create(client, user_headers, '/boardgame-plays', form)
    assert [p['rank'] for p in obj['players']] == [1, 2]
    assert obj['statistics_eligibility']['counts_as_play']
    all_stats = client.get('/api/v1/boardgame-stats/overview', headers=user_headers)
    assert all_stats.status_code == 200, all_stats.text
    assert all_stats.json()['completed_play_count'] == 1
    mine = client.get('/api/v1/boardgame-stats/overview?scope=mine', headers=user_headers)
    assert mine.status_code == 200, mine.text
    assert mine.json()['completed_play_count'] == 0
    result = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/players?mode=individual&sort=win_rate', headers=user_headers)
    assert result.status_code == 200, result.text
    assert result.json()['items'][0]['result']['win_rate'] == 1
    create(client, user_headers, '/boardgame-plays', form, expected=409)
    obj2 = create(client, user_headers, '/boardgame-plays', {**form, 'duplicate_ack_ids': [obj['id']]})
    assert obj2['id'] != obj['id']


def test_scoresheet_stable_ids_conflicts_and_missing_samples(client, db_session, user_headers, admin_headers, normal_user, second_user):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    obj = create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids))
    pids = [p['id'] for p in obj['players']]
    sheet = dict(groups=[dict(key='round:1', label='第一轮', rows=[dict(key='round:1/cards', label='卡牌分')])],
        subjects=[dict(key=f'p:{pid}', kind='player', player_id=pid) for pid in pids],
        cells=[dict(row_key='round:1/cards', subject_key=f'p:{pids[0]}', value_number='0')],
        recorded_totals=[dict(subject_key=f'p:{pids[0]}', value_number='10')])
    result = client.put(f'/api/v1/boardgame-plays/{obj["id"]}/scoresheet', headers=user_headers,
        json=dict(expected_revision=1, sheet_revision=0, reason='补录分项', sheet=sheet))
    assert result.status_code == 200, result.text
    assert len(list(db_session.scalars(select(ScoresheetCell)))) == 2
    current = client.get(f'/api/v1/boardgame-plays/{obj["id"]}', headers=user_headers).json()
    patch = client.patch(f'/api/v1/boardgame-plays/{obj["id"]}', headers=user_headers,
        json=dict(expected_revision=current['revision'], reason='备注', note='补充'))
    assert patch.status_code == 200, patch.text
    assert [p['id'] for p in patch.json()['players']] == pids
    review = client.post(f'/api/v1/boardgame-plays/{obj["id"]}/scoresheet/review-template', headers=admin_headers,
        json=dict(expected_revision=patch.json()['revision'], sheet_revision=result.json()['revision'],
                  semantic_version='test-1', additive_row_keys=['round:1/cards'], reason='验证模板'))
    assert review.status_code == 200, review.text
    groups = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/scoresheet-groups', headers=user_headers)
    assert groups.status_code == 200, groups.text
    key = groups.json()['items'][0]['sheet_comparison_key']
    rows = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/scoresheets?sheet_comparison_key={key}', headers=user_headers)
    assert rows.status_code == 200, rows.text
    assert rows.json()['items'][0]['missing_samples'] == 1
    assert rows.json()['items'][0]['numeric_samples'] == 1


def test_nomination_withdrawal_does_not_auto_restore(client, db_session, user_headers, normal_user, signed_up_activity):
    g = game(client, user_headers)
    path = f'/api/v1/activities/{signed_up_activity.id}/nominations/{g["id"]}/me'
    vote = client.put(path, headers=user_headers, json={'expected_revision': 0})
    assert vote.status_code == 200, vote.text
    assert client.delete(f'/api/v1/activities/{signed_up_activity.id}/signup', headers=user_headers).status_code == 204
    row = db_session.scalar(select(Nomination))
    assert row.state == 'ineligible'
    assert client.post(f'/api/v1/activities/{signed_up_activity.id}/signup', headers=user_headers).status_code == 200
    assert client.get('/api/v1/boardgame-stats/wanted', headers=user_headers).json()['items'] == []
    restored = client.put(path, headers=user_headers, json={'expected_revision': row.revision})
    assert restored.status_code == 200, restored.text


@pytest.mark.parametrize('score_status', ['unrecorded', 'gave_up', 'unfinished', 'table_flip'])
def test_personal_score_states_preserve_zero_and_participation(client, db_session, user_headers, normal_user, second_user, score_status):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    form = play_form(g['id'], ids)
    form['result_status'] = 'unknown'
    form['players'][0].update(score='0')
    form['players'][1].update(score=None, score_status=score_status)
    obj = create(client, user_headers, '/boardgame-plays', form)
    assert obj['players'][0]['score_status'] == 'recorded'
    assert float(obj['players'][0]['score']) == 0
    assert obj['players'][1]['score_status'] == score_status
    assert obj['players'][1]['score'] is None
    assert obj['players'][1]['outcome'] == ('loss' if score_status == 'gave_up' else None)
    totals = client.get('/api/v1/boardgame-stats/overview', headers=user_headers).json()
    assert totals['completed_play_count'] == 1
    assert totals['player_appearances'] == 2
    assert totals['results_by_mode']['individual']['eligible_samples'] == (1 if score_status == 'gave_up' else 0)
    form['players'][1]['score'] = '0'
    create(client, user_headers, '/boardgame-plays', form, expected=422)


def test_whole_table_flip_is_abandoned_and_not_a_completed_play(client, db_session, user_headers, normal_user, second_user):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    form = play_form(g['id'], ids)
    form.update(status='abandoned', end_reason='table_flip', result_status='unknown')
    for player in form['players']:
        player.update(score=None, score_status='table_flip')
    obj = create(client, user_headers, '/boardgame-plays', form)
    assert obj['end_reason'] == 'table_flip'
    totals = client.get('/api/v1/boardgame-stats/overview', headers=user_headers).json()
    assert totals['completed_play_count'] == 0
    assert totals['abandoned_count'] == 1


def test_native_users_and_gave_up_are_known_nonwins(client, db_session, user_headers, normal_user, second_user):
    g = game(client, user_headers)
    options = client.get('/api/v1/boardgame-plays/options', headers=user_headers).json()
    assert options['rules']['gave_up_counts_as_loss']
    members = client.get('/api/v1/boardgame-members', headers=user_headers).json()['items']
    assert {u['user_id'] for u in members} == {normal_user.id, second_user.id}
    assert all(set(u) == {'id', 'user_id', 'nickname', 'avatar_url'} for u in members)
    form = dict(game_id=g['id'], played_on=now().date().isoformat(), status='completed', competition_mode='individual',
        score_direction='high', result_status='unknown', duration_minutes=30,
        players=[dict(user_id=normal_user.id, seat_order=1, score_status='gave_up'),
                 dict(user_id=second_user.id, seat_order=2)])
    obj = create(client, user_headers, '/boardgame-plays', form)
    mine = client.get(f'/api/v1/boardgame-stats/overview?scope=mine&game_id={g["id"]}', headers=user_headers).json()
    assert mine['results_by_mode']['individual']['eligible_samples'] == 1
    assert mine['results_by_mode']['individual']['losses'] == 1
    assert mine['results_by_mode']['individual']['win_rate'] == 0
    assert mine['average_duration_minutes'] == 30
    ranked = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/players?mode=individual&sort=win_rate', headers=user_headers).json()['items']
    assert len(ranked) == 1 and ranked[0]['result']['wins'] == 0
    form.update(result_status='resolved', duplicate_ack_ids=[obj['id']])
    form['players'][1]['score'] = '-10'
    resolved = create(client, user_headers, '/boardgame-plays', form)
    assert resolved['players'][0]['score'] is None and resolved['players'][0]['rank'] is None
    assert resolved['players'][0]['outcome'] == 'loss'
    assert resolved['players'][1]['outcome'] == 'win'  # -10 still wins over a forfeit, not an invented zero.


@pytest.mark.parametrize('mode', ['team', 'cooperative', 'solo', 'unscored'])
def test_modes_use_correct_subject_and_sample_units(client, db_session, user_headers, normal_user, second_user, mode):
    g = game(client, user_headers)
    form = dict(game_id=g['id'], played_on=now().date().isoformat(), status='completed', competition_mode=mode,
        score_direction='high' if mode != 'unscored' else 'none', result_status='resolved' if mode != 'unscored' else 'unknown',
        players=[dict(user_id=normal_user.id, seat_order=1, score_status='gave_up')], duration_minutes=10)
    if mode != 'solo':
        form['players'].append(dict(user_id=second_user.id, seat_order=2))
    if mode == 'team':
        for p, key in zip(form['players'], ['a', 'b']):
            p['team_key'] = key
        form['teams'] = [dict(client_key='a', name='甲队', score='20'), dict(client_key='b', name='乙队', score='10')]
    elif mode in ('cooperative', 'solo'):
        form['cooperative_result'] = 'success' if mode == 'cooperative' else None
    obj = create(client, user_headers, '/boardgame-plays', form)
    result = client.get(f'/api/v1/boardgame-stats/overview?game_id={g["id"]}&scope=mine', headers=user_headers)
    assert result.status_code == 200, result.text
    assert result.json()['completed_play_count'] == 1 and result.json()['known_duration_minutes'] == 10
    if mode != 'unscored':
        metric = 'win_rate' if mode == 'team' else 'success_rate'
        assert result.json()['results_by_mode'][mode][metric] == 0
        ranked = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/players?scope=mine&mode={mode}&sort={metric}', headers=user_headers)
        assert ranked.status_code == 200, ranked.text
        assert ranked.json()['items'][0]['result'][metric] == 0
        roles = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/roles?mode={mode}&comparison_key={obj["comparison_key"]}', headers=user_headers)
        assert roles.status_code == 200, roles.text


def test_stats_filters_and_chart_drilldowns_match(client, db_session, user_headers, normal_user, second_user):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    exp = game(client, user_headers, name='虚构扩展', game_type='expansion')
    form = play_form(g['id'], ids, duration_minutes=45, play_environment='online',
        expansions=[dict(game_id=exp['id'], compatibility_note='自定义兼容规则')])
    obj = create(client, user_headers, '/boardgame-plays', form)
    query = [('period', 'quarter'), ('year', now().year), ('quarter', (now().month-1)//3+1),
             ('person_ids', ids[0]), ('person_ids', ids[1]), ('person_match', 'exactly'), ('expansion_ids', exp['id']), ('expansion_match', 'exactly')]
    totals = client.get('/api/v1/boardgame-stats/overview', headers=user_headers, params=query)
    assert totals.status_code == 200 and totals.json()['completed_play_count'] == 1, totals.text
    for path in ['breakdowns?dimension=weekday', 'trends?bucket=activity', 'locations', 'most-played', 'partners?scope=mine', 'expansions']:
        chart = client.get('/api/v1/boardgame-stats/' + path, headers=user_headers)
        assert chart.status_code == 200, chart.text
        row = next(r for r in chart.json()['items'] if r.get('completed_play_count', r.get('play_count', r.get('shared_play_count', 0))) > 0)
        drill = row['drilldown']
        detail = client.get('/api/v1' + drill['path'], headers=user_headers, params=drill['query'])
        assert detail.status_code == 200, detail.text
        assert [x['id'] for x in detail.json()['items']] == [obj['id']]
    assert client.get('/api/v1/boardgame-stats/overview?weekdays=8', headers=user_headers).status_code == 422
    assert client.get('/api/v1/boardgame-stats/overview?period=year', headers=user_headers).status_code == 422


def test_cutoff_freezes_then_postponement_reopens(client, db_session, user_headers, admin_headers, signed_up_activity):
    g = game(client, user_headers)
    path = f'/api/v1/activities/{signed_up_activity.id}/nominations/{g["id"]}/me'
    assert client.put(path, headers=user_headers, json={'expected_revision': 0}).status_code == 200
    signed_up_activity.start_time = now() - timedelta(minutes=1)
    signed_up_activity.signup_deadline = now() + timedelta(hours=1)
    db_session.commit()
    response = client.get(f'/api/v1/activities/{signed_up_activity.id}', headers=user_headers)
    assert response.status_code == 200, response.text
    nomination = db_session.scalar(select(Nomination))
    assert nomination.state == 'frozen'
    assert client.put(path, headers=user_headers, json={'expected_revision': nomination.revision}).status_code == 409
    # Use the real service transaction to verify pre/post update hooks, preserving old check-in logic.
    from app.schemas.activity import ActivityUpdateRequest
    from app.services.activity_service import update_activity
    payload = ActivityUpdateRequest.model_validate({'start_time': now() + timedelta(days=2),
        'end_time': now() + timedelta(days=2, hours=3), 'signup_deadline': now() + timedelta(days=1)})
    update_activity(db_session, signed_up_activity, payload)
    assert nomination.state == 'active'


def test_checkin_revocation_blocks_new_record_but_allows_correction(client, db_session, user_headers, admin_headers, normal_user, second_user, signed_up_activity):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    participant = db_session.scalar(select(ActivityParticipant).where(ActivityParticipant.activity_id == signed_up_activity.id))
    participant.checked_in_at = now()
    db_session.commit()
    obj = create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids, activity_id=signed_up_activity.id))
    from app.services.activity_service import admin_cancel_checkin_participant
    from app.models import User
    admin_cancel_checkin_participant(db_session, signed_up_activity, participant.id, db_session.get(User, signed_up_activity.created_by))
    create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids, activity_id=signed_up_activity.id), expected=403)
    patched = client.patch(f'/api/v1/boardgame-plays/{obj["id"]}', headers=user_headers,
        json={'expected_revision': obj['revision'], 'reason': '修正已记录备注', 'note': '测试'})
    assert patched.status_code == 200, patched.text


def test_catalog_sort_cursor_and_preparse_request_limit(client, user_headers):
    first = game(client, user_headers, name='先创建后排序', sort_order=20)
    second = game(client, user_headers, name='后创建先排序', sort_order=10)
    response = client.get('/api/v1/boardgames?limit=1', headers=user_headers)
    assert response.status_code == 200, response.text
    assert response.json()['items'][0]['id'] == second['id']
    next_page = client.get('/api/v1/boardgames', headers=user_headers, params={'limit': 1, 'cursor': response.json()['next_cursor']})
    assert next_page.status_code == 200 and next_page.json()['items'][0]['id'] == first['id'], next_page.text
    invalid = client.get('/api/v1/boardgames', headers=user_headers, params={'sort': 'recent', 'cursor': response.json()['next_cursor']})
    assert invalid.status_code == 422
    import base64
    import json
    decoded = json.loads(base64.urlsafe_b64decode(response.json()['next_cursor']))
    decoded['value'] = {'invalid': 'order value'}
    malformed_cursor = base64.urlsafe_b64encode(json.dumps(decoded).encode()).decode()
    assert client.get('/api/v1/boardgames', headers=user_headers, params={'cursor': malformed_cursor}).status_code == 422
    oversized = client.post('/api/v1/boardgames', headers={**user_headers, 'Content-Type': 'application/json'},
                            content=b'{' + b'x' * (513 * 1024))
    assert oversized.status_code == 413  # Rejected before attempting to parse invalid JSON.


def test_catalog_merge_refreshes_comparison_groups(client, db_session, user_headers, admin_headers, normal_user, second_user):
    ids = people(db_session, normal_user, second_user)
    source, target = game(client, user_headers, name='重复资料'), game(client, user_headers, name='目标资料')
    original = create(client, user_headers, '/boardgame-plays', play_form(source['id'], ids))
    preview = client.get(f'/api/v1/boardgames/{source["id"]}/merge-preview?target_id={target["id"]}', headers=admin_headers)
    assert preview.status_code == 200, preview.text
    assert not preview.json()['conflicts']
    merged = client.post(f'/api/v1/boardgames/{source["id"]}/merge', headers=admin_headers,
        json={k: v for k, v in {**preview.json(), 'reason': '合并重复资料'}.items() if k in ('target_id', 'source_revision', 'target_revision', 'preview_hash', 'reason')})
    assert merged.status_code == 200, merged.text
    current = client.get(f'/api/v1/boardgame-plays/{original["id"]}', headers=user_headers).json()
    assert current['game_id'] == target['id'] and current['revision'] == original['revision'] + 1
    assert current['comparison_key'] != original['comparison_key']
    assert current['game_snapshot']['name'] == '重复资料'


def test_winner_only_and_tiebreak_preserve_missing_scores(client, user_headers, normal_user, second_user):
    g = game(client, user_headers)
    form = dict(game_id=g['id'], played_on=now().date().isoformat(), status='completed', competition_mode='individual',
        score_direction='none', result_status='resolved', result_source='manual_winner', players=[
            dict(user_id=normal_user.id, seat_order=1, outcome='win'), dict(user_id=second_user.id, seat_order=2)])
    result = create(client, user_headers, '/boardgame-plays', form)
    assert [p['outcome'] for p in result['players']] == ['win', 'loss']
    assert all(p['score'] is None and p['rank'] is None for p in result['players'])
    assert result['result_source'] == 'manual_winner'
    form.update(score_direction='high', result_source='tiebreak', result_reason='同分按剩余资源决胜', duplicate_ack_ids=[result['id']])
    for player in form['players']:
        player['score'] = '0'
    tied = create(client, user_headers, '/boardgame-plays', form)
    assert tied['tiebreak_applied'] and [p['rank'] for p in tied['players']] == [1, 2]
    assert [p['score'] for p in tied['players']] == ['0.000', '0.000']
    assert tied['result_reason'] == '同分按剩余资源决胜'
    form['players'][0]['score'] = '-1'
    create(client, user_headers, '/boardgame-plays', form, expected=422)
    form['players'][0].update(score=None, score_status='gave_up')
    create(client, user_headers, '/boardgame-plays', form, expected=422)


def test_observers_and_automa_have_distinct_statistical_roles(client, user_headers, normal_user, second_user):
    g = game(client, user_headers)
    form = dict(game_id=g['id'], played_on=now().date().isoformat(), status='completed', competition_mode='individual',
        score_direction='high', result_status='resolved', players=[
            dict(user_id=second_user.id, seat_order=1, score='10'),
            dict(guest_key=str(uuid4()), display_name='自动对手', participant_kind='automa', seat_order=2, score='5')],
        observers=[dict(user_id=normal_user.id, observer_role='teacher')])
    result = create(client, user_headers, '/boardgame-plays', form)
    assert result['player_count'] == 2 and result['human_player_count'] == 1
    assert result['observers'][0]['observer_role'] == 'teacher'
    mine = client.get('/api/v1/boardgame-stats/overview?scope=mine', headers=user_headers)
    assert mine.status_code == 200 and mine.json()['completed_play_count'] == 0, mine.text
    ranking = client.get(f'/api/v1/boardgame-stats/games/{g["id"]}/players?mode=individual', headers=user_headers)
    assert ranking.status_code == 200 and len(ranking.json()['items']) == 1, ranking.text


def test_timer_pauses_recovery_and_exclusion_are_versioned(client, db_session, monkeypatch, user_headers, normal_user, second_user):
    from app.services import boardgame_play as service
    g = game(client, user_headers)
    obj = create(client, user_headers, '/boardgame-plays', dict(game_id=g['id'],
        players=[dict(user_id=normal_user.id, seat_order=1)], round_count=4, stats_exclusion='all', exclusion_reason='测试计时'))
    path = f'/api/v1/boardgame-plays/{obj["id"]}/timer'
    instant = now()
    monkeypatch.setattr(service, 'now', lambda: instant)
    start = client.post(path, headers=user_headers, json={'expected_revision': obj['revision'], 'action': 'start'})
    assert start.status_code == 200, start.text
    instant += timedelta(seconds=120)
    paused = client.post(path, headers=user_headers, json={'expected_revision': start.json()['revision'], 'action': 'pause'})
    assert paused.status_code == 200 and paused.json()['timer_elapsed_seconds'] == 120, paused.text
    stale = client.post(path, headers=user_headers, json={'expected_revision': start.json()['revision'], 'action': 'pause'})
    assert stale.status_code == 409
    instant += timedelta(seconds=300)
    resumed = client.post(path, headers=user_headers, json={'expected_revision': paused.json()['revision'], 'action': 'resume'})
    assert resumed.status_code == 200, resumed.text
    instant += timedelta(seconds=30)
    stopped = client.post(path, headers=user_headers, json={'expected_revision': resumed.json()['revision'], 'action': 'stop'})
    assert stopped.status_code == 200, stopped.text
    assert stopped.json()['timer_elapsed_seconds'] == 150 and stopped.json()['duration_minutes'] == 3
    restored = client.post(path, headers=user_headers, json={'expected_revision': stopped.json()['revision'], 'action': 'restore'})
    assert restored.status_code == 200 and restored.json()['timer_status'] == 'paused', restored.text
    assert restored.json()['round_count'] == 4 and restored.json()['stats_exclusion'] == 'all'


def test_automatic_round_sheet_and_safe_expression(client, user_headers, normal_user, second_user):
    g = game(client, user_headers)
    obj = create(client, user_headers, '/boardgame-plays', dict(game_id=g['id'], status='completed',
        played_on=now().date().isoformat(), competition_mode='individual', score_direction='high',
        players=[dict(user_id=normal_user.id, seat_order=1), dict(user_id=second_user.id, seat_order=2)]))
    path = f'/api/v1/boardgame-plays/{obj["id"]}/scoresheet'
    response = client.post(path + '/from-template', headers=user_headers, json=dict(expected_revision=obj['revision'],
        sheet_revision=0, builtin='rounds', round_count=2, scoring_method='best_total', reason='记录每轮得分'))
    assert response.status_code == 200, response.text
    original = response.json()
    fields = ('schema_version','template_key','template_id','template_family','template_version','sheet_type','scoring_method',
              'apply_totals','groups','subjects','cells','recorded_totals')
    form = {k: original[k] for k in fields}
    subjects = [s['key'] for s in form['subjects']]
    form['cells'] = [dict(row_key=f'round:{r}/points', subject_key=subjects[p], expression=expression)
        for r, p, expression in [(1,0,'(2 + 3) * 4'),(1,1,'0'),(2,0,'-5'),(2,1,'12')]]
    saved = client.put(path, headers=user_headers, json=dict(expected_revision=original['play_revision'],
        sheet_revision=original['revision'], reason='填写计算过程', sheet=form))
    assert saved.status_code == 200, saved.text
    assert saved.json()['cells'][0]['expression'] == '(2 + 3) * 4'
    latest = client.get(f'/api/v1/boardgame-plays/{obj["id"]}', headers=user_headers).json()
    assert [p['score'] for p in latest['players']] == ['15.000', '12.000']
    assert [p['outcome'] for p in latest['players']] == ['win', 'loss']
    form['scoring_method'] = 'rounds_won'
    preview = client.post(path + '/preview', headers=user_headers, json=dict(expected_revision=latest['revision'],
        sheet_revision=saved.json()['revision'], sheet=form))
    assert preview.status_code == 200, preview.text
    assert set(preview.json()['calculation']['totals'].values()) == {'1.000'}
    form['cells'][0]['expression'] = '__import__("os")'
    invalid = client.put(path, headers=user_headers, json=dict(expected_revision=latest['revision'],
        sheet_revision=saved.json()['revision'], reason='不支持的表达式', sheet=form))
    assert invalid.status_code == 422
    current = client.get(f'/api/v1/boardgame-plays/{obj["id"]}', headers=user_headers).json()
    assert current['revision'] == latest['revision'] and current['players'][0]['score'] == '15.000'


def test_typed_sheet_and_template_versions_keep_history(client, user_headers, admin_headers, normal_user, second_user):
    g = game(client, user_headers)
    definition = dict(schema_version=2, groups=[dict(key='score', label='得分', rows=[
        dict(key='base', label='基础', repeatable=True), dict(key='bonus', label='奖励', kind='radio', selection_value='5'),
        dict(key='check', label='完成', kind='checkbox', selection_value='2'),
        dict(key='choice', label='任务', kind='choice', options=[dict(key='a', label='任务 A', value='3')]),
        dict(key='note', label='备注', kind='text', contributes=False),
        dict(key='subtotal', label='小计', kind='subtotal')])], subjects=[], cells=[])
    payload = dict(game_id=g['id'], name='测试模板', template_family='synthetic', version_number=1,
        semantic_version='1', definition=definition, additive_row_keys=['base','bonus','check','choice'])
    template = create(client, admin_headers, '/boardgame-score-templates', payload)
    payload['version_number'], payload['semantic_version'] = 2, '2'
    payload['definition']['groups'][0]['rows'][0]['label'] = '基础分（新版）'
    second = create(client, admin_headers, '/boardgame-score-templates', payload)
    assert second['id'] != template['id']
    obj = create(client, user_headers, '/boardgame-plays', dict(game_id=g['id'], competition_mode='individual', score_direction='high',
        players=[dict(user_id=normal_user.id, seat_order=1), dict(user_id=second_user.id, seat_order=2)]))
    response = client.post(f'/api/v1/boardgame-plays/{obj["id"]}/scoresheet/from-template', headers=user_headers,
        json=dict(expected_revision=obj['revision'], sheet_revision=0, template_id=template['id']))
    assert response.status_code == 200, response.text
    sheet = response.json()
    assert sheet['template_version'] == 1 and sheet['groups'][0]['rows'][0]['label'] == '基础'
    options = client.get(f'/api/v1/boardgame-score-templates?game_id={g["id"]}&play_id={obj["id"]}', headers=user_headers)
    assert options.status_code == 200 and len(options.json()['items']) == 2, options.text
    assert len(options.json()['builtins']) == 2

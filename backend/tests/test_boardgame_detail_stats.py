"""Statistics use real result units, preserve missing values, and drill into the same scope."""

from decimal import Decimal

from tests.test_boardgame_api import boardgame_feature, create, game, people, play_form
from tests.test_boardgame_collection import read


def test_details_streaks_filters_and_curve(client, db_session, user_headers, normal_user, second_user):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    plays = []
    for day in range(1, 6):
        form = {**play_form(g['id'], ids), 'played_on':f'2026-08-{day:02}', 'round_count':3 if day != 4 else None}
        form['players'][0].update(is_start_player=True, is_new_to_player=day == 1, role_label='学者')
        form['players'][1].update(is_new_to_player=None, role_label='工匠')
        if day == 3:
            form['result_status'] = 'unknown'
            form['players'][0].update(score=None, score_status='gave_up')
            form['players'][1]['score'] = None
        if day == 4:
            form['result_status'] = 'unknown'
            for p in form['players']:
                p['score'] = None
        plays.append(create(client, user_headers, '/boardgame-plays', form))
    base = f'/boardgame-stats/games/{g["id"]}/'
    query = f'?scope=mine&mode=individual&comparison_key={plays[0]["comparison_key"]}&period=month&year=2026&month=8'
    detail = read(client, user_headers, base+'detailed'+query)
    assert detail['result']['eligible_samples'] == 4 and detail['result']['wins'] == 3
    assert detail['first_player']['win_rate'] == 0.75
    assert detail['new_player']['win_rate'] == 1
    assert detail['rounds']['known_play_count'] == 4 and detail['rounds']['missing_play_count'] == 1
    assert detail['scores']['known_scores'] == 3 and detail['scores']['missing_scores'] == 2
    assert Decimal(detail['scores']['winning_average']) == 10
    assert detail['scores']['margin_samples'] == 3 and Decimal(detail['scores']['average_margin']) == 1
    streaks = read(client, user_headers, base+'streaks'+query)
    assert streaks['items'][0]['current_win_streak'] == 1 and streaks['items'][0]['longest_win_streak'] == 2
    curve = read(client, user_headers, base+'score-curve'+query+'&limit=2')
    assert len(curve['items']) == 2 and curve['next_cursor']
    next_curve = read(client, user_headers, base+'score-curve'+query+'&limit=2&cursor='+curve['next_cursor'])
    assert all(row['score_missing'] for row in next_curve['items'])
    variants = read(client, user_headers, base+'variants'+query)
    assert len(variants['items']) == 1 and variants['items'][0]['role_label'] == '学者'
    all_query = query.replace('scope=mine', 'scope=all')
    for suffix in ('&first_player=true', '&role_label=学者', '&role_label=学者&first_player=true'):
        selected = read(client, user_headers, base+'detailed'+all_query+suffix)
        assert selected['scores']['unit_count'] == 5
        assert selected['scores']['known_scores'] == 3
        assert Decimal(selected['scores']['average']) == 10
    # Filtering losses out before computing a streak would manufacture wins.
    filtered_streak = client.get('/api/v1'+base+'streaks'+query+'&result_filter=winner', headers=user_headers)
    assert filtered_streak.status_code == 422
    drill = detail['drilldowns']['non_winners']
    response = client.get('/api/v1'+drill['path'], headers=user_headers, params={k:v for k,v in drill['query'].items() if v != []})
    assert response.status_code == 200, response.text
    assert [x['id'] for x in response.json()['items']] == [plays[2]['id']]
    excluded = client.patch(f'/api/v1/boardgame-plays/{plays[4]["id"]}', headers=user_headers,
        json={'expected_revision':plays[4]['revision'], 'stats_exclusion':'wins', 'exclusion_reason':'教学测试', 'reason':'排除胜负统计'})
    assert excluded.status_code == 200, excluded.text
    assert read(client, user_headers, base+'streaks'+query)['items'][0]['current_win_streak'] == 0


def test_scoresheet_repeats_share_template_and_result_rows(client, user_headers, admin_headers, normal_user, second_user):
    g = game(client, user_headers)
    template = create(client, admin_headers, '/boardgame-score-templates', dict(game_id=g['id'], name='累加模板',
        template_family='repeat-fixture', version_number=1, semantic_version='1', additive_row_keys=['base'],
        definition={'schema_version':2, 'subjects':[], 'cells':[], 'groups':[{'key':'g', 'label':'得分', 'rows':[{'key':'base', 'label':'基础分', 'repeatable':True}]}]}))
    obj = create(client, user_headers, '/boardgame-plays', dict(game_id=g['id'], played_on='2026-08-01', status='completed',
        competition_mode='individual', score_direction='high', players=[{'user_id':normal_user.id,'seat_order':1},{'user_id':second_user.id,'seat_order':2}]))
    path = f'/api/v1/boardgame-plays/{obj["id"]}/scoresheet'
    response = client.post(path+'/from-template', headers=user_headers, json={'expected_revision':obj['revision'], 'sheet_revision':0,
        'template_id':template['id'], 'reason':'设置计分表'})
    assert response.status_code == 200, response.text
    current = response.json()
    form = {k:current[k] for k in ('schema_version','template_key','template_id','template_family','template_version','sheet_type',
        'scoring_method','apply_totals','groups','subjects','cells','recorded_totals')}
    form['groups'][0]['rows'].append({'key':'base:2', 'label':'基础分 2', 'repeat_of':'base'})
    p0,p1 = [s['key'] for s in form['subjects']]
    form['cells'] = [{'row_key':key, 'subject_key':p, 'expression':value}
        for key,p,value in [('base',p0,'10'),('base:2',p0,'5'),('base',p1,'0'),('base:2',p1,'4')]]
    response = client.put(path, headers=user_headers, json={'expected_revision':current['play_revision'], 'sheet_revision':current['revision'],
        'reason':'记录重复项', 'sheet':form})
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved['sheet_comparison_key'] == current['sheet_comparison_key']
    stats = read(client, user_headers, f'/boardgame-stats/games/{g["id"]}/scoresheets?sheet_comparison_key={saved["sheet_comparison_key"]}')
    row = stats['items'][0]
    assert len(stats['items']) == 1 and row['row_key'] == 'base'
    assert Decimal(row['by_result']['winner']['average']) == 15
    assert Decimal(row['by_result']['non_winner']['average']) == 4
    assert row['contribution_rate'] == 1
    assert len(saved['groups'][0]['rows']) == 2  # Complete input stays in the historic snapshot.
    for outcome in ('winner','non_winner'):
        drill = row['by_result'][outcome]['drilldown']
        r = client.get('/api/v1'+drill['path'], headers=user_headers, params=drill['query'])
        assert r.status_code == 200, r.text
        assert r.json()['items'][0]['id'] == obj['id']

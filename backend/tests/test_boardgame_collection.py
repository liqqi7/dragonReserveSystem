"""Personal collection privacy, real copy denominators and lifecycle integration."""

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from tests.test_boardgame_api import boardgame_feature, create, game, people, play_form


def read(client, headers, path):
    response = client.get('/api/v1' + path, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def put(client, headers, path, payload, expected=200):
    response = client.put('/api/v1' + path, headers=headers, json=payload)
    assert response.status_code == expected, response.text
    return response.json()


def test_collection_preferences_prior_and_personal_filters(client, db_session, user_headers, normal_user,
        second_user_headers, second_user):
    g = game(client, user_headers, set_overrides={'min_players': 2, 'max_players': 4, 'max_playtime_minutes': 60, 'complexity': '2.5'})
    g2 = game(client, user_headers, name='未拥有测试游戏')
    create(client, user_headers, '/boardgame-inventory', {'game_id': g['id'], 'owner_user_id': normal_user.id, 'purchased_on':'2026-01-01'})
    path = f'/boardgames/{g["id"]}/my-preference'
    first = put(client, user_headers, path, {'expected_revision':0, 'rating':'8.5', 'wishlist':True, 'want_to_play':True, 'note':'个人备注'})
    assert first['revision'] == 1
    assert read(client, second_user_headers, path)['revision'] == 0
    put(client, user_headers, path, {'expected_revision':0}, 409)
    assert [x['id'] for x in read(client, user_headers, '/boardgames?owned=true&player_count=3&max_minutes=60&min_complexity=2&min_rating=8')['items']] == [g['id']]
    assert read(client, second_user_headers, '/boardgames?min_rating=8')['items'] == []
    prior_path = f'/boardgames/{g["id"]}/my-prior-plays'
    put(client, user_headers, prior_path, {'expected_revision':0, 'approximate_count':12})
    put(client, user_headers, f'/boardgames/{g2["id"]}/my-prior-plays', {'expected_revision':0})
    overview = read(client, user_headers, '/boardgame-collection/overview')
    assert overview['owned_unplayed_game_count'] == 0 and overview['played_not_owned_game_count'] == 1
    assert overview['coverage'] == 1 and overview['approximate_previous_play_count'] == 12
    assert read(client, user_headers, '/boardgame-stats/overview?scope=mine')['completed_play_count'] == 0
    put(client, user_headers, prior_path, {'expected_revision':1, 'played_before':False})
    assert read(client, user_headers, '/boardgames?owned=true&played=false')['items'][0]['id'] == g['id']
    assert client.get('/api/v1/boardgames?min_rating=9&max_rating=2', headers=user_headers).status_code == 422
    assert client.get('/api/v1/boardgames?inventory_scope=mine&owned=false', headers=user_headers).status_code == 422


def test_private_tags_and_saved_filters_match_stats_drilldowns(client, db_session, user_headers,
        normal_user, second_user, second_user_headers):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    play = create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids))
    tag = create(client, user_headers, '/boardgame-tags', {'name':'策略'})
    for kind, identity in [('games', g['id']), ('plays', play['id'])]:
        path = f'/boardgame-tags/{kind}/{identity}'
        previous = read(client, user_headers, path)
        put(client, user_headers, path, {'expected_hash':previous['revision_hash'], 'tag_ids':[tag['id']]})
        put(client, user_headers, path, {'expected_hash':previous['revision_hash'], 'tag_ids':[]}, 409)
        assert read(client, second_user_headers, path)['items'] == []
    assert len(read(client, user_headers, f'/boardgames?tag_ids={tag["id"]}')['items']) == 1
    stats = read(client, user_headers, f'/boardgame-stats/overview?tag_ids={tag["id"]}')
    assert stats['completed_play_count'] == 1
    assert read(client, user_headers, f'/boardgame-stats/overview?exclude_tag_ids={tag["id"]}')['completed_play_count'] == 0
    assert client.get(f'/api/v1/boardgame-plays?tag_ids={tag["id"]}', headers=second_user_headers).status_code == 404
    saved = create(client, user_headers, '/boardgame-saved-filters', {'name':'我的策略', 'target':'statistics', 'query':{'tag_ids':[tag['id']], 'scope':'mine'}})
    assert saved['query']['tag_ids'] == [tag['id']]
    assert read(client, second_user_headers, '/boardgame-saved-filters')['items'] == []
    create(client, user_headers, '/boardgame-saved-filters', {'name':'非法月份', 'target':'statistics', 'query':{'period':'month'}}, expected=422)
    denied = client.patch(f'/api/v1/boardgame-saved-filters/{saved["id"]}', headers=second_user_headers,
                          json={'expected_revision':1,'name':'越权'})
    assert denied.status_code == 404
    deleted = client.request('DELETE', f'/api/v1/boardgame-saved-filters/{saved["id"]}', headers=user_headers, json={'expected_revision':1})
    assert deleted.status_code == 204


def test_costs_use_explicit_copies_and_separate_currency_missing_values(client, db_session, user_headers,
        normal_user, second_user, second_user_headers):
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    def box(price=None, currency=None, **more):
        return create(client, user_headers, '/boardgame-inventory', {'game_id':g['id'], 'owner_user_id':normal_user.id,
            'purchase_price':price, 'purchase_currency':currency, **more})['items'][0]
    cny, usd, unknown = box('120', 'CNY'), box('10', 'USD'), box()
    create(client, user_headers, '/boardgame-inventory', {'game_id':g['id'], 'owner_user_id':normal_user.id, 'purchase_price':'10'}, expected=422)
    first = create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids, inventory_id=cny['id'], duration_minutes=60))
    second = create(client, user_headers, '/boardgame-plays', play_form(g['id'], ids, inventory_id=cny['id'], duplicate_ack_ids=[first['id']]))
    create(client, user_headers, '/boardgame-plays', {**play_form(g['id'], ids), 'played_on':'2025-01-01', 'inventory_id':usd['id'], 'duration_minutes':30})
    create(client, user_headers, '/boardgame-plays', {**play_form(g['id'], ids), 'played_on':'2024-01-01'})
    data = read(client, user_headers, '/boardgame-collection/costs?limit=1')
    assert data['unpriced_copy_count'] == 1 and data['total'] == 3
    currencies = {x['currency']:x for x in data['currencies']}
    assert Decimal(currencies['CNY']['cost_per_play']) == 60
    assert Decimal(currencies['CNY']['cost_per_hour']) == 120
    assert Decimal(currencies['CNY']['cost_per_person']) == 30
    assert Decimal(currencies['CNY']['cost_per_person_hour']) == 60
    assert currencies['CNY']['missing_duration_count'] == 1
    assert currencies['USD']['play_count'] == 1
    assert len(read(client, user_headers, '/boardgame-collection/costs?limit=1&cursor='+data['next_cursor'])['items']) == 1
    assert read(client, second_user_headers, '/boardgame-collection/costs')['items'] == []
    assert client.get(f'/api/v1/boardgame-collection/costs?inventory_id={cny["id"]}', headers=second_user_headers).status_code == 404
    assert 'purchase_price' not in read(client, second_user_headers, f'/boardgame-inventory/{cny["id"]}')
    drilldown = data['items'][0]['drilldown']
    actual = client.get('/api/v1'+drilldown['path'], headers=user_headers, params=drilldown['query'])
    assert actual.status_code == 200, actual.text
    assert {p['id'] for p in actual.json()['items']} == {first['id'], second['id']}


def test_finishing_stops_timer_and_abandon_clears_winners(client, db_session, monkeypatch,
        user_headers, normal_user, second_user):
    from app.services import boardgame_play as service
    ids = people(db_session, normal_user, second_user)
    g = game(client, user_headers)
    obj = create(client, user_headers, '/boardgame-plays', {**play_form(g['id'], ids), 'status':'draft'})
    moment = service.now()
    monkeypatch.setattr(service, 'now', lambda:moment)
    def action(suffix, body):
        response = client.post(f'/api/v1/boardgame-plays/{obj["id"]}/'+suffix, headers=user_headers, json=body)
        assert response.status_code == 200, response.text
        return response.json()
    running = action('timer', {'expected_revision':obj['revision'], 'action':'start'})
    monkeypatch.setattr(service, 'now', lambda:moment+timedelta(seconds=90))
    done = action('complete', {'expected_revision':running['revision']})
    assert done['timer_status'] == 'stopped' and done['duration_minutes'] == 2
    abandoned = action('abandon', {'expected_revision':done['revision'], 'reason':'录错完成状态', 'end_reason':'table_flip'})
    assert abandoned['result_status'] == 'unknown'
    assert all(p['outcome'] is None and p['rank'] is None for p in abandoned['players'])
    assert read(client, user_headers, '/boardgame-stats/overview')['completed_play_count'] == 0

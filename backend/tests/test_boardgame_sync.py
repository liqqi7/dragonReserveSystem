"""Offline retries are idempotent; conflicts never silently replace server values."""

from uuid import uuid4

from tests.test_boardgame_api import boardgame_feature, create, game
from tests.test_boardgame_collection import read, put


def test_sync_replays_isolate_conflicts_and_accounts(client, user_headers, second_user_headers, normal_user):
    g = game(client, user_headers)
    client_id = str(uuid4())
    operation = {'operation_id':str(uuid4()), 'action':'preference.put', 'resource_id':g['id'],
                 'payload':{'expected_revision':0, 'wishlist':True, 'note':'离线笔记'}}
    def sync(headers, operations):
        response = client.post('/api/v1/boardgame-sync', headers=headers, json={'client_id':client_id, 'operations':operations})
        assert response.status_code == 200, response.text
        return response.json()['items']
    first = sync(user_headers, [operation])[0]
    assert first['status'] == 'applied' and first['resource']['revision'] == 1
    again = sync(user_headers, [operation])[0]
    assert again['replayed'] and again['resource']['revision'] == 1
    changed = {**operation, 'payload':{**operation['payload'], 'note':'同 ID 不同内容'}}
    assert sync(user_headers, [changed])[0]['status'] == 'rejected'
    path = f'/boardgames/{g["id"]}/my-preference'
    assert read(client, user_headers, path)['note'] == '离线笔记'
    put(client, user_headers, path, {'expected_revision':1, 'note':'另一台设备已修改'})
    stale = {**operation, 'operation_id':str(uuid4()), 'payload':{'expected_revision':1, 'note':'过期的离线笔记'}}
    independent = {'operation_id':str(uuid4()), 'action':'prior.put', 'resource_id':g['id'],
                   'payload':{'expected_revision':0, 'approximate_count':5}}
    result = sync(user_headers, [stale, independent])
    assert [r['status'] for r in result] == ['conflict','applied']
    assert result[0]['current']['note'] == '另一台设备已修改'
    assert read(client, user_headers, path)['revision'] == 2
    assert sync(user_headers, [stale])[0]['replayed']
    # The same device/operation identifiers in another account have a separate namespace.
    other = sync(second_user_headers, [operation])[0]
    assert other['status'] == 'applied' and other['resource']['revision'] == 1
    fixed = {**stale, 'operation_id':str(uuid4()), 'payload':{'expected_revision':2, 'note':'人工合并后确认'}}
    assert sync(user_headers, [fixed])[0]['resource']['revision'] == 3


def test_sync_creates_once_and_rolls_back_invalid_play(client, user_headers, normal_user):
    g = game(client, user_headers)
    client_id = str(uuid4())
    form = {'client_id':client_id, 'operations':[{'operation_id':str(uuid4()), 'action':'play.create',
        'payload':{'game_id':g['id'], 'players':[{'user_id':normal_user.id,'seat_order':1}]}}]}
    def send(body):
        response = client.post('/api/v1/boardgame-sync', headers=user_headers, json=body)
        assert response.status_code == 200, response.text
        return response.json()['items'][0]
    first = send(form)
    assert first['status'] == 'applied'
    assert send(form)['resource']['id'] == first['resource']['id']
    play_id = first['resource']['id']
    invalid = {'client_id':client_id, 'operations':[{'operation_id':str(uuid4()), 'action':'play.patch', 'resource_id':play_id,
        'payload':{'expected_revision':1, 'stats_exclusion':'all'}}]}
    assert send(invalid)['status'] == 'rejected'
    current = read(client, user_headers, f'/boardgame-plays/{play_id}')
    assert current['revision'] == 1 and current['stats_exclusion'] == 'none'

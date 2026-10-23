"""Management flows use synthetic identities and exercise permission and revision boundaries."""
from sqlalchemy import select

from app.models.boardgame import AuditEvent, BoardGame, Inventory
from app.services import boardgame_catalog as catalog
from tests.test_boardgame_api import boardgame_feature, create, game, people


def resources(client, headers, kind, **query):
    response = client.get('/api/v1/boardgame-management/resources', headers=headers, params={'kind': kind, **query})
    assert response.status_code == 200, response.text
    return response.json()


def test_management_scope_and_archive_restore(client, db_session, user_headers, second_user_headers,
                                             admin_headers, normal_user, second_user):
    g = game(client, user_headers, '合成馆藏管理')
    own = create(client, user_headers, '/boardgame-inventory', {'game_id': g['id'], 'owner_user_id': normal_user.id,
        'status': 'available', 'available_for_activity': True})['items'][0]
    other = create(client, second_user_headers, '/boardgame-inventory', {'game_id': g['id'], 'owner_user_id': second_user.id})['items'][0]
    assert [r['id'] for r in resources(client, user_headers, 'inventory')['items']] == [own['id']]
    assert {r['id'] for r in resources(client, admin_headers, 'inventory')['items']} == {own['id'], other['id']}
    assert client.get('/api/v1/boardgame-management/resources?kind=people', headers=user_headers).status_code == 403
    archived = create(client, user_headers, f'/boardgame-inventory/{own["id"]}/archive',
                      {'expected_revision': own['revision'], 'reason': '合成归档'}, expected=200)
    assert resources(client, user_headers, 'inventory')['items'] == []
    assert resources(client, user_headers, 'inventory', archived=True)['items'][0]['game']['name'] == g['name']
    restored = create(client, user_headers, f'/boardgame-inventory/{own["id"]}/restore',
                      {'expected_revision': archived['revision']}, expected=200)
    assert not restored['archived_at'] and not restored['available_for_activity']
    hidden = game(client, admin_headers, '私有资料不可列出', is_visible=False)
    assert hidden['id'] not in [r['id'] for r in resources(client, admin_headers, 'games')['items']]
    actor = db_session.get(type(normal_user), normal_user.id)
    private_person = catalog.new_person(db_session, actor, '私有来源姓名', visible=False)
    private_location = catalog.new_location(db_session, actor, '私有来源地点', visible=False)
    db_session.commit()
    assert private_person.id not in [r['id'] for r in resources(client, admin_headers, 'people')['items']]
    assert private_location.id not in [r['id'] for r in resources(client, admin_headers, 'locations')['items']]


def test_report_permissions_resolution_and_revisions(client, user_headers, second_user_headers, admin_headers, normal_user):
    g = game(client, admin_headers)
    play = create(client, admin_headers, '/boardgame-plays', {'game_id': g['id'], 'status': 'completed',
        'played_on': '2026-09-01', 'players': [{'user_id': normal_user.id, 'seat_order': 1}]})
    mine = client.get(f'/api/v1/boardgame-plays/{play["id"]}', headers=user_headers).json()
    outsider = client.get(f'/api/v1/boardgame-plays/{play["id"]}', headers=second_user_headers).json()
    assert mine['permissions']['can_report'] and not outsider['permissions']['can_report']
    assert mine['players'][0]['user']['id'] == normal_user.id
    create(client, second_user_headers, f'/boardgame-plays/{play["id"]}/reports', {'message': '越权反馈'}, expected=403)
    report = create(client, user_headers, f'/boardgame-plays/{play["id"]}/reports', {'message': '日期需要核对'})
    path = '/api/v1/boardgame-play-reports'
    listed = client.get(path+'?scope=reported_by_me', headers=user_headers).json()['items'][0]
    assert listed['game']['id'] == g['id'] and listed['played_on'] == '2026-09-01'
    assert not listed['permissions']['can_resolve']
    assert client.get(path, headers=second_user_headers).json()['items'] == []
    body = {'expected_revision': report['revision'], 'status': 'resolved', 'resolution': '核对原始记录，日期正确'}
    assert client.patch(f'{path}/{report["id"]}', headers=user_headers, json=body).status_code == 403
    assert client.patch(f'{path}/{report["id"]}', headers=admin_headers, json=body).status_code == 200
    assert client.patch(f'{path}/{report["id"]}', headers=admin_headers, json=body).status_code == 409
    assert client.get(path+'?status=invalid', headers=admin_headers).status_code == 422


def test_merge_preview_conflicts_and_archived_canonical(client, db_session, user_headers, admin_headers, normal_user):
    source, target = game(client, user_headers, '合成重复资料'), game(client, admin_headers, '保留的合成资料')
    box = create(client, user_headers, '/boardgame-inventory', {'game_id': source['id'], 'owner_user_id': normal_user.id})['items'][0]
    path = f'/api/v1/boardgames/{source["id"]}/merge-preview?target_id={target["id"]}'
    assert client.get(path, headers=user_headers).status_code == 403
    preview = client.get(path, headers=admin_headers).json()
    body = {k: preview[k] for k in ('target_id', 'source_revision', 'target_revision', 'preview_hash')}
    body['reason'] = '同款重复录入，经核对合并'
    create(client, admin_headers, f'/boardgames/{source["id"]}/merge', {**body, 'preview_hash': '0'*64}, expected=409)
    assert db_session.get(Inventory, box['id']).game_id == source['id']
    merged = create(client, admin_headers, f'/boardgames/{source["id"]}/merge', body, expected=200)
    assert merged['id'] == target['id']
    db_session.expire_all()
    assert db_session.get(Inventory, box['id']).game_id == target['id']
    archived = resources(client, admin_headers, 'games', archived=True)['items'][0]
    assert archived['canonical_id'] == target['id']
    create(client, admin_headers, f'/boardgames/{source["id"]}/restore', {'expected_revision': archived['revision']}, expected=409)


def test_inventory_correction_detaches_edition_and_preserves_audit(client, db_session, user_headers,
                                                                 admin_headers, normal_user):
    old, new = game(client, user_headers, '选错的游戏'), game(client, user_headers, '正确的游戏')
    box = create(client, user_headers, '/boardgame-inventory', {'game_id': old['id'], 'owner_user_id': normal_user.id})['items'][0]
    row = db_session.get(Inventory, box['id'])
    row.bgg_version_id, row.bgg_version_snapshot = 9191, {'version': {'name': '原错误版次'}, 'raw': {'synthetic': True}}
    row.edition_name, row.language = '原错误版次', 'English'
    db_session.commit()
    path = f'/api/v1/boardgame-inventory/{box["id"]}/game-correction-preview?target_game_id={new["id"]}'
    assert client.get(path, headers=user_headers).status_code == 403
    preview = client.get(path, headers=admin_headers).json()
    assert preview['clears_bgg_edition']
    corrected = create(client, admin_headers, f'/boardgame-inventory/{box["id"]}/game-correction',
        {'expected_revision': box['revision'], 'target_game_id': new['id'], 'preview_hash': preview['preview_hash'],
         'reason': '核对盒面后更正'}, expected=200)
    assert corrected['game_id'] == new['id'] and corrected['bgg_version_id'] is None and corrected['edition_name'] is None
    audit = db_session.scalar(select(AuditEvent).where(AuditEvent.action == 'correct_game'))
    assert audit.before_data['bgg_version_snapshot']['version']['name'] == '原错误版次'


def test_identity_merge_and_location_restore(client, db_session, admin_headers, user_headers, normal_user):
    registered = people(db_session, normal_user)[0]
    duplicate = create(client, admin_headers, '/boardgame-people', {'display_name': '来源中的合成名字'})
    create(client, admin_headers, f'/boardgame-people/{duplicate["id"]}/account-binding',
        {'expected_revision': duplicate['revision'], 'user_id': normal_user.id, 'reason': '核对身份'}, expected=409)
    preview = client.get(f'/api/v1/boardgame-people/{duplicate["id"]}/merge-preview?target_id={registered}', headers=admin_headers).json()
    merged = create(client, admin_headers, f'/boardgame-people/{duplicate["id"]}/merge',
        {**{k: preview[k] for k in ('target_id', 'source_revision', 'target_revision', 'preview_hash')}, 'reason': '手动确认同一人'}, expected=200)
    assert merged['user']['id'] == normal_user.id
    loc = create(client, user_headers, '/boardgame-locations', {'name': '合成旧地点'})
    response = client.patch(f'/api/v1/boardgame-locations/{loc["id"]}', headers=admin_headers,
        json={'expected_revision': loc['revision'], 'name': '合成新地点', 'reason': '调整名称'})
    assert response.status_code == 200, response.text
    archived = create(client, admin_headers, f'/boardgame-locations/{loc["id"]}/archive',
        {'expected_revision': response.json()['revision'], 'reason': '不再使用'}, expected=200)
    assert resources(client, admin_headers, 'locations', archived=True)['items'][0]['name'] == '合成新地点'
    create(client, admin_headers, f'/boardgame-locations/{loc["id"]}/restore', {'expected_revision': archived['revision']}, expected=200)

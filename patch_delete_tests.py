import sys

def log(*a):
    print(*a); sys.stdout.flush()

cat = '/tmp/dragonReserveSystem-main-20261007/backend/app/services/boardgame_catalog.py'
s = open(cat).read()
old = "Inventory.owner_user_id == actor.id).with_for_update()"
log('anchor present:', old in s)
if old in s:
    s = s.replace("Inventory.owner_user_id == actor.id).with_for_update()",
                  "Inventory.owner_user_id == actor.id, Inventory.archived_at.is_(None)).with_for_update()", 1)
    open(cat, 'w').write(s)
    log('catalog fixed')
else:
    log('catalog anchor NOT found (maybe already fixed)')

test = '/tmp/dragonReserveSystem-main-20261007/backend/tests/library/test_library.py'
s = open(test).read()
log('delete test already present:', 'test_delete_inventory_soft_delete' in s)
if 'test_delete_inventory_soft_delete' not in s:
    addition = '''

def test_delete_inventory_soft_delete_audit_and_reintake(library):
    from app.models.boardgame import AuditEvent
    client, db, actor, other, factory, app = library
    result = post(client, '/boardgame-intakes', payload(ready(library))).json()
    box = result['inventory'][0]
    url = f"/api/v1/boardgame-inventory/{box['id']}"
    app.dependency_overrides[get_current_user] = lambda: other
    assert client.delete(url).status_code == 403
    app.dependency_overrides[get_current_user] = lambda: actor
    deleted = client.delete(url)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()['remaining_owners'] == 0
    assert db.get(Inventory, box['id']).archived_at is not None
    assert client.get(f"/api/v1/boardgames/{result['game_id']}").status_code == 404
    assert client.get('/api/v1/boardgames').json()['items'] == []
    assert client.get('/api/v1/boardgames/recent-arrivals').json()['items'] == []
    assert client.delete(url).status_code == 409
    events = db.scalars(select(AuditEvent).where(AuditEvent.entity_id == str(box['id']),
        AuditEvent.action == 'archive')).all()
    assert len(events) == 1
    reintake = post(client, '/boardgame-intakes', payload(ready(library)))
    assert reintake.status_code == 201, reintake.text
    assert reintake.json()['inventory'][0]['id'] != box['id']


def test_delete_inventory_keeps_game_when_other_owners_remain(library):
    client, db, actor, other, factory, app = library
    result = post(client, '/boardgame-intakes', payload(ready(library))).json()
    app.dependency_overrides[get_current_user] = lambda: other
    saved = post(client, '/boardgame-intakes', payload(ready(library)))
    assert saved.status_code == 201, saved.text
    app.dependency_overrides[get_current_user] = lambda: actor
    deleted = client.delete(f"/api/v1/boardgame-inventory/{result['inventory'][0]['id']}")
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()['remaining_owners'] == 1
    detail = client.get(f"/api/v1/boardgames/{result['game_id']}").json()
    assert detail['owner_count'] == 1
    assert detail['my_versions'] == []
    app.dependency_overrides[get_current_user] = lambda: other
    detail = client.get(f"/api/v1/boardgames/{result['game_id']}").json()
    assert len(detail['my_versions']) == 1
    assert len(client.get('/api/v1/boardgames').json()['items']) == 1
'''
    s = s.rstrip('\n') + '\n' + addition
    open(test, 'w').write(s)
    log('tests added')
log('DONE')

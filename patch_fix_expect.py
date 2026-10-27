test = '/tmp/dragonReserveSystem-main-20261007/backend/tests/library/test_library.py'
s = open(test).read()
old = """    reintake = post(client, '/boardgame-intakes', payload(fresh))
    assert reintake.status_code == 201, reintake.text
    assert reintake.json()['inventory'][0]['id'] != box['id']"""
new = """    reintake = post(client, '/boardgame-intakes', payload(fresh))
    assert reintake.status_code == 201, reintake.text
    revived = reintake.json()['inventory'][0]
    assert revived['id'] == box['id']
    assert revived['archived_at'] is None
    actions = [e.action for e in db.scalars(select(AuditEvent).where(
        AuditEvent.entity_id == str(box['id'])))]
    assert actions[-2:] == ['archive', 'restore']"""
assert old in s, 'anchor'
s = s.replace(old, new, 1)
open(test, 'w').write(s)
print('expectation fixed')

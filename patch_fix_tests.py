test = '/tmp/dragonReserveSystem-main-20261007/backend/tests/library/test_library.py'
s = open(test).read()

old1 = """    reintake = post(client, '/boardgame-intakes', payload(ready(library)))
    assert reintake.status_code == 201, reintake.text"""
new1 = """    fresh = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    assert fresh['state'] == 'ready'
    reintake = post(client, '/boardgame-intakes', payload(fresh))
    assert reintake.status_code == 201, reintake.text"""
assert old1 in s, 'anchor1'
s = s.replace(old1, new1, 1)

old2 = """    app.dependency_overrides[get_current_user] = lambda: other
    saved = post(client, '/boardgame-intakes', payload(ready(library)))
    assert saved.status_code == 201, saved.text"""
new2 = """    app.dependency_overrides[get_current_user] = lambda: other
    fresh = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    assert fresh['state'] == 'ready'
    saved = post(client, '/boardgame-intakes', payload(fresh))
    assert saved.status_code == 201, saved.text"""
assert old2 in s, 'anchor2'
s = s.replace(old2, new2, 1)

open(test, 'w').write(s)
print('tests fixed')

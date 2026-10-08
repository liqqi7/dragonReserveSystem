from datetime import timedelta
from uuid import uuid4
import httpx
import pytest
from sqlalchemy import select, func, inspect
from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models.boardgame import BoardGame, Inventory, PreviewJob, PreviewItem, TABLES
from app.services import boardgame_preview, boardgame_worker, boardgame_catalog, boardgame_sources
from app.services.boardgame_common import now

XML = '''<items><item type="boardgame" id="224517">
<name type="primary" value="Brass: Birmingham"/><name type="alternate" value="工业革命：伯明翰"/>
<image>https://cf.geekdo-images.com/test.jpg</image><description>Game description</description>
<yearpublished value="2018"/><minplayers value="2"/><maxplayers value="4"/>
<minplaytime value="60"/><maxplaytime value="120"/>
<link type="boardgamemechanic" value="Hand Management"/>
<link type="boardgamemechanic" value="Network and Route Building"/>
<statistics><ratings><average value="8.5596"/><averageweight value="3.87"/>
<ranks><rank name="boardgame" value="1"/></ranks></ratings></statistics>
<versions><item type="boardgameversion" id="101"><name type="primary" value="Chinese edition"/>
<yearpublished value="2020"/><link type="language" value="Chinese"/></item>
<item type="boardgameversion" id="102"><name type="primary" value="English edition"/>
<link type="language" value="English"/></item></versions></item></items>'''.encode()


def post(client, path, data, key=None):
    return client.post('/api/v1'+path, json=data, headers={'Idempotency-Key':key or str(uuid4())})


def ready(library):
    client, db, actor, other, factory, app = library
    response = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]})
    assert response.status_code == 202, response.text
    identity = response.json()['id']
    def upstream(request):
        assert request.url.params['stats'] == '1'
        assert request.url.params['versions'] == '1'
        return httpx.Response(200, content=XML)
    db.rollback()
    assert boardgame_worker.run_once(factory, httpx.MockTransport(upstream))
    db.expire_all()
    preview = client.get(f'/api/v1/boardgame-intake-previews/{identity}').json()
    assert preview['state'] == 'ready', preview
    return preview


def payload(preview):
    return dict(source='bgg', preview_id=preview['id'], item_id=preview['items'][0]['item_id'],
        expected_revision=preview['items'][0]['revision'], bgg_version_id=101,
        display_name='工业革命：伯明翰', inventory={'remark':'中文收藏'})


def test_intake_persists_stats_version_and_idempotency(library):
    client, db, actor, other, factory, app = library
    preview = ready(library)
    key = str(uuid4())
    saved = post(client, '/boardgame-intakes', payload(preview), key)
    assert saved.status_code == 201, saved.text
    result = saved.json()
    assert post(client, '/boardgame-intakes', payload(preview), key).json() == result
    assert db.scalar(select(func.count()).select_from(Inventory)) == 1
    box = result['inventory'][0]
    assert box['bgg_version_id'] == 101
    assert box['language_label'] == '中文'
    assert box['bgg_version']['year_published'] == 2020
    detail = client.get(f"/api/v1/boardgames/{result['game_id']}").json()
    assert detail['bgg_rating'] == '8.56'
    assert detail['bgg_rank'] == 1
    assert detail['bgg_weight_display'] == '3.9'
    assert len(detail['mechanic_tags']) == 2
    assert detail['chinese_name'] == '工业革命：伯明翰'
    assert detail['my_versions'][0]['id'] == box['id']
    assert len(detail['version_options']) == 2
    assert client.get('/api/v1/boardgames?q=伯明翰').json()['items'][0]['id'] == result['game_id']
    assert client.get('/api/v1/boardgames?player_count=5').json()['items'] == []
    assert client.get('/api/v1/boardgames?max_minutes=60').json()['items'] == []
    assert client.get('/api/v1/boardgames?min_complexity=4').json()['items'] == []
    assert client.get('/api/v1/boardgames/recent-arrivals').json()['items'][0]['id'] == result['game_id']
    fresh = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    assert fresh['items'][0]['owned_by_actor'] is True
    assert fresh['state'] == 'ready'  # complete public snapshot cache needs no upstream call
    candidate = client.get(f"/api/v1/boardgame-intake-previews/{fresh['id']}/items/{fresh['items'][0]['item_id']}").json()['game']
    assert candidate['owned_by_actor'] is True
    assert candidate['owned_versions'][0]['bgg_version_id'] == 101
    duplicate = post(client, '/boardgame-intakes', payload(fresh))
    assert duplicate.status_code == 409, duplicate.text
    assert db.scalar(select(func.count()).select_from(Inventory)) == 1


def test_version_permissions_revision_and_wrong_game(library):
    client, db, actor, other, factory, app = library
    result = post(client, '/boardgame-intakes', payload(ready(library))).json()
    box = result['inventory'][0]
    url = f"/api/v1/boardgame-inventory/{box['id']}/version"
    data = {'expected_revision':box['revision'], 'bgg_version_id':102}
    app.dependency_overrides[get_current_user] = lambda:other
    assert client.put(url, json=data).status_code == 403
    assert client.get('/api/v1/boardgames/recent-arrivals').json()['items'] == []
    app.dependency_overrides[get_current_user] = lambda:actor
    assert client.put(url, json={**data,'bgg_version_id':999}).status_code == 422
    saved = client.put(url, json=data)
    assert saved.status_code == 200, saved.text
    assert saved.json()['language_label'] == '英文'
    assert client.put(url, json=data).status_code == 409
    fresh = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    candidate = client.get(f"/api/v1/boardgame-intake-previews/{fresh['id']}/items/{fresh['items'][0]['item_id']}").json()['game']
    assert candidate['owned_versions'][0]['bgg_version_id'] == 102
    assert candidate['owned_version_label'].startswith('英文')


def test_private_preview_and_owner_data(library):
    client, db, actor, other, factory, app = library
    preview = ready(library)
    result = post(client, '/boardgame-intakes', payload(preview)).json()
    app.dependency_overrides[get_current_user] = lambda:other
    assert client.get(f"/api/v1/boardgame-intake-previews/{preview['id']}").status_code == 404
    rows = client.get(f"/api/v1/boardgame-inventory?game_id={result['game_id']}").json()['items']
    assert rows[0]['owner']['id'] == actor.id
    assert rows[0]['bgg_version_id'] == 101
    assert 'internal' not in rows[0]
    fresh = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    assert fresh['items'][0]['owned_by_actor'] is False
    saved = post(client, '/boardgame-intakes', payload(fresh))
    assert saved.status_code == 201, saved.text
    detail = client.get(f"/api/v1/boardgames/{result['game_id']}").json()
    assert detail['owner_count'] == 2
    assert detail['my_versions'][0]['owner']['id'] == other.id
    page1 = client.get(f"/api/v1/boardgame-inventory?game_id={result['game_id']}&limit=1").json()
    assert page1['has_more']
    page2 = client.get(f"/api/v1/boardgame-inventory?game_id={result['game_id']}&limit=1&cursor={page1['next_cursor']}").json()
    assert page2['items'][0]['owner']['id'] != page1['items'][0]['owner']['id']


@pytest.mark.parametrize('status', [202,429,500,401])
def test_worker_retries_then_terminates(library, status, monkeypatch):
    client, db, actor, other, factory, app = library
    monkeypatch.setattr(get_settings(), 'bgg_max_attempts', 2)
    preview = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    transport = httpx.MockTransport(lambda request:httpx.Response(status, headers={'Retry-After':'1'}))
    db.rollback()
    assert boardgame_worker.run_once(factory, transport)
    db.expire_all()
    job = db.get(PreviewJob, preview['id'])
    assert job.state == ('failed' if status == 401 else 'retry_wait')
    if status != 401:
        job.next_attempt_at = now() - timedelta(seconds=1); db.commit()
        assert boardgame_worker.run_once(factory, transport)
        db.expire_all()
        assert db.get(PreviewJob, job.id).state == 'failed'


def test_expired_lease_recovers_and_unconsumed_job_times_out(library):
    client, db, actor, other, factory, app = library
    job = boardgame_preview.new_job(db, actor, 'bgg_thing', {'ids':[224517], 'purpose':'intake_preview'})
    job.state = 'fetching'; job.lease_owner = 'stopped'; job.lease_expires_at = now()-timedelta(seconds=1)
    db.commit()
    assert boardgame_worker.run_once(factory, httpx.MockTransport(lambda request:httpx.Response(200,content=XML)))
    db.expire_all(); assert db.get(PreviewJob, job.id).state == 'ready'
    stale = boardgame_preview.new_job(db, actor, 'bgg_thing', {'ids':[999], 'purpose':'intake_preview'})
    stale.created_at = now()-timedelta(minutes=10); db.commit()
    assert boardgame_worker.run_once(factory, httpx.MockTransport(lambda request:pytest.fail('expired job must not fetch')))
    db.expire_all(); assert db.get(PreviewJob, stale.id).state == 'failed'


def test_no_excluded_schema_or_endpoints(library):
    client, db, actor, other, factory, app = library
    assert set(TABLES) == {'boardgames','boardgame_inventory','boardgame_preview_jobs',
        'boardgame_preview_items','boardgame_audit_events','boardgame_request_keys'}
    columns = {c['name'] for c in inspect(db.bind).get_columns('boardgame_inventory')}
    assert not {'purchased_on','purchase_price','available_for_activity'} & columns
    for path in ('/boardgame-plays','/boardgame-stats','/boardgame-imports','/boardgame-sync','/activities/1/game-plans'):
        assert client.get('/api/v1'+path).status_code == 404
    assert post(client,'/boardgame-intakes',{'source':'manual','game':{'name':'x'},'inventory':{}}).status_code == 422


def test_unsafe_xml_rejected_and_raw_mechanics_complete():
    with pytest.raises(AppError):
        boardgame_sources.thing_items(b'<!DOCTYPE x [<!ENTITY a SYSTEM "file:///tmp/x">]><items/>')
    projection = boardgame_sources.thing_items(XML)[0]['payload']
    projection['projection'].pop('mechanics')
    assert len(boardgame_catalog.library_metadata(projection)['mechanic_tags']) == 2


def test_poll_terminates_if_worker_never_consumes_job(library):
    client, db, actor, other, factory, app = library
    preview = post(client, '/boardgame-intake-previews', {'bgg_ids':[224517]}).json()
    job = db.get(PreviewJob, preview['id'])
    job.created_at = now() - timedelta(minutes=10)
    db.commit()
    response = client.get(f"/api/v1/boardgame-intake-previews/{job.id}").json()
    assert response['state'] == 'failed'
    assert response['retryable'] is True
    retry = client.post(f"/api/v1/boardgame-intake-previews/{job.id}/retry",
        json={'expected_revision':response['revision']})
    assert retry.status_code == 200, retry.text
    assert retry.json()['state'] == 'queued'


def test_empty_library_and_disabled_feature(library, monkeypatch):
    client, db, actor, other, factory, app = library
    assert client.get('/api/v1/boardgames').json()['items'] == []
    monkeypatch.setattr(get_settings(), 'boardgame_enabled', False)
    assert client.get('/api/v1/boardgames').status_code == 404
    monkeypatch.setattr(get_settings(), 'boardgame_enabled', True)
    monkeypatch.setattr(get_settings(), 'boardgame_preview_worker_enabled', False)
    error = post(client,'/boardgame-intake-previews', {'bgg_ids':[224517]})
    assert error.status_code == 503
    assert error.json()['details']['reason'] == 'worker_disabled'


def test_search_stats_are_not_a_dependency_of_unrelated_routes(library, monkeypatch):
    client, db, actor, other, factory, app = library
    monkeypatch.setattr(get_settings(), 'bgg_enabled', False)
    assert client.get('/api/v1/boardgames').status_code == 200
    assert client.get('/api/v1/bgg/search?q=伯明翰').status_code == 503


def test_bgg_name_search_uses_real_api_contract_and_cache(library, monkeypatch):
    client, db, actor, other, factory, app = library
    original_client = httpx.Client
    calls = []
    def upstream(request):
        calls.append(request)
        assert request.url.path.endswith('/search')
        assert request.url.params['query'] == '伯明翰'
        assert request.headers['Authorization'] == 'Bearer test-token'
        return httpx.Response(200, content='<items><item type="boardgame" id="224517"><name value="Brass: Birmingham"/><yearpublished value="2018"/></item></items>'.encode())
    monkeypatch.setattr(httpx, 'Client', lambda **kwargs:original_client(transport=httpx.MockTransport(upstream), **kwargs))
    response = client.get('/api/v1/bgg/search?q=伯明翰&limit=10')
    assert response.status_code == 200, response.text
    assert response.json()['items'][0]['bgg_id'] == 224517
    assert 'bgg_rating' not in response.json()['items'][0]  # details come from Thing, never invented
    assert client.get('/api/v1/bgg/search?q=伯明翰&limit=10').json() == response.json()
    assert len(calls) == 1


def test_gallery_is_optional_cached_and_uses_game_id(library, monkeypatch):
    from app.services import boardgame_images
    client, db, actor, other, factory, app = library
    result = post(client, '/boardgame-intakes', payload(ready(library))).json()
    boardgame_images._cache.clear()
    calls = []
    def upstream(url, **kwargs):
        calls.append(kwargs)
        assert kwargs['params']['objectid'] == 224517
        assert kwargs['params']['gallery'] == 'game'
        return httpx.Response(200, request=httpx.Request('GET', url), json={'images':[
            {'imageid':'17','imageurl':'https://cf.geekdo-images.com/game.jpg'},
            {'imageid':'18','imageurl':'https://untrusted.example/x.jpg'}]})
    monkeypatch.setattr(httpx, 'get', upstream)
    path = f"/api/v1/boardgames/{result['game_id']}/images"
    response = client.get(path)
    assert response.status_code == 200
    assert len(response.json()['items']) == 1
    assert client.get(path).json() == response.json()
    assert len(calls) == 1
    boardgame_images._cache.clear()
    monkeypatch.setattr(httpx, 'get', lambda *a, **k: (_ for _ in ()).throw(httpx.ConnectTimeout('test')))
    assert client.get(path).status_code == 503
    assert client.get(f"/api/v1/boardgames/{result['game_id']}").status_code == 200
    boardgame_images._cache.clear()

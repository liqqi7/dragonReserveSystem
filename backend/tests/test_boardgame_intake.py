"""Synthetic BGG exercises real search, leased worker, confirmation and edition storage."""
from copy import deepcopy
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, func

from app.core.config import get_settings
from app.models.boardgame import BoardGame, Inventory
from app.api.v1 import boardgame_imports
from tests.test_boardgame_import import feature, worker


def bgg_response(request):
    if request.url.path.endswith('/search'):
        return httpx.Response(200, text='<items>' + ''.join(
            f'<item type="boardgame" id="{i}"><name type="primary" value="Test Game {i}"/><yearpublished value="2020"/></item>'
            for i in range(701001, 701004)) + '</items>')
    assert request.url.params['versions'] == '1'
    body = '<items>'
    for identity in request.url.params['id'].split(','):
        body += f'''<item type="boardgame" id="{identity}">
          <name type="primary" value="Test Game {identity}"/><name type="alternate" value="合成桌游"/>
          <description>&lt;p&gt;Synthetic description&lt;/p&gt;</description>
          <image>https://cf.geekdo-images.com/synthetic-cover.jpg</image>
          <thumbnail>https://cf.geekdo-images.com/synthetic-thumb.jpg</thumbnail>
          <minplayers value="2"/><maxplayers value="4"/><minplaytime value="60"/><maxplaytime value="90"/>
          <yearpublished value="2020"/><versions>
            <item type="boardgameversion" id="{int(identity)+100}"><name type="primary" value="中文合成版"/>
              <yearpublished value="2024"/><link type="language" value="Chinese" id="1"/>
              <link type="boardgamepublisher" value="Synthetic Publisher" id="2"/>
              <image>https://cf.geekdo-images.com/synthetic-chinese.jpg</image>
            </item>
            <item type="boardgameversion" id="{int(identity)+200}"><name type="primary" value="English edition"/>
              <yearpublished value="2022"/><link type="language" value="English" id="3"/>
            </item>
          </versions></item>'''
    return httpx.Response(200, text=body+'</items>')


@pytest.fixture
def bgg_http(monkeypatch):
    real_client = httpx.Client
    transport = httpx.MockTransport(bgg_response)
    def client(**kwargs):
        kwargs.setdefault('transport', transport)
        return real_client(**kwargs)
    monkeypatch.setattr(boardgame_imports.httpx, 'Client', client)
    boardgame_imports._search_cache.clear()
    return transport


def post(client, headers, path, body, key=None):
    return client.post('/api/v1'+path, headers={**headers, 'Idempotency-Key': key or str(uuid4())}, json=body)


def prepared(client, db, headers, transport, ids=None):
    created = post(client, headers, '/boardgame-intake-previews', {'bgg_ids': ids or [701001, 701002]})
    assert created.status_code == 202, created.text
    job_id = created.json()['id']
    worker(db, transport)
    reply = client.get('/api/v1/boardgame-intake-previews/'+job_id, headers=headers)
    assert reply.status_code == 200, reply.text
    assert reply.json()['state'] == 'ready', reply.text
    return reply.json()


def selection(preview, owner_id, inventory=True):
    item = preview['items'][0]
    body = dict(source='bgg', preview_id=preview['id'], item_id=item['item_id'], expected_revision=item['revision'],
                bgg_version_id=item['bgg_id']+100 if inventory else None, version_unspecified=not inventory,
                display_name='用户确认的中文名')
    if inventory:
        body['inventory'] = dict(owner_user_id=owner_id, status='available', available_for_activity=False,
                                 purchased_on='2026-01-02', purchase_price='0', purchase_currency='CNY')
    return body


def count(db, cls):
    return db.scalar(select(func.count()).select_from(cls))


def test_search_pages_then_prepare_without_creating_games(client, db_session, user_headers, bgg_http):
    first = client.get('/api/v1/bgg/search?q=合成&limit=2', headers=user_headers).json()
    second = client.get('/api/v1/bgg/search?q=合成&limit=2&offset=2', headers=user_headers).json()
    assert len(first['items']) == 2 and first['next_offset'] == 2
    assert len(second['items']) == 1 and second['next_offset'] is None
    assert client.get('/api/v1/bgg/search?q=%20%20', headers=user_headers).status_code == 422
    preview = prepared(client, db_session, user_headers, bgg_http)
    assert count(db_session, BoardGame) == count(db_session, Inventory) == 0
    assert preview['items'][0]['cover_url'].endswith('synthetic-cover.jpg')
    item = preview['items'][0]
    path = f'/api/v1/boardgame-intake-previews/{preview["id"]}/items/{item["item_id"]}'
    details = client.get(path+'?limit=1', headers=user_headers).json()
    assert details['game']['description'] == 'Synthetic description'
    assert details['game']['year_published'] == 2020
    assert details['versions'][0]['year_published'] == 2024
    assert details['next_offset'] == 1
    english = client.get(path+'?q=English', headers=user_headers).json()
    assert len(english['versions']) == 1 and english['versions'][0]['languages'] == ['English']
    assert client.get('/api/v1/boardgame-imports', headers=user_headers).json()['items'] == []


def test_confirm_version_inventory_atomic_and_idempotent(client, db_session, user_headers, normal_user, bgg_http):
    preview = prepared(client, db_session, user_headers, bgg_http)
    body, key = selection(preview, normal_user.id), str(uuid4())
    result = post(client, user_headers, '/boardgame-intakes', body, key)
    assert result.status_code == 201, result.text
    data = result.json()
    assert data['game']['name'] == '用户确认的中文名'
    db_session.expire_all()
    stored_game = db_session.get(BoardGame, data['game_id'])
    # Physical inventory creation locks/reloads this row. Source provenance must
    # survive that reload with the production session's autoflush=False.
    from app.services import boardgame_sources as sources
    assert stored_game.bgg_raw_xml
    root = sources.xml_root(stored_game.bgg_raw_xml.encode())
    assert stored_game.bgg_payload['raw'] == sources.xml_tree(root)
    assert stored_game.bgg_request_params == {'id':701001, 'stats':1, 'versions':1}
    assert stored_game.bgg_parser_version == sources.PARSER_VERSION
    assert stored_game.bgg_content_hash and stored_game.bgg_synced_at
    box = data['inventory'][0]
    assert box['bgg_version_id'] == 701101 and box['bgg_version']['year_published'] == 2024
    assert box['internal']['purchase_price'] == '0.00'
    assert box['edition_name'] == '中文合成版' and box['language'] == 'Chinese'
    for replay_key in (key, str(uuid4())):
        again = post(client, user_headers, '/boardgame-intakes', body, replay_key)
        assert again.status_code == 201 and again.json()['inventory_ids'] == data['inventory_ids']
    assert count(db_session, BoardGame) == count(db_session, Inventory) == 1
    changed = {**body, 'display_name': 'changed'}
    assert post(client, user_headers, '/boardgame-intakes', changed).status_code == 409
    assert post(client, user_headers, '/boardgame-intakes', changed, key).status_code == 409
    saved = db_session.get(Inventory, box['id'])
    snapshot = deepcopy(saved.bgg_version_snapshot)
    saved.source_snapshot = {'later_bgstats_export': True}
    db_session.commit()
    assert db_session.get(Inventory, box['id']).bgg_version_snapshot == snapshot
    edited = client.patch(f'/api/v1/boardgame-inventory/{box["id"]}', headers=user_headers,
                          json={'expected_revision':box['revision'], 'remark':'only a note', 'reason':'补充备注'})
    assert edited.status_code == 200, edited.text
    assert edited.json()['bgg_version_id'] == 701101
    detached = client.patch(f'/api/v1/boardgame-inventory/{box["id"]}', headers=user_headers,
                            json={'expected_revision':edited.json()['revision'], 'edition_name':'另一个版次', 'reason':'纠正版次'})
    assert detached.status_code == 200, detached.text
    assert detached.json()['bgg_version_id'] is None and detached.json()['bgg_version'] is None


@pytest.mark.parametrize('change,expected', [
    ({'bgg_version_id': 701102}, 422), ({'bgg_version_id': None}, 422), ({'expected_revision': 99}, 409),
])
def test_reject_wrong_version_and_stale_candidate(client, db_session, user_headers, normal_user, bgg_http, change, expected):
    preview = prepared(client, db_session, user_headers, bgg_http)
    result = post(client, user_headers, '/boardgame-intakes', {**selection(preview, normal_user.id), **change})
    assert result.status_code == expected, result.text
    assert count(db_session, BoardGame) == count(db_session, Inventory) == 0


def test_private_preview_and_no_partial_game_after_invalid_owner(client, db_session, user_headers, second_user_headers,
                                                                normal_user, second_user, bgg_http):
    preview = prepared(client, db_session, user_headers, bgg_http)
    assert client.get('/api/v1/boardgame-intake-previews/'+preview['id'], headers=second_user_headers).status_code == 404
    body = selection(preview, normal_user.id)
    assert post(client, second_user_headers, '/boardgame-intakes', body).status_code == 404
    body['inventory']['owner_user_id'] = second_user.id
    denied = post(client, user_headers, '/boardgame-intakes', body)
    assert denied.status_code == 403, denied.text
    assert count(db_session, BoardGame) == count(db_session, Inventory) == 0
    item = preview['items'][0]
    bypass = post(client, user_headers, f'/boardgame-imports/{preview["id"]}/apply',
                  {'expected_revision':preview['revision'], 'selection':[{'id':item['item_id'],'expected_revision':item['revision']}]})
    assert bypass.status_code == 409


def test_existing_game_reused_without_overwriting_shared_name(client, db_session, user_headers, second_user_headers,
                                                            normal_user, second_user, bgg_http):
    first = prepared(client, db_session, user_headers, bgg_http)
    created = post(client, user_headers, '/boardgame-intakes', selection(first, normal_user.id)).json()
    other = prepared(client, db_session, second_user_headers, bgg_http)
    assert other['items'][0]['local_game_id'] == created['game_id']
    body = selection(other, second_user.id)
    body['display_name'] = 'should not overwrite'
    second = post(client, second_user_headers, '/boardgame-intakes', body)
    assert second.status_code == 201, second.text
    assert second.json()['game_id'] == created['game_id'] and second.json()['game']['name'] == '用户确认的中文名'
    assert count(db_session, BoardGame) == 1 and count(db_session, Inventory) == 2


def test_explicit_unknown_edition_and_catalog_only(client, db_session, user_headers, normal_user, bgg_http):
    preview = prepared(client, db_session, user_headers, bgg_http)
    body = selection(preview, normal_user.id)
    body.update(bgg_version_id=None, version_unspecified=True)
    body['inventory'].update(edition_name='我的印次', language='中文')
    result = post(client, user_headers, '/boardgame-intakes', body)
    assert result.status_code == 201, result.text
    assert result.json()['inventory'][0]['bgg_version_id'] is None
    other = prepared(client, db_session, user_headers, bgg_http, [701002])
    only = post(client, user_headers, '/boardgame-intakes', selection(other, normal_user.id, inventory=False))
    assert only.status_code == 201, only.text
    assert only.json()['inventory_ids'] == []


def test_manual_fallback_independent_of_bgg(client, db_session, user_headers, normal_user, monkeypatch):
    monkeypatch.setattr(get_settings(), 'bgg_enabled', False)
    monkeypatch.setattr(get_settings(), 'boardgame_import_worker_enabled', False)
    result = post(client, user_headers, '/boardgame-intakes',
                  dict(source='manual', game={'name':'本地独立桌游'}, inventory={'owner_user_id':normal_user.id}))
    assert result.status_code == 201, result.text
    assert result.json()['game']['bgg_id'] is None
    assert post(client, user_headers, '/boardgame-intake-previews', {'bgg_ids':[701001]}).status_code == 503


def test_pending_and_failed_preview_retry(client, db_session, user_headers, bgg_http):
    created = post(client, user_headers, '/boardgame-intake-previews', {'bgg_ids':[701001]}).json()
    assert created['state'] == 'queued' and not created['items']
    worker(db_session, httpx.MockTransport(lambda _:httpx.Response(403)))
    failed = client.get('/api/v1/boardgame-intake-previews/'+created['id'], headers=user_headers).json()
    assert failed['retryable'] is True
    retry = post(client, user_headers, '/boardgame-intake-previews/'+created['id']+'/retry',
                 {'expected_revision':failed['revision']})
    assert retry.status_code == 200, retry.text
    worker(db_session, bgg_http)
    assert client.get('/api/v1/boardgame-intake-previews/'+created['id'], headers=user_headers).json()['state'] == 'ready'

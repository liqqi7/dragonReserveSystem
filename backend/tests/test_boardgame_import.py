"""Worker tests use fabricated exports and an in-memory HTTP transport."""

from copy import deepcopy
from datetime import timedelta
import json
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.boardgame import ImportJob, ImportItem, Inventory, Play, PlaySource, Person
from app.services.boardgame_worker import run_once
from app.services.boardgame_common import now


@pytest.fixture(autouse=True)
def feature(monkeypatch, db_session, tmp_path):
    settings = get_settings()
    monkeypatch.setattr(settings, 'boardgame_enabled', True)
    monkeypatch.setattr(settings, 'boardgame_import_worker_enabled', True)
    monkeypatch.setattr(settings, 'bgg_enabled', True)
    monkeypatch.setattr(settings, 'bgg_api_token', 'synthetic-test-token')
    monkeypatch.setattr(settings, 'bgg_min_interval_seconds', 0)
    monkeypatch.setattr(settings, 'boardgame_import_root', str(tmp_path / 'private-imports'))
    if db_session.bind.dialect.name == 'sqlite':
        db_session.execute(text('PRAGMA foreign_keys=ON'))
    db_session.commit()


def worker(db_session, transport=None):
    factory = sessionmaker(bind=db_session.bind, expire_on_commit=False, autoflush=False)
    result = run_once(factory, transport)
    db_session.expire_all()
    return result


def fixture():
    data = json.loads((Path(__file__).parents[1] / 'design/boardgame-library/bgstats-format-fixture.json').read_text())
    data['games'][0]['copies'] = [dict(uuid=str(uuid4()), statusOwned=1, metaData='{"Quantity":"2"}')]
    return data


def upload(client, headers, data, dataset=None):
    response = client.post('/api/v1/boardgame-imports/bgstats-file', headers={**headers, 'Idempotency-Key': str(uuid4())},
        files={'file': ('synthetic.bgsplay', json.dumps(data).encode(), 'application/json')},
        data={'source_dataset': dataset} if dataset else {})
    assert response.status_code == 202, response.text
    return response.json()


def items(client, headers, job):
    response = client.get(f'/api/v1/boardgame-imports/{job["id"]}/items?limit=100', headers=headers)
    assert response.status_code == 200, response.text
    return response.json()['items']


def decide_and_apply(client, headers, job, decisions, db):
    selection = []
    for item, decision in decisions:
        response = client.patch(f'/api/v1/boardgame-imports/{job["id"]}/items/{item["id"]}', headers=headers,
            json=dict(expected_revision=item['revision'], decision=decision))
        assert response.status_code == 200, response.text
        selection.append(dict(id=item['id'], expected_revision=response.json()['revision']))
    latest = client.get(f'/api/v1/boardgame-imports/{job["id"]}', headers=headers).json()
    response = client.post(f'/api/v1/boardgame-imports/{job["id"]}/apply', headers={**headers, 'Idempotency-Key': str(uuid4())},
        json=dict(expected_revision=latest['revision'], selection=selection))
    assert response.status_code == 202, response.text
    worker(db)
    return items(client, headers, job)


def test_bgstats_self_import_collection_history_private_and_repeat(client, db_session, user_headers, second_user_headers):
    data = fixture()
    job = upload(client, user_headers, data)
    assert job['source_dataset']
    worker(db_session)
    assert client.get(f'/api/v1/boardgame-imports/{job["id"]}', headers=second_user_headers).status_code == 404
    rows = items(client, user_headers, job)
    catalog_item = next(i for i in rows if i['source_kind'] == 'bgstats_game')
    rows = decide_and_apply(client, user_headers, job, [(catalog_item, {'action': 'create_game'})], db_session)
    game_id = next(i for i in rows if i['id'] == catalog_item['id'])['applied_result']['game_ids'][0]
    copy = next(i for i in rows if i['source_kind'] == 'bgstats_copy')
    history = next(i for i in rows if i['source_kind'] == 'bgstats_play')
    decision = dict(action='create_play', target_game_id=game_id, players=[
        dict(source_player_ref=str(p['source_player_ref']), source_slot=p['source_slot'], create_person={'display_name': p['name']})
        for p in history['normalized']['players']])
    rows = decide_and_apply(client, user_headers, job, [(copy, dict(action='create_inventory', target_game_id=game_id)),
        (history, decision)], db_session)
    applied = next(i for i in rows if i['id'] == history['id'])
    assert applied['state'] == 'applied', applied
    play_id = applied['applied_result']['play_ids'][0]
    assert db_session.get(Play, play_id).publication_status == 'held'
    assert client.get(f'/api/v1/boardgame-plays/{play_id}', headers=user_headers).status_code == 404
    assert client.get('/api/v1/boardgame-stats/overview', headers=user_headers).json()['completed_play_count'] == 0
    assert len(list(db_session.scalars(select(Inventory)))) == 2
    assert all(not p.is_visible for p in db_session.scalars(select(Person)))
    assert client.get('/api/v1/boardgame-people', headers=user_headers).json()['items'] == []
    repeated = upload(client, user_headers, data, job['source_dataset'])
    worker(db_session)
    again = items(client, user_headers, repeated)
    rows = decide_and_apply(client, user_headers, repeated, [(next(i for i in again if i['source_kind'] == 'bgstats_copy'),
        dict(action='create_inventory', target_game_id=game_id)), (next(i for i in again if i['source_kind'] == 'bgstats_play'), decision)], db_session)
    assert len(list(db_session.scalars(select(Inventory)))) == 2
    assert len(list(db_session.scalars(select(Play)))) == 1
    assert all(i['state'] == 'applied' for i in rows if i['source_kind'] != 'bgstats_game')
    datasets = client.get('/api/v1/boardgame-imports/datasets', headers=user_headers).json()['items']
    assert len(datasets) == 1 and datasets[0]['id'] == job['source_dataset']
    # The second task can review and publish the reused play without stealing
    # the original source item's provenance or losing it from its report.
    reused = next(i for i in rows if i['source_kind'] == 'bgstats_play')
    path = f'/api/v1/boardgame-imports/{repeated["id"]}/items/{reused["id"]}'
    opened = client.get(path+f'/plays/{play_id}', headers=user_headers)
    assert opened.status_code == 200, opened.text
    hidden = client.get(path+f'/plays/{play_id}', headers=second_user_headers)
    assert hidden.status_code == 404
    report = client.get(f'/api/v1/boardgame-imports/{repeated["id"]}/report', headers=user_headers)
    assert report.json()['publication_counts'] == {'held': 1}
    assert report.json()['application_outcomes']['reused'] == dict(items=2, games=0, inventory=2, plays=1)
    assert report.json()['application_outcomes']['created']['items'] == 0
    preview = client.get(path+'/preview', headers=user_headers).json()['applied_plays'][0]
    latest = client.get(f'/api/v1/boardgame-imports/{repeated["id"]}', headers=user_headers).json()
    published = client.post(f'/api/v1/boardgame-imports/{repeated["id"]}/publish', headers={**user_headers, 'Idempotency-Key':str(uuid4())},
        json=dict(expected_revision=latest['revision'], reason='合成样例已核对', acknowledge_public=True,
            acknowledge_unmatched_people=True, selection=[dict(item_id=reused['id'], play_id=play_id,
                expected_revision=preview['revision'], review_token=preview['review_token'])]))
    assert published.status_code == 200, published.text
    assert db_session.scalar(select(PlaySource)).source_item_id == history['id']


def test_bgg_retry_and_lossless_thing(client, db_session, user_headers):
    calls = []
    def handler(request):
        assert request.url.path.endswith('/thing')
        assert request.url.params['stats'] == '1' and request.url.params['versions'] == '1'
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(202, headers={'Retry-After': '9'})
        return httpx.Response(200, content=b'<items><item type="boardgame" id="900001"><name type="primary" value="Synthetic"/><minplayers value="2"/><maxplayers value="4"/><future keep="yes">raw</future></item></items>')
    response = client.post('/api/v1/boardgame-imports', headers={**user_headers, 'Idempotency-Key': str(uuid4())},
                           json={'kind': 'bgg_thing', 'ids': [900001]})
    assert response.status_code == 202, response.text
    job = response.json()
    transport = httpx.MockTransport(handler)
    before = now()
    worker(db_session, transport)
    stored = db_session.get(ImportJob, job['id'])
    assert stored.state == 'retry_wait'
    assert stored.next_attempt_at >= before + timedelta(seconds=9)
    stored.next_attempt_at = before - timedelta(seconds=1)
    db_session.commit()
    worker(db_session, transport)
    assert db_session.get(ImportJob, job['id']).state == 'ready'
    rows = items(client, user_headers, job)
    thing = next(i for i in rows if i['source_kind'] == 'thing')
    assert 'future' in thing['source']['raw_xml']
    rows = decide_and_apply(client, user_headers, job, [(thing, {'action': 'create_game'})], db_session)
    assert rows[0]['state'] == 'applied', rows


def test_held_correction_and_source_download_stay_private(client, db_session, user_headers, second_user_headers):
    data = fixture()
    job = upload(client, user_headers, data)
    worker(db_session)
    original = client.get(f'/api/v1/boardgame-imports/{job["id"]}/source', headers=user_headers)
    assert original.status_code == 200 and original.json() == data
    assert client.get(f'/api/v1/boardgame-imports/{job["id"]}/source', headers=second_user_headers).status_code == 404
    rows = items(client, user_headers, job)
    catalog_item = next(i for i in rows if i['source_kind'] == 'bgstats_game')
    rows = decide_and_apply(client, user_headers, job, [(catalog_item, {'action': 'create_game'})], db_session)
    gid = next(i for i in rows if i['id'] == catalog_item['id'])['applied_result']['game_ids'][0]
    history = next(i for i in rows if i['source_kind'] == 'bgstats_play')
    decision = dict(action='create_play', target_game_id=gid, players=[dict(source_player_ref=p['source_player_ref'],
        source_slot=p['source_slot'], create_person={'display_name': p['name']}) for p in history['normalized']['players']])
    rows = decide_and_apply(client, user_headers, job, [(history, decision)], db_session)
    history = next(i for i in rows if i['id'] == history['id'])
    pid = history['applied_result']['play_ids'][0]
    path = f'/api/v1/boardgame-imports/{job["id"]}/items/{history["id"]}/plays/{pid}'
    payload = dict(expected_revision=history['revision'], play={'expected_revision': db_session.get(Play, pid).revision,
        'reason': '修改导入备注', 'note': '本地待匹配记录'})
    result = client.patch(path, headers=user_headers, json=payload)
    assert result.status_code == 200, result.text
    assert db_session.get(Play, pid).note == '本地待匹配记录'
    assert db_session.get(Play, pid).publication_status == 'held'
    assert client.patch(path, headers=user_headers, json=payload).status_code == 409
    assert client.patch(path, headers=second_user_headers, json=payload).status_code == 404
    assert client.get('/api/v1/boardgame-stats/overview?scope=mine', headers=user_headers).json()['completed_play_count'] == 0


def test_quantity_requires_distinct_reviewed_segments(client, db_session, user_headers, normal_user):
    def handler(request):
        return httpx.Response(200, content=b'<plays total="1"><play id="91" date="2026-01-02" quantity="2" length="70"><item objectid="9991" name="Test"/><players><player name="Member" score="9"/></players></play></plays>')
    response = client.post('/api/v1/boardgame-imports', headers={**user_headers, 'Idempotency-Key': str(uuid4())},
        json={'kind': 'bgg_plays', 'username': 'synthetic-account'})
    assert response.status_code == 202, response.text
    job = response.json()
    worker(db_session, httpx.MockTransport(handler))
    g = client.post('/api/v1/boardgames', headers={**user_headers, 'Idempotency-Key': str(uuid4())}, json={'name': '虚构分局游戏'}).json()
    row = items(client, user_headers, job)[0]
    decision = dict(action='create_play', target_game_id=g['id'], segment_count=2,
        acknowledged_issues=row['issues'])
    rows = decide_and_apply(client, user_headers, job, [(row, decision)], db_session)
    assert rows[0]['state'] == 'failed' and rows[0]['error_code'] == 'explicit_segments_required'
    assert list(db_session.scalars(select(Play))) == []
    decision['segments'] = [dict(game_id=g['id'], played_on='2026-01-02', status='completed', competition_mode='solo',
        result_status='unknown', score_direction='high', players=[dict(user_id=normal_user.id, seat_order=1)], duration_minutes=n) for n in (20, 50)]
    source = row['normalized']['players'][0]
    decision['players'] = [dict(source_slot=source['source_slot'], source_player_ref=source['source_player_ref'],
        create_person={'display_name': '合成分局待匹配人物'})]
    decision['segment_player_slots'] = [[source['source_slot']], [999]]
    rows = decide_and_apply(client, user_headers, job, [(rows[0], decision)], db_session)
    assert rows[0]['state'] == 'failed' and rows[0]['error_code'] == 'source_slot_mismatch'
    assert list(db_session.scalars(select(Play))) == [], 'a bad second segment must roll back the first'
    assert db_session.scalar(select(Person).where(Person.display_name == '合成分局待匹配人物')) is None
    decision.pop('segment_player_slots')
    decision.pop('players')
    rows = decide_and_apply(client, user_headers, job, [(rows[0], decision)], db_session)
    assert rows[0]['state'] == 'applied', rows
    plays = list(db_session.scalars(select(Play).order_by(Play.id)))
    assert [p.duration_minutes for p in plays] == [20, 50]
    assert all(p.shared_score is None and p.publication_status == 'held' for p in plays)
    assert [x.segment_index for x in db_session.scalars(select(PlaySource).order_by(PlaySource.segment_index))] == [1, 2]


def prepared_history(client, db, headers, data):
    job = upload(client, headers, data); worker(db)
    rows = items(client, headers, job)
    game = next(i for i in rows if i['source_kind'] == 'bgstats_game')
    rows = decide_and_apply(client, headers, job, [(game, {'action':'create_game'})], db)
    gid = next(i for i in rows if i['id'] == game['id'])['applied_result']['game_ids'][0]
    entry = next(i for i in rows if i['source_kind'] == 'bgstats_play')
    choice = dict(action='create_play', target_game_id=gid, acknowledged_issues=entry['issues'], players=[
        dict(source_player_ref=p['source_player_ref'], source_slot=p['source_slot'], create_person={'display_name':p['name']})
        for p in entry['normalized']['players']])
    rows = decide_and_apply(client, headers, job, [(entry, choice)], db)
    return job, gid, next(i for i in rows if i['id'] == entry['id'])


def test_bgstats_uuid_survives_dictionary_renumbering(client, db_session, user_headers):
    data = fixture()
    job, gid, first = prepared_history(client, db_session, user_headers, data)
    people_before = list(db_session.scalars(select(Person.id).order_by(Person.id)))
    newer = deepcopy(data)
    newer['games'][0]['id'] = 901
    for player in newer['players']:
        player['id'] += 1000
    newer['plays'][0].update(uuid=str(uuid4()), gameRefId=901, playDate='2026-07-02 18:30:00')
    for score in newer['plays'][0]['playerScores']:
        score['playerRefId'] += 1000
    repeated = upload(client, user_headers, newer, job['source_dataset']); worker(db_session)
    entry = next(i for i in items(client, user_headers, repeated) if i['source_kind'] == 'bgstats_play')
    assert [p['source_player_ref'] for p in entry['normalized']['players']] == [p['source_player_ref'] for p in first['normalized']['players']]
    # No new manual player choices or target game: confirmed UUID mappings are
    # reused even when every pointer in the new dictionary was reassigned.
    rows = decide_and_apply(client, user_headers, repeated, [(entry, dict(action='create_play', acknowledged_issues=entry['issues']))], db_session)
    assert next(i for i in rows if i['id'] == entry['id'])['state'] == 'applied'
    assert list(db_session.scalars(select(Person.id).order_by(Person.id))) == people_before
    assert [p.game_id for p in db_session.scalars(select(Play).order_by(Play.id))] == [gid, gid]


def test_unstable_source_identities_and_bgg_win_exclusion():
    from app.core.exceptions import AppError
    from app.services.boardgame_sources import bgstats_items, bgg_items
    data = fixture()
    for player in data['players']:
        player.pop('uuid')
    def parse(source):
        return next(i['payload']['normalized'] for i in bgstats_items(json.dumps(source).encode(),
            {'source_namespace':'synthetic'}) if i['source_kind'] == 'bgstats_play')
    before = parse(data)
    changed = deepcopy(data); changed['players'][0]['name'] = '同编号另一位玩家'
    after = parse(changed)
    assert before['players'][0]['source_player_ref'] != after['players'][0]['source_player_ref']
    assert not after['players'][0]['identity_stable']
    duplicate = fixture(); duplicate['players'][1]['uuid'] = duplicate['players'][0]['uuid']
    with pytest.raises(AppError) as exc:
        parse(duplicate)
    assert exc.value.details['reason'] == 'duplicate_source_dictionary_uuid'
    source = b'<plays><play id="9" date="2026-09-01" nowinstats="1"><item objectid="91"/><players><player name="Same" score="0" win="1"/></players></play></plays>'
    params = {'username':'synthetic', 'source_namespace':'synthetic'}
    original = bgg_items(source, 'bgg_plays', params)[0][-1]['payload']['normalized']
    another = bgg_items(source.replace(b'id="9"', b'id="10"'), 'bgg_plays', params)[0][-1]['payload']['normalized']
    assert original['stats_exclusion'] == 'wins' and original['players'][0]['score'] == '0'
    assert original['players'][0]['source_player_ref'] != another['players'][0]['source_player_ref']


def test_review_mapping_history_and_publication(client, db_session, user_headers, second_user_headers):
    job, gid, entry = prepared_history(client, db_session, user_headers, fixture())
    assert entry['state'] == 'applied', entry
    prefix = f'/api/v1/boardgame-imports/{job["id"]}'
    preview = client.get(f'{prefix}/items/{entry["id"]}/preview', headers=user_headers).json()
    local = preview['applied_plays'][0]
    assert local['publication_status'] == 'held' and local['unmatched_people']
    mappings = client.get(prefix+'/mappings', headers=user_headers).json()['items']
    assert len(mappings) == 3
    for mapping in mappings:
        history = client.get(f'{prefix}/mappings/{mapping["id"]}/history', headers=user_headers).json()['items']
        assert len(history) == 1 and history[0]['after_data']['revision'] == 1
    for suffix in ['/report','/mappings',f'/items/{entry["id"]}/preview']:
        assert client.get(prefix+suffix, headers=second_user_headers).status_code == 404
    body = dict(expected_revision=client.get(prefix,headers=user_headers).json()['revision'], reason='已核对合成数据',
        acknowledge_public=True, selection=[dict(item_id=entry['id'], play_id=local['id'], expected_revision=local['revision'], review_token=local['review_token'])])
    assert client.post(prefix+'/publish', headers={**user_headers,'Idempotency-Key':str(uuid4())}, json=body).status_code == 422
    body['acknowledge_unmatched_people'] = True
    stale = deepcopy(body); stale['selection'][0]['review_token'] = '0'*64
    assert client.post(prefix+'/publish', headers={**user_headers,'Idempotency-Key':str(uuid4())}, json=stale).status_code == 409
    headers = {**user_headers,'Idempotency-Key':str(uuid4())}
    result = client.post(prefix+'/publish', headers=headers, json=body)
    assert result.status_code == 200, result.text
    assert result.json()['play_ids'] == [local['id']]
    again = client.post(prefix+'/publish', headers=headers, json=body)
    assert again.status_code == 200 and again.headers['Idempotency-Replayed'] == 'true'
    detail = client.get(f'/api/v1/boardgame-plays/{local["id"]}', headers=second_user_headers).json()
    assert detail['result_status'] == 'resolved' and detail['players'][0]['score'] == '0.000'
    correction = client.patch(f'/api/v1/boardgame-plays/{local["id"]}', headers=user_headers,
        json={'expected_revision':detail['revision'], 'reason':'更正公开记录', 'note':'合成测试'})
    assert correction.status_code == 200, correction.text
    assert client.get(prefix+'/report', headers=user_headers).json()['publication_counts']['published'] == 1


def test_source_team_cooperative_time_cost_and_update(client, db_session, user_headers):
    data = fixture(); data['games'][0]['cooperative'] = True
    data['games'][0]['copies'][0]['metaData'] = json.dumps({'Quantity':'1','PricePaid':'0','PricePaidCurrency':'CNY','AcquisitionDate':'2026-01-01'})
    source = data['plays'][0]
    source.update(rounds=3, comments='合成测试备注', scoresheet='{"variantId":"advanced"}')
    source['playerScores'][0]['score'] = '2+3'; source['playerScores'][1].update(score='5',winner=True)
    job, gid, entry = prepared_history(client, db_session, user_headers, data)
    assert entry['state'] == 'applied', entry
    play = entry['plays'][0]
    assert play['round_count'] == 3 and play['shared_score'] == '5.000' and play['cooperative_result'] == 'success'
    assert play['started_at'].endswith('18:30:00+08:00') and play['note'] == '合成测试备注'
    assert play['rules_snapshot']['variant_key'] == 'advanced'
    copy = next(i for i in items(client,user_headers,job) if i['source_kind']=='bgstats_copy')
    decide_and_apply(client,user_headers,job,[(copy,dict(action='create_inventory',target_game_id=gid))],db_session)
    box = db_session.scalar(select(Inventory)); assert box.purchase_price == 0 and box.purchase_currency == 'CNY'
    data['games'][0]['cooperative']=False; source['usesTeams']=True
    source['playerScores'][0].update(team='A',score='8',winner=True)
    source['playerScores'][1].update(team='B',score='5',winner=False)
    later = upload(client,user_headers,data,job['source_dataset']); worker(db_session)
    incoming = next(i for i in items(client,user_headers,later) if i['source_kind']=='bgstats_play')
    preview = client.get(f'/api/v1/boardgame-imports/{later["id"]}/items/{incoming["id"]}/preview',headers=user_headers).json()
    assert preview['same_source'][0]['changed'] and preview['same_source'][0]['differences']
    decision=dict(action='update_play',target_game_id=gid,target_play_id=play['id'],target_play_revision=play['revision'],
        reason='核对来源更正',acknowledged_issues=incoming['issues'],replace_scoresheet=True)
    rows=decide_and_apply(client,user_headers,later,[(incoming,decision)],db_session)
    result=next(i for i in rows if i['id']==incoming['id'])
    assert result['state']=='applied', result
    assert result['plays'][0]['competition_mode']=='team'
    assert [t['score'] for t in result['plays'][0]['teams']]==['8.000','5.000']
    assert len(list(db_session.scalars(select(Play))))==1

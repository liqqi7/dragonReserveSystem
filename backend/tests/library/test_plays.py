"""Recorded plays: create, list scopes, edit permissions and soft delete."""
from uuid import uuid4

from sqlalchemy import select

from app.api.deps import get_current_user
from app.models.boardgame import AuditEvent, Play, PlayPlayer
from tests.library.test_library import post, payload, ready


def create_game_with_inventory(library):
    client, db, actor, other, factory, app = library
    result = post(client, '/boardgame-intakes', payload(ready(library))).json()
    return result['game_id']


def play_body(game_id, actor_id, other_id, **overrides):
    body = dict(game_id=game_id, played_on='2026-06-14',
                players=[dict(user_id=actor_id, score=168), dict(user_id=other_id, score=172)])
    body.update(overrides)
    return body


def test_create_play_computes_winner_and_lists_by_scope(library):
    client, db, actor, other, factory, app = library
    game_id = create_game_with_inventory(library)
    created = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id))
    assert created.status_code == 201, created.text
    data = created.json()
    assert data['can_edit'] is True
    assert [p['display_name'] for p in data['players']] == ['乙', '甲']
    assert data['players'][0]['is_winner'] is True and data['players'][0]['score'] == '172.00'
    assert data['players'][1]['is_winner'] is False
    # 并列第一都记为胜者
    tied = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id, players=[
        dict(user_id=actor.id, score=170), dict(user_id=other.id, score=170)]))
    assert all(p['is_winner'] for p in tied.json()['players'])
    # 全部 / 我参与的 / 我获胜的
    assert len(client.get(f'/api/v1/boardgame-plays?game_id={game_id}').json()['items']) == 2
    assert len(client.get(f'/api/v1/boardgame-plays?game_id={game_id}&scope=mine').json()['items']) == 2
    won = client.get(f'/api/v1/boardgame-plays?game_id={game_id}&scope=won').json()['items']
    assert len(won) == 1 and won[0]['players'][0]['score'] == '170.00'
    app.dependency_overrides[get_current_user] = lambda: other
    assert len(client.get(f'/api/v1/boardgame-plays?game_id={game_id}&scope=won').json()['items']) == 2
    assert client.get(f'/api/v1/boardgame-plays?game_id={game_id}&scope=mine').json()['items'][0]['can_edit'] is False


def test_update_and_delete_play_permissions(library):
    from datetime import date
    client, db, actor, other, factory, app = library
    game_id = create_game_with_inventory(library)
    created = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id)).json()
    url = f"/api/v1/boardgame-plays/{created['id']}"
    app.dependency_overrides[get_current_user] = lambda: other
    assert client.delete(url).status_code == 403
    assert client.patch(url, json={'expected_revision': 1, 'played_on': '2026-06-15'}).status_code == 403
    app.dependency_overrides[get_current_user] = lambda: actor
    updated = client.patch(url, json={'expected_revision': 1, 'played_on': '2026-06-15',
                                      'players': [dict(user_id=actor.id, score=200),
                                                  dict(user_id=other.id, score=172)]})
    assert updated.status_code == 200, updated.text
    assert updated.json()['played_on'] == '2026-06-15'
    assert updated.json()['players'][0]['display_name'] == '甲'
    assert updated.json()['players'][0]['is_winner'] is True
    assert client.patch(url, json={'expected_revision': 1, 'played_on': '2026-06-16'}).status_code == 409
    deleted = client.delete(url)
    assert deleted.status_code == 200, deleted.text
    assert db.get(Play, created['id']).archived_at is not None
    assert client.get(f'/api/v1/boardgame-plays?game_id={game_id}').json()['items'] == []
    assert client.delete(url).status_code == 409
    actions = [e.action for e in db.scalars(select(AuditEvent).where(
        AuditEvent.entity_id == str(created['id']), AuditEvent.entity_type == 'plays'))]
    assert actions.count('create') == 1 and actions.count('update') == 1 and actions.count('archive') == 1


def test_play_validation_and_scores_optional(library):
    client, db, actor, other, factory, app = library
    game_id = create_game_with_inventory(library)
    # 无分数也允许保存，但不产生胜者
    unscored = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id,
                    players=[dict(user_id=actor.id), dict(user_id=other.id)]))
    assert unscored.status_code == 201, unscored.text
    assert all(p['score'] is None and p['is_winner'] is False for p in unscored.json()['players'])
    # 重复玩家 / 不存在的成员
    dup = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id,
               players=[dict(user_id=actor.id, score=1), dict(user_id=actor.id, score=2)]))
    assert dup.status_code == 422
    missing = post(client, '/boardgame-plays', play_body(game_id, actor.id, other.id,
                   players=[dict(user_id=actor.id), dict(user_id=999)]))
    assert missing.status_code == 422
    # 成员搜索
    assert any(u['id'] == other.id for u in client.get('/api/v1/users/search?q=').json()['items'])

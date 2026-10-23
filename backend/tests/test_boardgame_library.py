from datetime import datetime
from sqlalchemy import select
from app.models.boardgame import BoardGame, Inventory
from app.services.boardgame_catalog import library_metadata
from tests.test_boardgame_api import boardgame_feature, game, create


def test_library_cards_have_saved_bgg_rating_and_chinese_mechanics(client, db_session, user_headers):
    g=game(client,user_headers,name='Library test')
    row=db_session.get(BoardGame,g['id'])
    row.bgg_payload={'projection':{'bgg_rating':'8.5596','mechanics':['Hand Management']}}
    db_session.commit()
    for suffix in ('', '?q=手牌', '?q=Hand'):
        response=client.get('/api/v1/boardgames'+suffix,headers=user_headers)
        assert response.status_code==200
        card=response.json()['items'][0]
        assert card['bgg_rating']=='8.56'
        assert card['mechanic_tags'][0]['name']=='手牌管理'
        assert 'bgg_payload' not in card


def test_recent_arrivals_follow_latest_intake_across_all_owners(client, db_session, user_headers,
        normal_user, second_user_headers, second_user):
    first=game(client,user_headers,name='Older catalog, newer intake')
    second=game(client,user_headers,name='Newer catalog, older intake')
    other=game(client,second_user_headers,name='Other owner only')
    for g,headers,owner in [(first,user_headers,normal_user), (second,user_headers,normal_user),
                            (other,second_user_headers,second_user)]:
        create(client,headers,'/boardgame-inventory',{'game_id':g['id'],'owner_user_id':owner.id})
    repeat=create(client,user_headers,'/boardgame-inventory',{'game_id':first['id'],'owner_user_id':normal_user.id})['items'][0]
    for inv in db_session.scalars(select(Inventory)):
        inv.created_at=datetime(2026,1,1,12,0)
        inv.updated_at=datetime(2026,4,1,12,0)
    db_session.get(Inventory,repeat['id']).created_at=datetime(2026,2,1,12,0)
    db_session.commit()
    rows=client.get('/api/v1/boardgames/recent-arrivals',headers=user_headers).json()['items']
    assert [g['id'] for g in rows]==[first['id'],other['id'],second['id']]
    rows=client.get('/api/v1/boardgames/recent-arrivals?limit=1',headers=user_headers).json()['items']
    assert [g['id'] for g in rows]==[first['id']]
    # Editing a copy does not change intake order. A later recorded copy does.
    inv=db_session.scalar(select(Inventory).where(Inventory.game_id==second['id']))
    inv.created_at=datetime(2026,3,1,12,0)
    db_session.commit()
    rows=client.get('/api/v1/boardgames/recent-arrivals',headers=user_headers).json()['items']
    assert [g['id'] for g in rows]==[second['id'],first['id'],other['id']]
    inv.status='retired'
    db_session.commit()
    rows=client.get('/api/v1/boardgames/recent-arrivals',headers=user_headers).json()['items']
    assert [g['id'] for g in rows]==[first['id'],other['id']]
    for inv in db_session.scalars(select(Inventory).where(Inventory.game_id==first['id'])):
        inv.archived_at=datetime(2026,4,1,12,0)
    db_session.commit()
    assert [g['id'] for g in client.get('/api/v1/boardgames/recent-arrivals',headers=user_headers).json()['items']]==[other['id']]


def test_legacy_archive_rating_without_network():
    payload={'raw':{'children':[{'tag':'statistics','children':[{'tag':'ratings','children':[
        {'tag':'average','attributes':{'value':'8.5596'}}]}]},
        {'tag':'link','attributes':{'type':'boardgamemechanic','value':'Hand Management'}}]}}
    data=library_metadata(payload)
    assert data['bgg_rating']=='8.56'
    assert data['mechanic_tags'][0]['name']=='手牌管理'
    assert library_metadata(None)['bgg_rating'] is None


def test_change_version_saves_snapshot_and_rejects_stale_or_foreign(client, db_session, user_headers, normal_user, second_user_headers):
    g=game(client,user_headers,name='Version change')
    row=db_session.get(BoardGame,g['id'])
    def child(tag, value):
        return {'tag':tag,'attributes':{'value':value}}
    row.bgg_payload={'raw':{'children':[{'tag':'versions','children':[
        {'tag':'item','attributes':{'id':'101'},'children':[child('name','Chinese edition'),child('yearpublished','2020'),{'tag':'link','attributes':{'type':'language','value':'Chinese'}}]},
        {'tag':'item','attributes':{'id':'102'},'children':[child('name','English edition')]}]}]}}
    db_session.commit()
    box=create(client,user_headers,'/boardgame-inventory',{'game_id':g['id'],'owner_user_id':normal_user.id})['items'][0]
    detail=client.get(f"/api/v1/boardgames/{g['id']}",headers=user_headers).json()
    assert len(detail['version_options'])==2
    path=f"/api/v1/boardgame-inventory/{box['id']}/version"
    payload={'expected_revision':box['revision'],'bgg_version_id':101}
    assert client.put(path,headers=second_user_headers,json=payload).status_code==403
    assert client.put(path,headers=user_headers,json={**payload,'bgg_version_id':999}).status_code==422
    saved=client.put(path,headers=user_headers,json=payload)
    assert saved.status_code==200
    assert saved.json()['bgg_version_id']==101
    assert saved.json()['bgg_version']['year_published']==2020
    assert client.put(path,headers=user_headers,json={**payload,'bgg_version_id':102}).status_code==409
    assert client.get(f"/api/v1/boardgame-inventory/{box['id']}",headers=user_headers).json()['bgg_version_id']==101

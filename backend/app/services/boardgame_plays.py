"""Recorded plays with member scores. No guests, teams or score templates yet."""
from sqlalchemy import func, select

from app.models import User
from app.models.boardgame import BoardGame, Play, PlayExpansion, PlayPlayer
from app.services.boardgame_common import (audit, check_revision, columns, fail, get, member,
                                           now, page, stamp, touch, user_summary)
from app.services.boardgame_catalog import game as load_game
from app.services.boardgame_catalog import library_metadata, validate_expansion_ids

PLAY_PUBLIC = ['id', 'game_id', 'played_on', 'archived_at', 'revision']


def _winner_indexes(players):
    scores = [p.score for p in players if p.score is not None]
    if not scores:
        return set()
    best = max(scores)
    return {i for i, p in enumerate(players) if p.score is not None and p.score == best}


def _players(db, play_id):
    return db.scalars(select(PlayPlayer).where(PlayPlayer.play_id == play_id)
                      .order_by(PlayPlayer.is_winner.desc(), PlayPlayer.score.is_(None), PlayPlayer.score.desc(),
                                PlayPlayer.seat_order, PlayPlayer.id)).all()


def _expansions(db, play_id):
    rows = db.scalars(select(PlayExpansion).where(PlayExpansion.play_id == play_id)
                      .order_by(PlayExpansion.sort_order, PlayExpansion.expansion_game_id)).all()
    out = []
    for e in rows:
        g = db.get(BoardGame, e.expansion_game_id)
        snap = e.game_snapshot or {}
        out.append(dict(game_id=e.expansion_game_id,
                        name=(g.name if g else snap.get('name')),
                        chinese_name=(library_metadata(g.bgg_payload).get('chinese_name') if g else None),
                        cover_url=(g.cover_url if g else snap.get('cover_url')),
                        sort_order=e.sort_order))
    return out


def _write_expansions(db, play, expansion_ids):
    for old in db.scalars(select(PlayExpansion).where(PlayExpansion.play_id == play.id)).all():
        db.delete(old)
    db.flush()
    for order, identity in enumerate(expansion_ids, 1):
        g = db.get(BoardGame, identity)
        snapshot = dict(id=g.id, bgg_id=g.bgg_id, name=g.name, cover_url=g.cover_url, game_type=g.game_type)
        db.add(PlayExpansion(play_id=play.id, expansion_game_id=identity,
                             game_snapshot=snapshot, sort_order=order))


def play_detail(db, obj, actor):
    out = columns(obj, PLAY_PUBLIC)
    out['played_on'] = obj.played_on.isoformat() if obj.played_on else None
    out['created_by'] = obj.created_by
    out['can_edit'] = obj.created_by == actor.id or actor.role == 'admin'
    out['players'] = [dict(id=p.id, user_id=p.user_id, display_name=p.display_name,
                           score=str(p.score) if p.score is not None else None,
                           is_winner=bool(p.is_winner), seat_order=p.seat_order,
                           avatar_url=(user_summary(db, p.user_id) or {}).get('avatar_url'))
                      for p in _players(db, obj.id)]
    out['expansions'] = _expansions(db, obj.id)
    return out


def _validate_players(db, players):
    ids = [p.user_id for p in players]
    if len(set(ids)) != len(ids):
        fail('duplicate_player')
    members = {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids)))}
    if any(i not in members for i in ids):
        fail('player_not_found')
    return members


def create_play(db, actor, payload):
    load_game(db, payload.game_id, actor, usable=True, lock=True)
    members = _validate_players(db, payload.players)
    winners = _winner_indexes(payload.players)
    play = Play(**stamp(actor), game_id=payload.game_id, played_on=payload.played_on)
    db.add(play)
    db.flush()
    if payload.expansion_game_ids:
        validate_expansion_ids(db, payload.game_id, payload.expansion_game_ids)
        _write_expansions(db, play, payload.expansion_game_ids)
    for order, p in enumerate(payload.players, 1):
        db.add(PlayPlayer(play_id=play.id, user_id=p.user_id,
                          display_name=p.display_name or members[p.user_id].nickname or '成员',
                          score=p.score, is_winner=(order - 1) in winners, seat_order=order))
    audit(db, play, actor, 'create', after=play_detail(db, play, actor))
    db.flush()
    return play


def list_plays(db, actor, game_id, scope, limit, cursor):
    load_game(db, game_id, actor)
    stmt = select(Play).where(Play.game_id == game_id, Play.archived_at.is_(None))
    if scope in ('mine', 'won'):
        cond = select(PlayPlayer.id).where(PlayPlayer.play_id == Play.id,
                                           PlayPlayer.user_id == actor.id)
        if scope == 'won':
            cond = cond.where(PlayPlayer.is_winner.is_(True))
        stmt = stmt.where(cond.exists())
    return page(db, stmt, Play.id, lambda p: play_detail(db, p, actor), limit, cursor,
                {'game_id': game_id, 'scope': scope, 'actor': actor.id},
                order_column=Play.played_on, descending=True)


def _replace_players(db, obj, players):
    for old in _players(db, obj.id):
        db.delete(old)
    db.flush()
    members = _validate_players(db, players)
    winners = _winner_indexes(players)
    for order, p in enumerate(players, 1):
        db.add(PlayPlayer(play_id=obj.id, user_id=p.user_id,
                          display_name=p.display_name or members[p.user_id].nickname or '成员',
                          score=p.score, is_winner=(order - 1) in winners, seat_order=order))


def update_play(db, obj, actor, payload):
    if obj.created_by != actor.id and actor.role != 'admin':
        fail('own_play_only', 403)
    if obj.archived_at:
        fail('play_unavailable', 409)
    check_revision(obj, payload.expected_revision)
    before = play_detail(db, obj, actor)
    if payload.played_on is not None:
        obj.played_on = payload.played_on
    if payload.players is not None:
        _replace_players(db, obj, payload.players)
    if payload.expansion_game_ids is not None:
        validate_expansion_ids(db, obj.game_id, payload.expansion_game_ids)
        _write_expansions(db, obj, payload.expansion_game_ids)
    touch(obj, actor)
    audit(db, obj, actor, 'update', before, payload.reason, play_detail(db, obj, actor))
    db.flush()
    return obj


def delete_play(db, obj, actor):
    if obj.created_by != actor.id and actor.role != 'admin':
        fail('own_play_only', 403)
    if obj.archived_at:
        fail('play_unavailable', 409)
    before = play_detail(db, obj, actor)
    obj.archived_at = now()
    touch(obj, actor)
    audit(db, obj, actor, 'archive', before, None, play_detail(db, obj, actor))
    db.flush()

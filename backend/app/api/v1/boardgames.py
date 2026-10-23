"""Library browsing and member-owned editions only."""
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_optional_current_user
from app.api.boardgame_deps import enabled, body_limit, write_db
from app.core.database import get_db
from app.models import User
from app.models.boardgame import BoardGame, Inventory
from app.schemas.boardgame import ExpansionLinksPut, InventoryVersionChange
from app.services import boardgame_catalog as catalog
from app.services.boardgame_common import check_revision, columns, fail, get, member, page

router = APIRouter(tags=['boardgame-library'], dependencies=[Depends(enabled), Depends(body_limit)])


def visible_games():
    return (BoardGame.is_visible.is_(True), BoardGame.archived_at.is_(None), BoardGame.merged_into_id.is_(None))


def card(db, game):
    meta = catalog.library_metadata(game.bgg_payload)
    return {**columns(game, catalog.GAME_PUBLIC), **meta,
            'cover_thumb': meta.get('thumbnail_url') or game.cover_url,
            'inventory_summary':catalog.inventory_summary(db, game.id)}


@router.get('/boardgames')
def games(q: str = Query('', max_length=255), player_count: int | None = Query(None, ge=1, le=100),
          min_players: int | None = Query(None, ge=1, le=100),
          max_players: int | None = Query(None, ge=1, le=100),
          min_minutes: int | None = Query(None, ge=1),
          max_minutes: int | None = Query(None, ge=1),
          min_complexity: Decimal | None = Query(None, ge=1, le=5),
          max_complexity: Decimal | None = Query(None, ge=1, le=5),
          owner_user_ids: list[int] | None = Query(None),
          limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
          db: Session = Depends(get_db), actor: User | None = Depends(get_optional_current_user)):
    if min_complexity is not None and max_complexity is not None and min_complexity > max_complexity:
        fail('invalid_range')
    if min_players is not None and max_players is not None and min_players > max_players:
        fail('invalid_range')
    if min_minutes is not None and max_minutes is not None and min_minutes > max_minutes:
        fail('invalid_range')
    has_inventory = select(Inventory.id).where(Inventory.game_id == BoardGame.id,
        Inventory.archived_at.is_(None), Inventory.status != 'retired').exists()
    stmt = select(BoardGame).where(*visible_games(), has_inventory, BoardGame.game_type != 'expansion')
    if q.strip():
        stmt = stmt.where(BoardGame.search_text.contains(q.strip().casefold(), autoescape=True))
    if player_count is not None:
        stmt = stmt.where(BoardGame.min_players <= player_count, BoardGame.max_players >= player_count)
    if min_players is not None:
        stmt = stmt.where(BoardGame.max_players >= min_players)
    if max_players is not None:
        stmt = stmt.where(BoardGame.min_players <= max_players)
    if min_minutes is not None:
        stmt = stmt.where(BoardGame.min_playtime_minutes >= min_minutes)
    if max_minutes is not None:
        stmt = stmt.where(BoardGame.max_playtime_minutes <= max_minutes)
    if min_complexity is not None:
        stmt = stmt.where(BoardGame.complexity >= min_complexity)
    if max_complexity is not None:
        stmt = stmt.where(BoardGame.complexity <= max_complexity)
    if owner_user_ids:
        owned_by_selected = select(Inventory.game_id).where(
            Inventory.owner_user_id.in_(owner_user_ids),
            Inventory.archived_at.is_(None), Inventory.status != 'retired')
        stmt = stmt.where(BoardGame.id.in_(owned_by_selected))
    return page(db, stmt, BoardGame.id, lambda g: card(db, g), limit, cursor,
        dict(q=q, player_count=player_count, min_players=min_players, max_players=max_players,
             min_minutes=min_minutes, max_minutes=max_minutes,
             min_complexity=min_complexity, max_complexity=max_complexity,
             owner_user_ids=owner_user_ids),
        order_column=BoardGame.created_at, descending=True)


@router.get('/boardgame-owners')
def owners(q: str = Query('', max_length=64), limit: int = Query(50, ge=1, le=100),
           db: Session = Depends(get_db), actor: User | None = Depends(get_optional_current_user)):
    """Distinct members who currently own at least one copy, for the library owner filter."""
    stmt = (select(User.id, User.nickname, User.avatar_url,
                   func.count(Inventory.id).label('copy_count'),
                   func.count(func.distinct(Inventory.game_id)).label('game_count'))
            .join(Inventory, Inventory.owner_user_id == User.id)
            .where(Inventory.archived_at.is_(None), Inventory.status != 'retired')
            .group_by(User.id, User.nickname, User.avatar_url))
    if q.strip():
        stmt = stmt.where(User.nickname.contains(q.strip(), autoescape=True))
    stmt = stmt.order_by(func.count(Inventory.id).desc(), User.id).limit(limit)
    rows = db.execute(stmt).all()
    return {'items': [dict(id=row.id, nickname=row.nickname, avatar_url=row.avatar_url,
                           copy_count=row.copy_count, game_count=row.game_count) for row in rows]}


@router.put('/boardgames/{game_id}/expansions')
def set_expansions(game_id: int, payload: ExpansionLinksPut,
                   db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return {'items': catalog.set_expansions(db, game_id, actor, payload)}


@router.put('/boardgames/{game_id}/my-expansions')
def set_my_expansions(game_id: int, payload: ExpansionLinksPut,
                      db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return {'items': catalog.set_my_expansions(db, game_id, actor, payload)}


@router.get('/boardgames/recent-arrivals')
def recent_arrivals(limit: int = Query(50, ge=1, le=50), db: Session = Depends(get_db),
                    actor: User | None = Depends(get_optional_current_user)):
    latest = select(Inventory.game_id, func.max(Inventory.created_at).label('entered_at')).where(
        Inventory.archived_at.is_(None),
        Inventory.status != 'retired').group_by(Inventory.game_id).subquery()
    rows = db.scalars(select(BoardGame).join(latest, latest.c.game_id == BoardGame.id)
        .where(*visible_games(), BoardGame.game_type != 'expansion')
        .order_by(latest.c.entered_at.desc(), BoardGame.id.desc()).limit(limit))
    return {'items':[card(db, game) for game in rows]}


@router.get('/boardgames/{game_id}')
def game_detail(game_id: int, db: Session = Depends(get_db), actor: User | None = Depends(get_optional_current_user)):
    game = catalog.game(db, game_id, actor)
    if (game.archived_at or game.merged_into_id) and actor is None:
        fail('not_found', 404)
    result = catalog.game_detail(db, game, actor)
    active = (Inventory.game_id == game_id, Inventory.archived_at.is_(None), Inventory.status != 'retired')
    result['owner_count'] = db.scalar(select(func.count(func.distinct(Inventory.owner_user_id))).where(*active))
    if not result['owner_count']:
        fail('not_found', 404)
    result['my_versions'] = [catalog.inventory_detail(db, box, actor) for box in db.scalars(
        select(Inventory).where(*active, Inventory.owner_user_id == actor.id).order_by(Inventory.id.desc()))] if actor and actor.role in ('user', 'admin') else []
    return result


@router.get('/boardgame-inventory')
def inventories(game_id: int, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    catalog.game(db, game_id, actor)
    stmt = select(Inventory).where(Inventory.game_id == game_id, Inventory.archived_at.is_(None), Inventory.status != 'retired')
    return page(db, stmt, Inventory.id, lambda box:catalog.inventory_detail(db, box, actor),
                limit, cursor, {'game_id':game_id, 'actor':actor.id})


@router.get('/boardgame-inventory/{inventory_id}')
def inventory_detail(inventory_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    box = get(db, Inventory, inventory_id)
    catalog.game(db, box.game_id, actor)
    if box.archived_at:
        fail('not_found', 404)
    return catalog.inventory_detail(db, box, actor)


@router.put('/boardgame-inventory/{inventory_id}/version')
def change_version(inventory_id: int, payload: InventoryVersionChange,
                   db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    box = get(db, Inventory, inventory_id, True)
    return catalog.inventory_detail(db, catalog.change_inventory_version(db, box, actor, payload), actor)


@router.delete('/boardgame-inventory/{inventory_id}')
def delete_inventory(inventory_id: int, expected_revision: int | None = Query(None),
                     db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    box = get(db, Inventory, inventory_id, True)
    if expected_revision is not None:
        check_revision(box, expected_revision)
    remaining = catalog.delete_inventory(db, box, actor)
    return {'id': box.id, 'game_id': box.game_id, 'archived_at': box.archived_at,
            'remaining_owners': remaining}


@router.get('/boardgames/{game_id}/images')
def game_images(game_id: int, db: Session = Depends(get_db), actor: User | None = Depends(get_optional_current_user)):
    game = catalog.game(db, game_id, actor)
    if (game.archived_at or game.merged_into_id) and actor is None:
        fail('not_found', 404)
    from app.services.boardgame_images import images
    return images(game.bgg_id)

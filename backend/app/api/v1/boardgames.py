"""Library browsing and member-owned editions only."""
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled, body_limit, write_db
from app.core.database import get_db
from app.models import User
from app.models.boardgame import BoardGame, Inventory
from app.schemas.boardgame import InventoryVersionChange
from app.services import boardgame_catalog as catalog
from app.services.boardgame_common import columns, fail, get, member, page

router = APIRouter(tags=['boardgame-library'], dependencies=[Depends(enabled), Depends(body_limit)])


def visible_games():
    return (BoardGame.is_visible.is_(True), BoardGame.archived_at.is_(None), BoardGame.merged_into_id.is_(None))


def card(db, game):
    return {**columns(game, catalog.GAME_PUBLIC), **catalog.library_metadata(game.bgg_payload),
            'inventory_summary':catalog.inventory_summary(db, game.id)}


@router.get('/boardgames')
def games(q: str = Query('', max_length=255), player_count: int | None = Query(None, ge=1, le=100),
          max_minutes: int | None = Query(None, ge=1),
          min_complexity: Decimal | None = Query(None, ge=1, le=5),
          max_complexity: Decimal | None = Query(None, ge=1, le=5),
          limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
          db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    if min_complexity is not None and max_complexity is not None and min_complexity > max_complexity:
        fail('invalid_range')
    has_inventory = select(Inventory.id).where(Inventory.game_id == BoardGame.id,
        Inventory.archived_at.is_(None), Inventory.status != 'retired').exists()
    stmt = select(BoardGame).where(*visible_games(), has_inventory)
    if q.strip():
        stmt = stmt.where(BoardGame.search_text.contains(q.strip().casefold(), autoescape=True))
    if player_count is not None:
        stmt = stmt.where(BoardGame.min_players <= player_count, BoardGame.max_players >= player_count)
    if max_minutes is not None:
        stmt = stmt.where(BoardGame.max_playtime_minutes <= max_minutes)
    if min_complexity is not None:
        stmt = stmt.where(BoardGame.complexity >= min_complexity)
    if max_complexity is not None:
        stmt = stmt.where(BoardGame.complexity <= max_complexity)
    return page(db, stmt, BoardGame.id, lambda g: card(db, g), limit, cursor,
        dict(q=q, player_count=player_count, max_minutes=max_minutes,
             min_complexity=min_complexity, max_complexity=max_complexity),
        order_column=BoardGame.created_at, descending=True)


@router.get('/boardgames/recent-arrivals')
def recent_arrivals(limit: int = Query(50, ge=1, le=50), db: Session = Depends(get_db),
                    actor: User = Depends(get_current_user)):
    member(actor)
    latest = select(Inventory.game_id, func.max(Inventory.created_at).label('entered_at')).where(
        Inventory.owner_user_id == actor.id, Inventory.archived_at.is_(None),
        Inventory.status != 'retired').group_by(Inventory.game_id).subquery()
    rows = db.scalars(select(BoardGame).join(latest, latest.c.game_id == BoardGame.id)
        .where(*visible_games()).order_by(latest.c.entered_at.desc(), BoardGame.id.desc()).limit(limit))
    return {'items':[card(db, game) for game in rows]}


@router.get('/boardgames/{game_id}')
def game_detail(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    game = catalog.game(db, game_id, actor)
    result = catalog.game_detail(db, game, actor)
    active = (Inventory.game_id == game_id, Inventory.archived_at.is_(None), Inventory.status != 'retired')
    result['owner_count'] = db.scalar(select(func.count(func.distinct(Inventory.owner_user_id))).where(*active))
    if not result['owner_count']:
        fail('not_found', 404)
    result['my_versions'] = [catalog.inventory_detail(db, box, actor) for box in db.scalars(
        select(Inventory).where(*active, Inventory.owner_user_id == actor.id).order_by(Inventory.id.desc()))]
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


@router.get('/boardgames/{game_id}/images')
def game_images(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    game = catalog.game(db, game_id, actor)
    from app.services.boardgame_images import images
    return images(game.bgg_id)

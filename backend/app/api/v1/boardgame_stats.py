"""Chart and table endpoints share filters with the play list."""

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled
from app.core.database import get_db
from app.models import User, Activity
from app.models.boardgame import Play
from app.services import boardgame_statistics as s
from app.services import boardgame_detail_stats as detailed
from app.services.boardgame_common import fail, page, columns

router = APIRouter(prefix='/boardgame-stats', tags=['boardgame-stats'], dependencies=[Depends(enabled)])
FUNCTIONS = {'overview': s.overview, 'most-played': s.most_played, 'players': s.players,
    'comparison-groups': s.comparison_groups, 'expansions': s.expansions, 'breakdowns': s.breakdowns,
    'locations': s.locations, 'partners': s.partners, 'trends': s.trends, 'wanted': s.wanted,
    'roles': s.roles, 'scoresheet-groups': s.scoresheet_groups, 'scoresheets': s.score_rows,
    'detailed': detailed.detailed, 'streaks': detailed.streaks, 'score-curve': detailed.score_curve, 'variants': detailed.variants}


@router.get('/activity-options')
def activity_options(limit: int = Query(20, ge=1, le=100), cursor: str | None = None, q: str = Query('', max_length=128),
                     db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    public_history = select(Play.original_activity_id.label('id')).where(Play.publication_status == 'published',
        Play.status.in_(['completed', 'abandoned']), Play.original_activity_id.is_not(None))
    current = select(Activity.id).where(Activity.status != '已删除')
    if q.strip():
        current = current.where(Activity.name.contains(q.strip(), autoescape=True))
        public_history = public_history.where(Play.activity_snapshot['name'].as_string().contains(q.strip(), autoescape=True))
    ids = current.union(public_history).subquery()
    def render(identity):
        obj = db.get(Activity, identity)
        if obj and obj.status != '已删除':
            return {**columns(obj, ['id', 'name', 'start_time', 'end_time']), 'historical': False}
        snapshot = db.scalar(select(Play.activity_snapshot).where(Play.original_activity_id == identity,
            Play.publication_status == 'published', Play.status.in_(['completed', 'abandoned'])).order_by(Play.id.desc()).limit(1))
        return {**(snapshot or {}), 'id': identity, 'historical': True}
    return page(db, select(ids.c.id), ids.c.id, render, limit, cursor, {'kind': 'activity-options', 'q': q})


@router.get('/wanted/{game_id}/sources')
def wanted_sources(game_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    q = s.parse_query(request)
    if q.game_id and q.game_id != game_id:
        fail('game_id_mismatch')
    result = {**s.metadata(db, q, actor), **s.wanted(db, q, actor, game_id)}
    db.commit()
    return result


@router.get('/games/{game_id}/{metric}')
def game_stat(game_id: int, metric: str, request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    if metric not in ('players', 'comparison-groups', 'roles', 'scoresheet-groups', 'scoresheets', 'detailed', 'streaks', 'score-curve', 'variants'):
        fail('not_found', 404)
    q = s.parse_query(request)
    if q.game_id and q.game_id != game_id:
        fail('game_id_mismatch')
    q.game_id = game_id
    return {**s.metadata(db, q, actor), **FUNCTIONS[metric](db, q, actor)}


@router.get('/{metric}')
def stat(metric: str, request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    if metric not in ('overview', 'most-played', 'players', 'expansions', 'breakdowns', 'locations', 'partners', 'trends', 'wanted'):
        fail('not_found', 404)
    q = s.parse_query(request)
    result = {**s.metadata(db, q, actor), **FUNCTIONS[metric](db, q, actor)}
    if metric == 'wanted':
        db.commit()
    return result

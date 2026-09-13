"""Board game catalog, inventory, identity and activity HTTP endpoints."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, load_only, defer

from app.api.deps import get_current_user
from app.api.boardgame_deps import enabled, body_limit, write_db
from app.core.config import get_settings
from app.core.database import get_db
from app.models import Activity, ActivityParticipant, User
from app.models.boardgame import (BoardGame, Inventory, InventorySource, ExpansionLink, Person, Location,
    Ruleset, Nomination, GamePlan, PlanExpansion, Play, ImportItem, GameTag, GameTagLink)
from app.schemas import boardgame as s
from app.services import boardgame_catalog as c, boardgame_activity as a
from app.services.boardgame_common import (admin, audit, check_revision, columns, create_once, fail, get,
    member, now, page, safe, touch, unique, user_summary)

router = APIRouter(tags=['boardgames'], dependencies=[Depends(enabled), Depends(body_limit)])


@router.get('/boardgame-management/resources')
def management_resources(kind: Literal['games', 'inventory', 'people', 'locations'], archived: bool = False,
                         q: str = Query('', max_length=128), game_id: int | None = None,
                         limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                         db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    """Maintain public catalog identities and recover archived resources without exposing imports."""
    member(actor)
    cls = {'games': BoardGame, 'inventory': Inventory, 'people': Person, 'locations': Location}[kind]
    if kind in ('people', 'locations'):
        admin(actor)
    stmt = select(cls).where(cls.archived_at.is_not(None) if archived else cls.archived_at.is_(None))
    if kind == 'inventory':
        stmt = stmt.join(BoardGame, BoardGame.id == Inventory.game_id).where(BoardGame.is_visible.is_(True))
        if actor.role != 'admin':
            stmt = stmt.where(Inventory.owner_type == 'member', Inventory.owner_user_id == actor.id)
        if game_id is not None:
            stmt = stmt.where(Inventory.game_id == game_id)
        if q.strip():
            stmt = stmt.where(BoardGame.name.contains(q.strip(), autoescape=True))
        def render(row):
            return {**c.inventory_detail(db, row, actor),
                    'game': columns(get(db, BoardGame, row.game_id), ['id', 'name', 'original_name', 'cover_url'])}
    else:
        stmt = stmt.where(cls.is_visible.is_(True))
        if kind == 'games' and actor.role != 'admin':
            stmt = stmt.where(BoardGame.created_by == actor.id)
        if q.strip():
            name_column = Person.display_name if kind == 'people' else cls.name
            if kind == 'people':
                stmt = stmt.outerjoin(User, User.id == Person.user_id).where(or_(
                    name_column.contains(q.strip(), autoescape=True), User.nickname.contains(q.strip(), autoescape=True)))
            else:
                stmt = stmt.where(name_column.contains(q.strip(), autoescape=True))
        render = (lambda row: c.game_detail(db, row, actor)) if kind == 'games' else (
            (lambda row: c.person_detail(db, row, actor)) if kind == 'people' else
            (lambda row: {**columns(row, ['id', 'name', 'revision', 'archived_at']), 'permissions': {'can_edit': True}}))
    return page(db, stmt, cls.id, render, limit, cursor,
                dict(kind=kind, archived=archived, q=q, game_id=game_id, actor=actor.id))


def created(db, actor, request, response, payload, operation, fn, cls, render):
    ids, replayed = create_once(db, actor, operation, request.headers.get('Idempotency-Key'),
        payload.model_dump(mode='json'), fn, cls.__table__.name[:32])
    if replayed:
        response.headers['Idempotency-Replayed'] = 'true'
    return [render(get(db, cls, identity)) for identity in ids]


@router.get('/boardgames')
def games(request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    from app.services import boardgame_collection as collection
    q = collection.parse_game_query(request)
    stmt = select(BoardGame).options(load_only(*(getattr(BoardGame, k) for k in c.GAME_PUBLIC), BoardGame.created_at)).where(
        *collection.game_predicates(db, actor, q))
    order = {'recent': BoardGame.created_at, 'manual': BoardGame.sort_order, 'name': BoardGame.name}[q.sort]
    result = page(db, stmt, BoardGame.id, lambda g: columns(g, c.GAME_PUBLIC), q.limit, q.cursor,
        dict(filters=q.model_dump(mode='json', exclude={'limit', 'cursor'}), actor=actor.id),
        order_column=order, descending=q.sort == 'recent')
    summaries = {g['id']: {'total': 0, 'by_status': {}, 'activity_available': 0} for g in result['items']}
    for gid, status, count in db.execute(select(Inventory.game_id, Inventory.status, func.count()).where(
        Inventory.game_id.in_(summaries), Inventory.archived_at.is_(None)).group_by(Inventory.game_id, Inventory.status)):
        summaries[gid]['total'] += count
        summaries[gid]['by_status'][status] = count
    for gid, count in db.execute(select(Inventory.game_id, func.count()).where(Inventory.game_id.in_(summaries),
        Inventory.archived_at.is_(None), Inventory.status == 'available', Inventory.available_for_activity.is_(True)).group_by(Inventory.game_id)):
        summaries[gid]['activity_available'] = count
    tags = {}
    for gid, tag in db.execute(select(GameTagLink.game_id, GameTag).join(GameTag, GameTag.id == GameTagLink.tag_id).where(
            GameTagLink.game_id.in_(summaries), GameTag.user_id == actor.id, GameTag.is_active.is_(True)).order_by(GameTag.id)):
        tags.setdefault(gid, [])
        if len(tags[gid]) < 4:
            tags[gid].append(columns(tag, ['id', 'name']))
    for g in result['items']:
        g['inventory_summary'] = summaries[g['id']]
        g['my_tags'] = tags.get(g['id'], [])
    return result


@router.post('/boardgames', status_code=201)
def new_game(payload: s.GameCreate, request: Request, response: Response, db: Session = Depends(write_db),
             actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'game:create', lambda: c.create_game(db, actor, payload).id,
                   BoardGame, lambda g: c.game_detail(db, c.game(db, g.id, actor), actor))[0]


@router.get('/boardgames/{game_id}')
def game_detail(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.game_detail(db, c.game(db, game_id, actor), actor)


@router.patch('/boardgames/{game_id}')
def game_patch(game_id: int, payload: s.GamePatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return c.game_detail(db, c.patch_game(db, c.game(db, game_id, actor, lock=True), actor, payload), actor)


@router.get('/boardgames/{game_id}/source')
def game_source(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    admin(actor)
    return columns(c.game(db, game_id, actor), ['bgg_payload', 'bgg_raw_xml', 'bgg_request_params', 'bgg_synced_at', 'bgg_parser_version'])


@router.put('/boardgames/{game_id}/bgg-binding')
def game_binding(game_id: int, payload: s.Binding, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    g = c.game(db, game_id, actor, lock=True)
    check_revision(g, payload.expected_revision)
    if payload.bgg_id:
        other = db.scalar(select(BoardGame).where(BoardGame.bgg_id == payload.bgg_id, BoardGame.id != g.id))
        if other:
            fail('bgg_already_bound', 409, canonical_id=other.id)
        item = db.scalar(select(ImportItem).where(ImportItem.source_kind == 'thing', ImportItem.bgg_id == payload.bgg_id)
                         .order_by(ImportItem.id.desc()).limit(1))
        if not item:
            fail('standard_thing_required')
        g.bgg_payload, g.bgg_raw_xml, g.bgg_content_hash = item.payload, item.raw_xml, item.content_hash
    else:
        g.local_overrides = safe({k: getattr(g, k) for k in s.GameFields.model_fields})
    g.bgg_id = payload.bgg_id
    c.project_game(g)
    touch(g, actor)
    audit(db, g, actor, 'bgg_binding', reason=payload.reason)
    db.flush()
    return c.game_detail(db, g, actor)


@router.post('/boardgames/{game_id}/archive')
@router.post('/boardgames/{game_id}/restore')
def game_action(game_id: int, payload: s.Revision, request: Request,
                db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    g = c.game(db, game_id, actor, lock=True)
    return c.game_detail(db, c.archive(db, g, actor, payload, request.url.path.endswith('/restore')), actor)


@router.get('/boardgames/{game_id}/expansions')
def expansions(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    c.game(db, game_id, actor)
    rows = list(db.scalars(select(ExpansionLink).where(ExpansionLink.base_game_id == game_id)))
    return {'items': [dict(**columns(r), game=c.game_detail(db, c.game(db, r.expansion_game_id, actor), actor, False)) for r in rows]}


@router.put('/boardgames/{game_id}/expansions/{expansion_id}')
def expansion_link(game_id: int, expansion_id: int, payload: s.Compatibility, db: Session = Depends(write_db),
                   actor: User = Depends(get_current_user)):
    admin(actor)
    base, exp = c.game(db, game_id, actor, usable=True, lock=True), c.game(db, expansion_id, actor, usable=True, lock=True)
    if base.id == exp.id or exp.game_type != 'expansion' or (base.game_type == 'expansion' and not base.is_standalone):
        fail('invalid_expansion')
    # A base that is also standalone may not introduce a compatibility cycle.
    todo, seen = [exp.id], set()
    while todo:
        current = todo.pop()
        if current == base.id:
            fail('expansion_cycle')
        if current in seen:
            continue
        seen.add(current)
        todo.extend(db.scalars(select(ExpansionLink.expansion_game_id).where(ExpansionLink.base_game_id == current,
            ExpansionLink.manual_decision != 'block')))
    row = db.get(ExpansionLink, (game_id, expansion_id))
    check_revision(row, payload.expected_revision)
    if not row:
        row = ExpansionLink(base_game_id=game_id, expansion_game_id=expansion_id, bgg_suggested=False,
                             revision=1, updated_by=actor.id, updated_at=now())
        db.add(row)
    else:
        touch(row, actor)
    row.manual_decision, row.note = payload.manual_decision, payload.note
    audit(db, row, actor, 'compatibility')
    db.flush()
    return columns(row)


@router.get('/boardgame-inventory')
def inventories(game_id: int | None = None, owner_scope: Literal['all', 'mine'] = 'all',
                status: str | None = None, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    stmt = select(Inventory).options(defer(Inventory.source_snapshot)).join(BoardGame, BoardGame.id == Inventory.game_id).where(
        Inventory.archived_at.is_(None), BoardGame.is_visible.is_(True))
    if game_id:
        stmt = stmt.where(Inventory.game_id == game_id)
    if owner_scope == 'mine':
        stmt = stmt.where(Inventory.owner_user_id == actor.id)
    if status:
        stmt = stmt.where(Inventory.status == status)
    return page(db, stmt, Inventory.id, lambda b: c.inventory_detail(db, b, actor), limit, cursor,
                dict(game_id=game_id, scope=owner_scope, status=status, actor=actor.id), order_column=Inventory.sort_order)


@router.post('/boardgame-inventory', status_code=201)
def inventory_create(payload: s.InventoryCreate, request: Request, response: Response,
                     db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    rows = created(db, actor, request, response, payload, 'inventory:create',
        lambda: [b.id for b in c.create_inventory(db, actor, payload)], Inventory, lambda b: c.inventory_detail(db, b, actor))
    return {'items': rows}


@router.get('/boardgame-inventory/{inventory_id}')
def inventory_detail(inventory_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    box = get(db, Inventory, inventory_id)
    c.game(db, box.game_id, actor)
    return c.inventory_detail(db, box, actor)


@router.patch('/boardgame-inventory/{inventory_id}')
def inventory_patch(inventory_id: int, payload: s.InventoryPatch, db: Session = Depends(write_db),
                    actor: User = Depends(get_current_user)):
    return c.inventory_detail(db, c.patch_inventory(db, get(db, Inventory, inventory_id, True), actor, payload), actor)


@router.get('/boardgame-inventory/{inventory_id}/source')
def inventory_source(inventory_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    box = get(db, Inventory, inventory_id)
    if not c.inventory_private(box, actor):
        fail('own_inventory_only', 403)
    return {'snapshot': box.source_snapshot, 'sources': [columns(r, ['provider', 'source_namespace', 'source_id', 'copy_index',
        'content_hash']) for r in db.scalars(select(InventorySource).where(InventorySource.inventory_id == box.id))]}


@router.get('/boardgame-inventory/{inventory_id}/game-correction-preview')
def inventory_correction_preview(inventory_id: int, target_game_id: int, db: Session = Depends(get_db),
                                 actor: User = Depends(get_current_user)):
    return c.correction_preview(db, get(db, Inventory, inventory_id), target_game_id, actor)


@router.post('/boardgame-inventory/{inventory_id}/game-correction')
def inventory_correction(inventory_id: int, payload: s.InventoryCorrection, db: Session = Depends(write_db),
                         actor: User = Depends(get_current_user)):
    return c.inventory_detail(db, c.correct_inventory(db, get(db, Inventory, inventory_id, True), actor, payload), actor)


@router.post('/boardgame-inventory/{inventory_id}/archive')
@router.post('/boardgame-inventory/{inventory_id}/restore')
def inventory_action(inventory_id: int, payload: s.Revision, request: Request,
                     db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return c.inventory_detail(db, c.archive(db, get(db, Inventory, inventory_id, True), actor, payload, request.url.path.endswith('/restore')), actor)


@router.get('/boardgame-members')
def members(q: str = Query('', max_length=64), activity_id: int | None = None, limit: int = Query(20, ge=1, le=100),
            cursor: str | None = None,
            db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    stmt = select(User).where(User.role.in_(['user', 'admin']))
    if q:
        stmt = stmt.where(User.nickname.contains(q, autoescape=True))
    checked = {}
    if activity_id:
        a.activity(db, activity_id, False)
        participants = list(db.scalars(select(ActivityParticipant).where(ActivityParticipant.activity_id == activity_id)))
        checked = {p.user_id: p.checked_in_at is not None for p in participants}
        stmt = stmt.where(User.id.in_(checked))
    return page(db, stmt, User.id, lambda u: {**columns(u, ['id', 'nickname', 'avatar_url']), 'user_id': u.id,
        **({'checked_in': checked[u.id]} if activity_id else {})}, limit, cursor, {'q': q, 'activity': activity_id})


@router.get('/boardgame-people')
def people(q: str = Query('', max_length=64), registered_only: bool = False, limit: int = Query(20, ge=1, le=100),
           cursor: str | None = None, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    stmt = select(Person).where(Person.is_visible.is_(True), Person.archived_at.is_(None))
    if q:
        stmt = stmt.outerjoin(User, User.id == Person.user_id).where(or_(Person.display_name.contains(q, autoescape=True),
                                                                        User.nickname.contains(q, autoescape=True)))
    if registered_only:
        stmt = stmt.where(Person.user_id.is_not(None))
    return page(db, stmt, Person.id, lambda p: c.person_detail(db, p, actor), limit, cursor, dict(q=q, registered=registered_only))


@router.post('/boardgame-people', status_code=201)
def person_create(payload: s.PersonCreate, request: Request, response: Response,
                  db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'person:create', lambda: c.new_person(db, actor, payload.display_name).id,
                   Person, lambda p: c.person_detail(db, p, actor))[0]


@router.get('/boardgame-people/{person_id}')
def person_get(person_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return c.person_detail(db, get(db, Person, person_id), actor)


@router.patch('/boardgame-people/{person_id}')
def person_patch(person_id: int, payload: s.PersonPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    p = get(db, Person, person_id, True)
    c.person_detail(db, p, actor)
    check_revision(p, payload.expected_revision)
    if p.user_id:
        fail('bound_name_uses_profile')
    p.display_name = payload.display_name
    touch(p, actor)
    audit(db, p, actor, 'rename', reason=payload.reason)
    return c.person_detail(db, p, actor)


@router.post('/boardgame-people/{person_id}/account-binding')
def account_binding(person_id: int, payload: s.AccountBinding, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    p = get(db, Person, person_id, True)
    c.person_detail(db, p, actor)
    check_revision(p, payload.expected_revision)
    if payload.user_id:
        get(db, User, payload.user_id, True)
        other = db.scalar(select(Person).where(Person.user_id == payload.user_id, Person.id != p.id))
        if other:
            fail('account_already_bound', 409, person_id=other.id)
    p.user_id = payload.user_id
    touch(p, actor)
    audit(db, p, actor, 'account_binding', reason=payload.reason)
    db.flush()
    return c.person_detail(db, p, actor)


@router.get('/boardgame-locations')
def locations(q: str = Query('', max_length=255), limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
              db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    stmt = select(Location).where(Location.is_visible.is_(True), Location.archived_at.is_(None))
    if q:
        stmt = stmt.where(Location.name.contains(q, autoescape=True))
    return page(db, stmt, Location.id, lambda p: columns(p, ['id', 'name', 'revision', 'archived_at']), limit, cursor, {'q': q})


@router.post('/boardgame-locations', status_code=201)
def location_create(payload: s.LocationCreate, request: Request, response: Response,
                    db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, 'location:create', lambda: c.new_location(db, actor, payload.name).id,
                   Location, lambda p: columns(p, ['id', 'name', 'revision', 'archived_at']))[0]


@router.patch('/boardgame-locations/{location_id}')
def location_patch(location_id: int, payload: s.LocationPatch, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    obj = get(db, Location, location_id, True)
    if not obj.is_visible:
        fail('not_found', 404)
    check_revision(obj, payload.expected_revision)
    obj.name = payload.name
    touch(obj, actor)
    audit(db, obj, actor, 'rename', reason=payload.reason)
    return columns(obj, ['id', 'name', 'revision', 'archived_at'])


@router.post('/boardgame-locations/{identity}/archive')
@router.post('/boardgame-locations/{identity}/restore')
@router.post('/boardgame-people/{identity}/archive')
@router.post('/boardgame-people/{identity}/restore')
def identity_action(identity: int, payload: s.Revision, request: Request,
                    db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    cls = Person if '/boardgame-people/' in request.url.path else Location
    obj = get(db, cls, identity, True)
    if not obj.is_visible:
        fail('not_found', 404)
    c.archive(db, obj, actor, payload, request.url.path.endswith('/restore'))
    return c.person_detail(db, obj, actor) if cls is Person else columns(obj, ['id', 'name', 'revision', 'archived_at'])


@router.get('/boardgames/{identity}/merge-preview')
@router.get('/boardgame-people/{identity}/merge-preview')
def merge_preview(identity: int, target_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    cls = Person if '/boardgame-people/' in request.url.path else BoardGame
    return c.merge_preview(db, cls, identity, target_id, actor)


@router.post('/boardgames/{identity}/merge')
@router.post('/boardgame-people/{identity}/merge')
def merge(identity: int, payload: s.Merge, request: Request, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    cls = Person if '/boardgame-people/' in request.url.path else BoardGame
    obj = c.merge(db, cls, identity, actor, payload)
    return c.person_detail(db, obj, actor) if cls is Person else c.game_detail(db, obj, actor)


@router.get('/boardgames/{game_id}/rulesets')
def rulesets(game_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    c.game(db, game_id, actor)
    return {'items': [columns(r, ['id', 'name', 'configuration', 'revision']) for r in db.scalars(
        select(Ruleset).where(Ruleset.game_id == game_id, Ruleset.archived_at.is_(None)).order_by(Ruleset.id))]}


@router.post('/boardgames/{game_id}/rulesets', status_code=201)
def ruleset_create(game_id: int, payload: s.RulesetCreate, request: Request, response: Response,
                   db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    return created(db, actor, request, response, payload, f'ruleset:{game_id}',
        lambda: c.create_ruleset(db, actor, game_id, payload).id, Ruleset,
        lambda r: columns(r, ['id', 'name', 'configuration', 'revision']))[0]


@router.get('/activities/{activity_id}/boardgames')
def activity_boardgames(activity_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    result = a.activity_summary(db, a.activity(db, activity_id), actor)
    db.commit()
    return result


@router.put('/activities/{activity_id}/nominations/{game_id}/me')
def nominate(activity_id: int, game_id: int, payload: s.NominationInput, db: Session = Depends(write_db),
             actor: User = Depends(get_current_user)):
    obj = a.activity(db, activity_id)
    row = a.nominate(db, obj, game_id, actor, payload)
    return {**a.nomination_detail(db, row), 'group_summary': a.activity_summary(db, obj, actor)['nominations']}


@router.delete('/activities/{activity_id}/nominations/{game_id}/me', status_code=204)
def withdraw(activity_id: int, game_id: int, expected_revision: int = Query(ge=1),
             db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    a.nominate(db, a.activity(db, activity_id), game_id, actor, s.Revision(expected_revision=expected_revision), True)
    return Response(status_code=204)


@router.get('/activities/{activity_id}/nominations/{game_id}/people')
def nomination_people(activity_id: int, game_id: int, limit: int = Query(20, ge=1, le=100), cursor: str | None = None,
                      db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    member(actor)
    a.sync_nominations(db, a.activity(db, activity_id))
    result = page(db, select(Nomination).where(Nomination.activity_id == activity_id, Nomination.game_id == game_id,
        Nomination.state.in_(['active', 'frozen'])), Nomination.id,
        lambda n: dict(user=user_summary(db, n.user_id), **a.nomination_detail(db, n)), limit, cursor,
        dict(activity_id=activity_id, game_id=game_id))
    db.commit()
    return result


@router.post('/activities/{activity_id}/nominations/{nomination_id}/remove')
def remove_nomination(activity_id: int, nomination_id: int, payload: s.RequiredReason,
                      db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    admin(actor)
    a.activity(db, activity_id)
    row = get(db, Nomination, nomination_id, True)
    if row.activity_id != activity_id:
        fail('not_found', 404)
    check_revision(row, payload.expected_revision)
    row.state = 'removed'
    touch(row, actor)
    audit(db, row, actor, 'remove', reason=payload.reason)
    return a.nomination_detail(db, row)


@router.post('/activities/{activity_id}/game-plans', status_code=201)
def new_plan(activity_id: int, payload: s.PlanCreate, request: Request, response: Response,
             db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = a.activity(db, activity_id)
    return created(db, actor, request, response, payload, f'plan:{activity_id}',
        lambda: a.save_plan(db, obj, actor, payload).id, GamePlan, lambda p: a.plan_detail(db, p, actor))[0]


@router.patch('/activities/{activity_id}/game-plans/{plan_id}')
def patch_plan(activity_id: int, plan_id: int, payload: s.PlanPatch, db: Session = Depends(write_db),
               actor: User = Depends(get_current_user)):
    obj = a.activity(db, activity_id)
    return a.plan_detail(db, a.save_plan(db, obj, actor, payload, get(db, GamePlan, plan_id, True)), actor)


@router.delete('/activities/{activity_id}/game-plans/{plan_id}', status_code=204)
def delete_plan(activity_id: int, plan_id: int, expected_revision: int = Query(ge=1),
                db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    a.delete_plan(db, a.activity(db, activity_id), get(db, GamePlan, plan_id, True), actor, expected_revision)
    return Response(status_code=204)


@router.put('/activities/{activity_id}/game-plan-order')
def plan_order(activity_id: int, payload: s.PlanOrder, db: Session = Depends(write_db), actor: User = Depends(get_current_user)):
    obj = a.activity(db, activity_id)
    a.require_plan(obj, actor)
    rows = {r.id: r for r in db.scalars(select(GamePlan).where(GamePlan.activity_id == obj.id).with_for_update())}
    unique([p.id for p in payload.items])
    if set(rows) != {p.id for p in payload.items}:
        fail('plan_set_changed', 409)
    for entry in payload.items:
        row = rows[entry.id]
        check_revision(row, entry.expected_revision)
        row.sort_order = entry.sort_order
        touch(row, actor)
        audit(db, row, actor, 'reorder')
    db.flush()
    return {'items': [a.plan_detail(db, r, actor) for r in sorted(rows.values(), key=lambda r: (r.sort_order, r.id))]}


# Static action paths must win over /{id}/{action} dispatchers.
router.routes.sort(key=lambda r: sum('{' in part for part in r.path.split('/')))

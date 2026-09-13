"""Private preferences and collection selection, independent of activity nominations."""

from pydantic import ValidationError
from sqlalchemy import and_, delete, func, or_, select

from app.models.boardgame import (BoardGame, GamePreference, PriorPlay, GameTag, GameTagLink, PlayTagLink,
                                 SavedFilter, Inventory, Person, Play, PlayPlayer, AuditEvent)
from app.schemas.boardgame_collection import GameQuery
from app.services import boardgame_catalog as catalog
from app.services.boardgame_common import audit, check_revision, columns, digest, fail, get, member, now, stamp, touch, unique


def parse_game_query(request):
    lists = {'tag_ids', 'exclude_tag_ids', 'exclude_game_ids'}
    values = {}
    for key in request.query_params:
        entries = request.query_params.getlist(key)
        if key in lists:
            values[key] = entries
        elif len(entries) == 1:
            values[key] = entries[0]
        else:
            fail('duplicate_query_parameter')
    try:
        return GameQuery.model_validate(values)
    except ValidationError:
        fail('invalid_game_filters')


def owned_ids(actor):
    return select(Inventory.game_id).where(Inventory.owner_user_id == actor.id,
        Inventory.archived_at.is_(None), Inventory.status != 'retired')


def logged_games(actor):
    return select(Play.game_id).join(PlayPlayer, PlayPlayer.play_id == Play.id).join(Person, Person.id == PlayPlayer.person_id).where(
        Person.user_id == actor.id, Play.publication_status == 'published', Play.status == 'completed', Play.stats_exclusion != 'all')


def prior_games(actor):
    return select(PriorPlay.game_id).where(PriorPlay.user_id == actor.id, PriorPlay.played_before.is_(True))


def tag_ids_owned(db, actor, ids, active=False):
    unique(ids, 'duplicate_tag')
    found = list(db.scalars(select(GameTag.id).where(GameTag.user_id == actor.id, GameTag.id.in_(ids),
        GameTag.is_active.is_(True) if active else True)))
    if set(found) != set(ids):
        fail('unknown_personal_tag', 404)


def game_predicates(db, actor, q):
    conditions = [BoardGame.is_visible.is_(True), BoardGame.archived_at.is_(None), BoardGame.merged_into_id.is_(None)]
    for lower, upper in ((q.min_rating, q.max_rating), (q.min_complexity, q.max_complexity), (q.purchased_from, q.purchased_to)):
        if lower is not None and upper is not None and lower > upper:
            fail('invalid_filter_range')
    if q.inventory_scope == 'mine' and q.owned is False:
        fail('conflicting_owned_filter')
    if q.q:
        conditions.append(BoardGame.search_text.contains(q.q.casefold(), autoescape=True))
    if q.game_type:
        conditions.append(BoardGame.game_type == q.game_type)
    if q.owned is not None or q.inventory_scope == 'mine':
        has = BoardGame.id.in_(owned_ids(actor))
        conditions.append(has if q.owned is not False else ~has)
    if q.played is not None:
        has = or_(BoardGame.id.in_(logged_games(actor)), BoardGame.id.in_(prior_games(actor)))
        conditions.append(has if q.played else ~has)
    if q.available_for_activity is not None:
        boxes = select(Inventory.game_id).where(Inventory.archived_at.is_(None), Inventory.status == 'available', Inventory.available_for_activity.is_(True))
        has = BoardGame.id.in_(boxes)
        conditions.append(has if q.available_for_activity else ~has)
    for key in ('wishlist', 'preordered', 'want_to_play'):
        value = getattr(q, key)
        if value is not None:
            has = BoardGame.id.in_(select(GamePreference.game_id).where(GamePreference.user_id == actor.id, getattr(GamePreference, key).is_(True)))
            conditions.append(has if value else ~has)
    if q.min_rating is not None or q.max_rating is not None:
        ratings = select(GamePreference.game_id).where(GamePreference.user_id == actor.id, GamePreference.rating.is_not(None))
        if q.min_rating is not None:
            ratings = ratings.where(GamePreference.rating >= q.min_rating)
        if q.max_rating is not None:
            ratings = ratings.where(GamePreference.rating <= q.max_rating)
        conditions.append(BoardGame.id.in_(ratings))
    if q.player_count:
        conditions.extend([BoardGame.min_players <= q.player_count, BoardGame.max_players >= q.player_count])
    if q.max_minutes:
        conditions.append(BoardGame.max_playtime_minutes <= q.max_minutes)
    if q.min_complexity is not None:
        conditions.append(BoardGame.complexity >= q.min_complexity)
    if q.max_complexity is not None:
        conditions.append(BoardGame.complexity <= q.max_complexity)
    if q.purchased_from or q.purchased_to:
        boxes = select(Inventory.game_id).where(Inventory.owner_user_id == actor.id, Inventory.archived_at.is_(None))
        if q.purchased_from:
            boxes = boxes.where(Inventory.purchased_on >= q.purchased_from)
        if q.purchased_to:
            boxes = boxes.where(Inventory.purchased_on <= q.purchased_to)
        conditions.append(BoardGame.id.in_(boxes))
    tag_ids_owned(db, actor, q.tag_ids + q.exclude_tag_ids)
    if q.tag_ids:
        tagged = select(GameTagLink.game_id).where(GameTagLink.tag_id.in_(q.tag_ids))
        if q.tag_match == 'all':
            tagged = tagged.group_by(GameTagLink.game_id).having(func.count() == len(q.tag_ids))
        conditions.append(BoardGame.id.in_(tagged))
    if q.exclude_tag_ids:
        conditions.append(~BoardGame.id.in_(select(GameTagLink.game_id).where(GameTagLink.tag_id.in_(q.exclude_tag_ids))))
    if q.exclude_game_ids:
        conditions.append(~BoardGame.id.in_(q.exclude_game_ids))
    return conditions


def preference(db, actor, game_id):
    catalog.game(db, game_id, actor)
    obj = db.scalar(select(GamePreference).where(GamePreference.user_id == actor.id, GamePreference.game_id == game_id))
    return columns(obj, ['game_id','rating','wishlist','preordered','want_to_play','note','revision']) if obj else dict(
        game_id=game_id, rating=None, wishlist=False, preordered=False, want_to_play=False, note=None, revision=0)


def put_preference(db, actor, game_id, payload):
    member(actor)
    catalog.game(db, game_id, actor)
    obj = db.scalar(select(GamePreference).where(GamePreference.user_id == actor.id, GamePreference.game_id == game_id).with_for_update())
    check_revision(obj, payload.expected_revision)
    before = preference(db, actor, game_id)
    if obj:
        touch(obj, actor)
    else:
        obj = GamePreference(**stamp(actor, user_id=actor.id, game_id=game_id))
    for key, value in payload.model_dump(exclude={'expected_revision'}).items():
        setattr(obj, key, value)
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'save_preference', before, after=preference(db, actor, game_id))
    return obj


def prior(db, actor, game_id):
    catalog.game(db, game_id, actor)
    obj = db.scalar(select(PriorPlay).where(PriorPlay.user_id == actor.id, PriorPlay.game_id == game_id))
    return columns(obj, ['game_id','played_before','approximate_count','note','revision']) if obj else dict(
        game_id=game_id, played_before=False, approximate_count=None, note=None, revision=0)


def put_prior(db, actor, game_id, payload):
    member(actor)
    catalog.game(db, game_id, actor)
    obj = db.scalar(select(PriorPlay).where(PriorPlay.user_id == actor.id, PriorPlay.game_id == game_id).with_for_update())
    check_revision(obj, payload.expected_revision)
    before = prior(db, actor, game_id)
    if obj:
        touch(obj, actor)
    else:
        obj = PriorPlay(**stamp(actor, user_id=actor.id, game_id=game_id))
    obj.played_before, obj.note = payload.played_before, payload.note
    obj.approximate_count = payload.approximate_count if payload.played_before else None
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'save_prior_plays', before, after=prior(db, actor, game_id))
    return obj


def collection_summary(db, actor):
    owned = set(db.scalars(owned_ids(actor)))
    logged = set(db.scalars(logged_games(actor)))
    previous = set(db.scalars(prior_games(actor)))
    played = logged | previous
    approximate = db.scalar(select(func.sum(PriorPlay.approximate_count)).where(
        PriorPlay.user_id == actor.id, PriorPlay.played_before.is_(True)))
    return dict(owned_game_count=len(owned), owned_played_game_count=len(owned & played),
        owned_unplayed_game_count=len(owned - played), played_not_owned_game_count=len(played - owned),
        coverage=len(owned & played)/len(owned) if owned else None, previous_marked_game_count=len(previous),
        exact_logged_game_count=len(logged), approximate_previous_play_count=int(approximate) if approximate is not None else None,
        drilldowns={'owned_unplayed': {'path': '/boardgames', 'query': {'owned': True, 'played': False}},
                    'played_not_owned': {'path': '/boardgames', 'query': {'owned': False, 'played': True}}},
        scope='mine', period='all', previous_plays_in_time_statistics=False)


def tag(db, actor, identity):
    obj = get(db, GameTag, identity)
    if obj.user_id != actor.id:
        fail('not_found', 404)
    return obj


def create_tag(db, actor, payload):
    member(actor)
    normalized = payload.name.casefold()
    if db.scalar(select(GameTag.id).where(GameTag.user_id == actor.id, func.lower(GameTag.name) == normalized)):
        fail('tag_name_exists', 409)
    obj = GameTag(**stamp(actor, user_id=actor.id, name=normalized, is_active=True))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create_tag', after=columns(obj))
    return obj


def tag_links(db, actor, kind, identity):
    if kind == 'games':
        catalog.game(db, identity, actor)
        cls, field = GameTagLink, GameTagLink.game_id
    else:
        from app.services.boardgame_play import play
        play(db, identity, actor)
        cls, field = PlayTagLink, PlayTagLink.play_id
    found = list(db.scalars(select(GameTag).join(cls, cls.tag_id == GameTag.id).where(field == identity, GameTag.user_id == actor.id).order_by(GameTag.id)))
    items = [columns(t, ['id','name','is_active','revision']) for t in found]
    return {'items': items, 'revision_hash': digest({'actor': actor.id, 'kind': kind, 'id': identity, 'tags': [t.id for t in found]})}


def set_tags(db, actor, kind, identity, payload):
    member(actor)
    before = tag_links(db, actor, kind, identity)
    if before['revision_hash'] != payload.expected_hash:
        fail('tag_links_changed', 409, current_hash=before['revision_hash'])
    tag_ids_owned(db, actor, payload.tag_ids, active=True)
    cls, key = (GameTagLink, 'game_id') if kind == 'games' else (PlayTagLink, 'play_id')
    db.execute(delete(cls).where(getattr(cls, key) == identity, cls.tag_id.in_(select(GameTag.id).where(GameTag.user_id == actor.id))))
    for tag_id in payload.tag_ids:
        db.add(cls(**{key: identity, 'tag_id': tag_id}))
    db.flush()
    result = tag_links(db, actor, kind, identity)
    db.add(AuditEvent(entity_type='personal_tags', entity_id=f'{actor.id}:{kind}:{identity}',
        entity_revision=1, action='set_tags', actor_user_id=actor.id, before_data=before,
        after_data=result, created_at=now()))
    return result


def validated_saved_query(db, actor, target, data):
    from app.schemas.boardgame_stats import PlayQuery
    model = GameQuery if target == 'games' else PlayQuery
    try:
        query = model.model_validate(data)
    except ValidationError:
        fail('invalid_saved_filter')
    if query.cursor or target == 'statistics' and (query.status or query.recorded_by):
        fail('saved_filter_cannot_store_cursor_or_fixed_status')
    if target == 'games':
        game_predicates(db, actor, query)
    else:
        from app.services.boardgame_statistics import predicates
        predicates(db, query, actor, public_list=target == 'plays')
    return query.model_dump(mode='json', by_alias=True, exclude_defaults=True, exclude={'cursor', 'limit'})


def saved_filter(db, actor, identity):
    obj = get(db, SavedFilter, identity, True)
    if obj.user_id != actor.id:
        fail('not_found', 404)
    return obj


def create_saved_filter(db, actor, payload):
    member(actor)
    obj = SavedFilter(**stamp(actor, user_id=actor.id, name=payload.name, target=payload.target,
                             query=validated_saved_query(db, actor, payload.target, payload.query)))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create_saved_filter', after=columns(obj))
    return obj


def patch_tag(db, actor, identity, payload):
    member(actor)
    obj = tag(db, actor, identity)
    check_revision(obj, payload.expected_revision)
    before = columns(obj)
    if 'name' in payload.model_fields_set:
        if payload.name is None:
            fail('tag_name_required')
        obj.name = payload.name.casefold()
    if 'is_active' in payload.model_fields_set:
        if payload.is_active is None:
            fail('tag_status_required')
        obj.is_active = payload.is_active
    touch(obj, actor)
    db.flush()
    audit(db, obj, actor, 'edit_tag', before, after=columns(obj))
    return obj


def patch_saved_filter(db, actor, identity, payload):
    member(actor)
    obj = saved_filter(db, actor, identity)
    check_revision(obj, payload.expected_revision)
    before = columns(obj)
    if 'name' in payload.model_fields_set:
        if payload.name is None:
            fail('filter_name_required')
        obj.name = payload.name
    if 'query' in payload.model_fields_set:
        if payload.query is None:
            fail('filter_query_required')
        obj.query = validated_saved_query(db, actor, obj.target, payload.query)
    touch(obj, actor)
    db.flush()
    audit(db, obj, actor, 'edit_saved_filter', before, after=columns(obj))
    return obj

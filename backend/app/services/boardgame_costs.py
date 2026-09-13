"""Cost amortization of explicitly used personal copies, never inferred from game names."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import Field, ValidationError
from sqlalchemy import Integer, cast, func, select

from app.models.boardgame import Inventory, Play, PlayExpansion, PlayPlayer
from app.schemas.boardgame import Id, Strict
from app.services.boardgame_common import columns, fail, safe
from app.services.boardgame_statistics import date_range


class CostQuery(Strict):
    period: Literal['all', 'month', 'quarter', 'year', 'custom'] = 'all'
    year: int | None = Field(None, ge=1, le=9998)
    month: int | None = Field(None, ge=1, le=12)
    quarter: int | None = Field(None, ge=1, le=4)
    from_date: date | None = Field(None, alias='from')
    to_date: date | None = Field(None, alias='to')
    game_id: Id | None = None
    inventory_id: Id | None = None
    limit: int = Field(20, ge=1, le=100)
    cursor: str | None = Field(None, max_length=4096)


def parse_query(request):
    if any(len(request.query_params.getlist(k)) != 1 for k in request.query_params):
        fail('duplicate_query_parameter')
    try:
        return CostQuery.model_validate(dict(request.query_params))
    except ValidationError:
        fail('invalid_cost_filters')


def amount(value):
    return format(Decimal(str(value)).quantize(Decimal('0.000001')), 'f') if value is not None else None


def metrics(price, row):
    data = {key: int(row[key] or 0) for key in ('play_count', 'timed_play_count', 'minutes', 'human_appearances', 'human_minutes')}
    data['missing_duration_count'] = data['play_count'] - data['timed_play_count']
    for key, count, multiplier in (('cost_per_play', 'play_count', 1), ('cost_per_hour', 'minutes', 60),
                                   ('cost_per_person', 'human_appearances', 1), ('cost_per_person_hour', 'human_minutes', 60)):
        data[key] = amount(Decimal(price) * multiplier / data[count]) if price is not None and data[count] else None
    return data


def aggregates(events):
    return [func.count().label('play_count'), func.count(events.c.duration_minutes).label('timed_play_count'),
            cast(func.sum(events.c.duration_minutes), Integer).label('minutes'),
            cast(func.sum(events.c.humans), Integer).label('human_appearances'),
            cast(func.sum(events.c.humans * events.c.duration_minutes), Integer).label('human_minutes')]


def cost_stats(db, actor, q):
    start, end = date_range(q)
    # Include retained/retired copies: retirement does not erase purchase history.
    filters = [Inventory.owner_user_id == actor.id]
    if q.game_id:
        filters.append(Inventory.game_id == q.game_id)
    if q.inventory_id:
        filters.append(Inventory.id == q.inventory_id)
        if not db.scalar(select(Inventory.id).where(*filters)):
            fail('not_found', 404)
    boxes = select(Inventory.id, Inventory.game_id, Inventory.purchase_price, Inventory.purchase_currency).where(*filters).subquery()
    links = select(Play.id.label('play_id'), Play.inventory_id.label('inventory_id')).where(Play.inventory_id.is_not(None)).union(
        select(PlayExpansion.play_id, PlayExpansion.inventory_id).where(PlayExpansion.inventory_id.is_not(None))).subquery()
    humans = select(func.count()).select_from(PlayPlayer).where(PlayPlayer.play_id == Play.id,
        PlayPlayer.participant_kind == 'human').correlate(Play).scalar_subquery()
    event_stmt = select(links.c.inventory_id, Play.id.label('play_id'), Play.duration_minutes, humans.label('humans')).join(
        Play, Play.id == links.c.play_id).join(boxes, boxes.c.id == links.c.inventory_id).where(
        Play.publication_status == 'published', Play.status == 'completed', Play.stats_exclusion != 'all')
    if start:
        event_stmt = event_stmt.where(Play.played_on >= start, Play.played_on <= end)
    events = event_stmt.subquery()
    grouped = select(events.c.inventory_id, *aggregates(events)).group_by(events.c.inventory_id).subquery()
    rows = select(Inventory, *[grouped.c[k] for k in ('play_count', 'timed_play_count', 'minutes', 'human_appearances', 'human_minutes')]).outerjoin(
        grouped, grouped.c.inventory_id == Inventory.id).where(*filters)
    def render(row):
        obj = row[0]
        return {**columns(obj, ['id', 'game_id', 'edition_name', 'purchase_price', 'purchase_currency', 'purchased_on', 'status', 'archived_at']),
                **metrics(obj.purchase_price, row._mapping),
                'drilldown': {'path': '/boardgame-plays', 'query': {'inventory_id': obj.id, 'status': 'completed', 'eligible_only': True,
                    **q.model_dump(mode='json', by_alias=True, exclude={'inventory_id','game_id','limit','cursor'}, exclude_none=True)}}}
    total = db.scalar(select(func.count()).select_from(boxes))
    from app.services.boardgame_common import cursor_value, digest
    import base64
    import json
    signature = digest({'actor': actor.id, 'filters': q.model_dump(mode='json', exclude={'limit','cursor'})})
    if q.cursor:
        try:
            value = json.loads(base64.urlsafe_b64decode(q.cursor))
            if value['f'] != signature:
                fail('cursor_filter_mismatch')
            rows = rows.where(Inventory.id > cursor_value(value['id'], Inventory.id))
        except (TypeError, ValueError, KeyError, UnicodeError):
            fail('invalid_cursor')
    found = list(db.execute(rows.order_by(Inventory.id).limit(q.limit + 1)))
    selected = found[:q.limit]
    next_cursor = base64.urlsafe_b64encode(json.dumps({'id': selected[-1][0].id, 'f': signature}).encode()).decode() if len(found) > q.limit else None
    currency_events = select(boxes.c.purchase_currency.label('currency'), events.c.play_id, events.c.duration_minutes, events.c.humans).join(
        events, events.c.inventory_id == boxes.c.id).where(boxes.c.purchase_price.is_not(None)).distinct().subquery()
    currency_samples = {r.currency: r._mapping for r in db.execute(select(currency_events.c.currency, *aggregates(currency_events)).group_by(currency_events.c.currency))}
    currencies = []
    empty = {k: 0 for k in ('play_count','timed_play_count','minutes','human_appearances','human_minutes')}
    for currency, price, count in db.execute(select(boxes.c.purchase_currency, func.sum(boxes.c.purchase_price), func.count()).where(
            boxes.c.purchase_price.is_not(None)).group_by(boxes.c.purchase_currency)):
        currencies.append({'currency': currency, 'purchase_total': amount(price), 'priced_copy_count': count,
                           **metrics(price, currency_samples.get(currency, empty))})
    unknown = db.scalar(select(func.count()).select_from(boxes).where(boxes.c.purchase_price.is_(None)))
    return {'items': [render(r) for r in selected], 'total': total, 'next_cursor': next_cursor, 'currencies': currencies,
        'unpriced_copy_count': unknown, 'scope': 'owned_copies', 'filters': safe(q.model_dump(by_alias=True, exclude={'cursor','limit'})),
        'definition_version': '1', 'rules': {'copy_matching': 'explicit_inventory_id', 'currency_conversion': False,
            'previous_plays_included': False, 'unknown_copy_included': False, 'observers_and_automa_in_person_counts': False,
            'statistics_exclusion_all_included': False, 'price_basis': 'full_purchase_price_over_selected_period',
            'currency_denominator': 'unique_plays_using_at_least_one_priced_copy'}}

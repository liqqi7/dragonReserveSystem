"""Nomination cutoff, table plans and activity record permissions."""

from sqlalchemy import delete, func, select, update

from app.core.config import get_settings
from app.models import Activity, ActivityParticipant, User
from app.models.boardgame import (ActivityGameSettings, Nomination, NominationExpansion,
    GamePlan, PlanExpansion, Play, Inventory, BoardGame)
from app.services import boardgame_catalog as catalog
from app.services.boardgame_common import (admin, audit, check_revision, columns, fail, get,
    member, now, safe, stamp, touch, unique, user_summary)

INACTIVE = ('已取消', '已流局', '已删除')


def activity(db, identity, lock=True):
    obj = get(db, Activity, identity, lock)
    if obj.status == '已删除':
        fail('not_found', 404)
    return obj


def eligible(db, obj, actor):
    return actor.role in ('user', 'admin') and (obj.created_by == actor.id or bool(db.scalar(
        select(ActivityParticipant.id).where(ActivityParticipant.activity_id == obj.id,
                                            ActivityParticipant.user_id == actor.id))))


def can_record(db, obj, actor):
    if actor.role not in ('user', 'admin') or obj.status in INACTIVE:
        return False
    if actor.role == 'admin' or obj.created_by == actor.id:
        return True
    return bool(db.scalar(select(ActivityParticipant.id).where(ActivityParticipant.activity_id == obj.id,
                    ActivityParticipant.user_id == actor.id, ActivityParticipant.checked_in_at.is_not(None))))


def require_record(db, obj, actor):
    member(actor)
    if not can_record(db, obj, actor):
        fail('checkin_required', 403)


def require_plan(obj, actor):
    member(actor)
    if actor.role != 'admin' and obj.created_by != actor.id:
        fail('organizer_required', 403)
    if obj.status in INACTIVE:
        fail('activity_unavailable', 409)


def sync_nominations(db, obj, at=None):
    """Call before AND after eligibility/time changes, inside the activity lock."""
    at = at or now()
    state = db.get(ActivityGameSettings, obj.id)
    if state is None:
        return False
    changed = False
    rows = list(db.scalars(select(Nomination).where(Nomination.activity_id == obj.id,
                         Nomination.state.in_(['active', 'frozen'])).order_by(Nomination.id)))
    open_now = obj.start_time > at
    for row in rows:
        user = db.get(User, row.user_id)
        previous = row.state
        if open_now:
            row.state = 'active' if user and eligible(db, obj, user) else 'ineligible'
            row.frozen_at = None
        elif row.state == 'active':
            row.state = 'frozen' if user and eligible(db, obj, user) else 'ineligible'
            row.frozen_at = at if row.state == 'frozen' else None
        if previous != row.state:
            row.revision += 1
            row.updated_at = at
            audit(db, row, None, 'cutoff_state', {'state': previous}, after={'state': row.state})
            changed = True
    expected_frozen = None if open_now else (state.frozen_at or at)
    if state.cutoff_snapshot != obj.start_time or state.frozen_at != expected_frozen:
        state.cutoff_snapshot, state.frozen_at = obj.start_time, expected_frozen
        state.revision += 1
        changed = True
    db.flush()
    return changed


def before_existing_mutation(db, obj):
    if get_settings().boardgame_enabled:
        db.refresh(obj, with_for_update=True)
        return sync_nominations(db, obj)
    return False


def after_existing_mutation(db, obj):
    if get_settings().boardgame_enabled:
        db.flush()
        return sync_nominations(db, obj)
    return False


def before_role_change(db, user):
    if not get_settings().boardgame_enabled:
        return []
    ids = select(Nomination.activity_id).where(Nomination.user_id == user.id).distinct()
    rows = list(db.scalars(select(Activity).where(Activity.id.in_(ids)).order_by(Activity.id).with_for_update()))
    for obj in rows:
        sync_nominations(db, obj)
    return rows


def sync_all(db):
    ids = select(ActivityGameSettings.activity_id)
    for obj in db.scalars(select(Activity).where(Activity.id.in_(ids)).order_by(Activity.id).with_for_update()):
        sync_nominations(db, obj)


def expansion_names(db, rows):
    names = dict(db.execute(select(BoardGame.id, BoardGame.name).where(
        BoardGame.id.in_([row['game_id'] for row in rows]), BoardGame.is_visible.is_(True))).all()) if rows else {}
    for row in rows:
        row['game_name'] = names.get(row['game_id'], '扩展已不可用')
    return rows


def nomination_detail(db, row):
    result = columns(row, ['id', 'activity_id', 'game_id', 'state', 'revision', 'note', 'frozen_at'])
    result['expansions'] = [dict(game_id=e.expansion_game_id, **columns(e, ['sort_order', 'modules_note', 'compatibility_note']))
        for e in db.scalars(select(NominationExpansion).where(NominationExpansion.nomination_id == row.id).order_by(
            NominationExpansion.sort_order, NominationExpansion.expansion_game_id))]
    expansion_names(db, result['expansions'])
    return result


def nominate(db, obj, game_id, actor, payload, withdraw=False):
    member(actor)
    sync_nominations(db, obj)
    if obj.status in INACTIVE or obj.start_time <= now():
        fail('nomination_closed', 409)
    if not eligible(db, obj, actor):
        fail('signup_required', 403)
    catalog.game(db, game_id, actor, usable=True, lock=True)
    row = db.scalar(select(Nomination).where(Nomination.activity_id == obj.id,
                    Nomination.game_id == game_id, Nomination.user_id == actor.id))
    if withdraw and not row:
        return None
    check_revision(row, payload.expected_revision)
    if withdraw:
        if row.state != 'withdrawn':
            row.state = 'withdrawn'
            touch(row, actor)
            audit(db, row, actor, 'withdraw')
    else:
        catalog.validate_expansions(db, actor, game_id, payload.expansions, context='nomination')
        if row is None:
            row = Nomination(**stamp(actor, activity_id=obj.id, game_id=game_id, user_id=actor.id, state='active'))
            db.add(row)
            if db.get(ActivityGameSettings, obj.id) is None:
                db.add(ActivityGameSettings(activity_id=obj.id, revision=1, cutoff_snapshot=obj.start_time))
            db.flush()
        else:
            touch(row, actor)
        row.state, row.note, row.frozen_at = 'active', payload.note, None
        db.execute(delete(NominationExpansion).where(NominationExpansion.nomination_id == row.id))
        for e in payload.expansions:
            db.add(NominationExpansion(nomination_id=row.id, expansion_game_id=e.game_id,
                sort_order=e.sort_order, modules_note=e.modules_note, compatibility_note=e.compatibility_note))
        audit(db, row, actor, 'nominate')
    db.flush()
    return row


def plan_detail(db, obj, actor):
    result = columns(obj, ['id', 'activity_id', 'game_id', 'inventory_id', 'table_label', 'bring_user_id',
                           'bring_label', 'note', 'sort_order', 'revision'])
    result['game'] = columns(catalog.game(db, obj.game_id, actor), catalog.GAME_PUBLIC)
    result['expansions'] = [dict(game_id=e.expansion_game_id, **columns(e, ['inventory_id', 'bring_user_id',
        'bring_label', 'modules_note', 'compatibility_note', 'sort_order'])) for e in db.scalars(
            select(PlanExpansion).where(PlanExpansion.plan_id == obj.id).order_by(PlanExpansion.sort_order,
                                                                                  PlanExpansion.expansion_game_id))]
    expansion_names(db, result['expansions'])
    result['warnings'] = []
    for box_id in [obj.inventory_id] + [e['inventory_id'] for e in result['expansions']]:
        if not box_id:
            continue
        box = db.get(Inventory, box_id)
        if box and (box.archived_at or box.status != 'available' or not box.available_for_activity):
            result['warnings'].append({'reason': 'inventory_unavailable', 'inventory_id': box_id})
        if db.scalar(select(GamePlan.id).where(GamePlan.inventory_id == box_id,
                                              GamePlan.activity_id != obj.activity_id).limit(1)):
            result['warnings'].append({'reason': 'inventory_used_in_another_plan', 'inventory_id': box_id})
    return result


def save_plan(db, obj, actor, payload, plan=None):
    from app.schemas.boardgame import PlanCreate
    require_plan(obj, actor)
    if plan:
        if plan.activity_id != obj.id:
            fail('not_found', 404)
        check_revision(plan, payload.expected_revision)
        values = plan_detail(db, plan, actor)
        values = {k: values[k] for k in PlanCreate.model_fields}
        values.update(payload.model_dump(exclude_unset=True, exclude={'expected_revision', 'reason'}))
        form = PlanCreate.model_validate(values)
    else:
        form = payload
    catalog.game(db, form.game_id, actor, usable=True, lock=True)
    catalog.validate_box(db, form.inventory_id, form.game_id, actor, activity=True)
    catalog.validate_expansions(db, actor, form.game_id, form.expansions, context='plan')
    if form.bring_user_id and form.bring_label:
        fail('invalid_bringer')
    values = form.model_dump(exclude={'expansions'})
    if plan:
        for k, v in values.items():
            setattr(plan, k, v)
        touch(plan, actor)
    else:
        plan = GamePlan(**stamp(actor, activity_id=obj.id, **values))
        db.add(plan)
        db.flush()
    db.execute(delete(PlanExpansion).where(PlanExpansion.plan_id == plan.id))
    for e in form.expansions:
        db.add(PlanExpansion(plan_id=plan.id, expansion_game_id=e.game_id, **e.model_dump(exclude={'game_id'})))
    audit(db, plan, actor, 'save_plan', reason=getattr(payload, 'reason', None))
    db.flush()
    return plan


def delete_plan(db, obj, plan, actor, expected):
    require_plan(obj, actor)
    if plan.activity_id != obj.id:
        fail('not_found', 404)
    check_revision(plan, expected)
    for play in db.scalars(select(Play).where(Play.plan_id == plan.id).with_for_update()):
        play.plan_id = None
        touch(play, actor)
        from app.services.boardgame_scoresheet import refresh_sheet
        refresh_sheet(db, play)
        audit(db, play, actor, 'unlink_plan')
    db.execute(delete(PlanExpansion).where(PlanExpansion.plan_id == plan.id))
    audit(db, plan, actor, 'delete_plan')
    db.flush()
    db.delete(plan)
    db.flush()


def activity_summary(db, obj, actor):
    sync_nominations(db, obj)
    state = db.get(ActivityGameSettings, obj.id)
    editable = obj.status not in INACTIVE and obj.start_time > now()
    rows = list(db.scalars(select(Nomination).where(Nomination.activity_id == obj.id,
                     Nomination.state.in_(['active', 'frozen'])).order_by(Nomination.id)))
    groups = {}
    for row in rows:
        group = groups.setdefault(row.game_id, dict(game=columns(catalog.game(db, row.game_id, actor), ['id', 'name', 'cover_url']),
                                  nomination_count=0, mine=None, expansion_demands={}, people_preview=[]))
        group['nomination_count'] += 1
        if len(group['people_preview']) < 5:
            group['people_preview'].append(user_summary(db, row.user_id))
        if row.user_id == actor.id:
            group['mine'] = nomination_detail(db, row)
        for e in db.scalars(select(NominationExpansion).where(NominationExpansion.nomination_id == row.id)):
            group['expansion_demands'][e.expansion_game_id] = group['expansion_demands'].get(e.expansion_game_id, 0) + 1
    for group in groups.values():
        group['expansion_demands'] = [dict(game_id=k, nomination_count=v) for k, v in group['expansion_demands'].items()]
    counts = dict(db.execute(select(Play.status, func.count()).where(Play.activity_id == obj.id,
        Play.publication_status == 'published', Play.status.in_(['completed', 'abandoned'])).group_by(Play.status)).all())
    return dict(activity_id=obj.id, nomination_state=dict(editable=editable, cutoff_at=safe(obj.start_time),
        frozen_at=safe(state.frozen_at) if state else None, revision=state.revision if state else 0),
        nominations=list(groups.values()), plans=[plan_detail(db, p, actor) for p in db.scalars(
            select(GamePlan).where(GamePlan.activity_id == obj.id).order_by(GamePlan.sort_order, GamePlan.id))],
        play_summary=dict(completed_count=counts.get('completed', 0), abandoned_count=counts.get('abandoned', 0)),
        permissions=dict(can_nominate=editable and eligible(db, obj, actor), can_record=can_record(db, obj, actor),
                         can_manage_plans=actor.role == 'admin' or actor.id == obj.created_by))


def preserve_activity_history(db, obj):
    if not get_settings().boardgame_enabled:
        return
    before_existing_mutation(db, obj)
    for play in db.scalars(select(Play).where(Play.activity_id == obj.id).with_for_update()):
        play.activity_snapshot = dict(id=obj.id, name=obj.name, start_time=safe(obj.start_time), end_time=safe(obj.end_time))
        play.original_activity_id = obj.id
        play.activity_id = play.plan_id = None
        play.revision += 1
        play.updated_at = now()
        from app.services.boardgame_scoresheet import refresh_sheet
        refresh_sheet(db, play)
        audit(db, play, None, 'activity_deleted', after={'original_activity_id': obj.id})
    db.flush()

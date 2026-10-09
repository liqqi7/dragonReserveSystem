"""Activity use cases."""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value

from app.utils.activity_status import (
    CANCELLED,
    CANCELLED_ACTIVITY_STATUSES,
    ENDED,
    FLOW_CANCELLED,
    NOT_STARTED,
    ONGOING,
    RETROACTIVE_CHECKIN_STATUSES,
    TERMINAL_ACTIVITY_STATUSES,
)
from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models import Activity, ActivityParticipant, User
from app.models.activity import ActivitySubItem, ActivityParticipantSubItem
from app.services.activity_weather_service import invalidate_weather_snapshot
from app.schemas.activity import ActivityCheckinRequest
from app.schemas.activity_v2 import ActivityUpdateV2Request
from app.services.amap_service import ReverseGeocodeResult, reverse_geocode
from app.utils.geo import haversine_distance_meters
from app.utils.app_time import app_now as _app_now, to_app_naive


settings = get_settings()
FLOW_CANCEL_MIN_PARTICIPANTS = 2  # 触发流局的最低人数阈值


def _get_activity_query():
    return select(Activity).options(
        selectinload(Activity.participants).selectinload(ActivityParticipant.sub_item_associations),
        selectinload(Activity.sub_items).selectinload(ActivitySubItem.participant_associations),
    )


def _find_participant(
    db: Session, activity_id: int, *, participant_id: int | None = None, user_id: int | None = None,
) -> ActivityParticipant | None:
    if (participant_id is None) == (user_id is None):
        raise ValueError("Provide exactly one participant identity")
    identity = (
        ActivityParticipant.id == participant_id if participant_id is not None
        else ActivityParticipant.user_id == user_id
    )
    return db.scalar(select(ActivityParticipant).where(
        ActivityParticipant.activity_id == activity_id, identity,
    ))


def get_activity_by_id(db: Session, activity_id: int) -> Activity:
    """Fetch an activity with participants."""

    activity = db.scalar(_get_activity_query().where(Activity.id == activity_id))
    if activity is None:
        raise NotFoundError("Activity not found")
    if _persist_activity_status(db, activity, _app_now()):
        db.commit()
        db.refresh(activity)
    return activity


def _calculate_activity_status(activity: Activity, now: datetime) -> str:
    """Derive time-based status without dirtying an ORM object."""
    if activity.status in CANCELLED_ACTIVITY_STATUSES:
        return activity.status
    now = to_app_naive(now)
    start_time = to_app_naive(activity.start_time)
    end_time = to_app_naive(activity.end_time)
    if end_time <= now:
        new_status = ENDED
    elif start_time <= now:
        participant_count = len(activity.participants)
        if participant_count <= FLOW_CANCEL_MIN_PARTICIPANTS:
            new_status = FLOW_CANCELLED
        else:
            new_status = ONGOING
    else:
        new_status = NOT_STARTED
    return new_status



def _sync_activity_status(activity: Activity, now: datetime) -> bool:
    """Apply status in memory during creation or a locked edit."""
    new_status = _calculate_activity_status(activity, now)
    if activity.status == new_status:
        return False
    activity.status = new_status
    return True


def _persist_activity_status(db: Session, activity: Activity, now: datetime) -> bool:
    """Compare-and-set: stale GET/timer snapshots must not overwrite user edits."""
    old_status = activity.status
    new_status = _calculate_activity_status(activity, now)
    if old_status == new_status:
        return False
    result = db.execute(
        update(Activity)
        .where(
            Activity.id == activity.id,
            Activity.status == old_status,
            Activity.start_time == activity.start_time,
            Activity.end_time == activity.end_time,
        )
        .values(status=new_status)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount:
        db.refresh(activity, with_for_update=True)
        return True
    # A locking/current read avoids the old MySQL REPEATABLE READ snapshot.
    db.refresh(activity, with_for_update=True)
    return False


def list_activities(db: Session) -> list[Activity]:
    """List activities ordered by start time descending."""
    stmt = _get_activity_query().order_by(Activity.start_time.desc())
    activities = list(db.scalars(stmt).unique().all())
    now = _app_now()
    if any([_persist_activity_status(db, a, now) for a in activities]):
        db.commit()
    return activities


def list_my_activities(db: Session, user: User) -> list[Activity]:
    """List activities joined by the current user, ordered for calendar display."""
    stmt = (
        _get_activity_query()
        .join(ActivityParticipant, ActivityParticipant.activity_id == Activity.id)
        .where(ActivityParticipant.user_id == user.id)
        .order_by(Activity.start_time.asc())
    )
    activities = list(db.scalars(stmt).unique().all())
    now = _app_now()
    if any([_persist_activity_status(db, a, now) for a in activities]):
        db.commit()
    return activities


def update_activity(
    db: Session,
    activity: Activity,
    payload: ActivityUpdateV2Request,
    actor: User | None = None,
) -> Activity:
    """Update an activity."""

    is_admin = bool(actor and getattr(actor, "role", None) == "admin")
    activity = lock_activity(db, activity)
    if activity.status in TERMINAL_ACTIVITY_STATUSES and not is_admin:
        raise ValidationAppError("Terminal activities cannot be edited")

    data = payload.model_dump(exclude_unset=True)
    sub_items = data.pop("sub_items", None)
    if sub_items is not None:
        replace_sub_items(activity, sub_items)
    capacity = data.get("max_participants")
    if capacity is not None and capacity < len(activity.participants):
        raise ValidationAppError("活动名额不能少于已报名人数")
    weather_source_changed = any(
        key in data and getattr(activity, key) != value
        for key, value in data.items()
        if key in {"start_time", "location_latitude", "location_longitude"}
    )
    for key, value in data.items():
        setattr(activity, key, value)

    if to_app_naive(activity.end_time) <= to_app_naive(activity.start_time):
        raise ValidationAppError("end_time must be later than start_time")

    _sync_activity_status(activity, _app_now())
    if weather_source_changed:
        invalidate_weather_snapshot(db, activity)

    db.add(activity)
    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def cancel_activity(db: Session, activity: Activity, actor: User | None = None) -> Activity:
    """Cancel an activity through an explicit state transition."""

    activity = lock_activity(db, activity)
    if activity.status == CANCELLED:
        raise ValidationAppError("Activity is already cancelled")

    is_admin = bool(actor and getattr(actor, "role", None) == "admin")
    if activity.status in TERMINAL_ACTIVITY_STATUSES and not is_admin:
        raise ValidationAppError("Terminal activities cannot be cancelled")

    activity.status = CANCELLED
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def delete_activity(db: Session, activity: Activity) -> None:
    """Delete an activity and its participants."""

    db.delete(activity)
    db.commit()


def lock_activity(db: Session, activity: Activity) -> Activity:
    """Serialize capacity checks and edits on the activity row (production SQL)."""
    activity = db.scalar(select(Activity).where(Activity.id == activity.id)
                         .with_for_update().execution_options(populate_existing=True))
    # MySQL REPEATABLE READ: ordinary eager loads/counts may retain a snapshot from
    # the pre-lock detail lookup. Locking reads below explicitly read current rows.
    participants = list(db.scalars(select(ActivityParticipant).where(
        ActivityParticipant.activity_id == activity.id).order_by(ActivityParticipant.id)
        .with_for_update().execution_options(populate_existing=True)))
    items = list(db.scalars(select(ActivitySubItem).where(ActivitySubItem.activity_id == activity.id)
                 .order_by(ActivitySubItem.sort_order, ActivitySubItem.id).with_for_update()
                 .execution_options(populate_existing=True)))
    links = list(db.scalars(select(ActivityParticipantSubItem).where(
        ActivityParticipantSubItem.activity_id == activity.id).order_by(ActivityParticipantSubItem.id)
        .with_for_update().execution_options(populate_existing=True)))
    set_committed_value(activity, "participants", participants)
    set_committed_value(activity, "sub_items", items)
    for participant in participants:
        set_committed_value(participant, "sub_item_associations", [link for link in links if link.participant_id == participant.id])
    for item in items:
        set_committed_value(item, "participant_associations", [link for link in links if link.sub_item_id == item.id])
    return activity


def replace_sub_items(activity: Activity, items: list[dict]) -> None:
    """Validate the entire replacement before modifying any project."""
    if len(items) > 4:
        raise ValidationAppError("最多添加4个子项目")
    existing = {item.id: item for item in activity.sub_items}
    ids = [item["id"] for item in items if item.get("id") is not None]
    if len(ids) != len(set(ids)) or any(item_id not in existing for item_id in ids):
        raise ValidationAppError("子项目不属于当前活动或重复")
    if not existing and items and activity.participants:
        raise ValidationAppError("已有报名的单项目活动不能切换为多项目")
    for item in activity.sub_items:
        if item.id not in ids and item.current_participants:
            raise ValidationAppError("已有报名的子项目不能删除")
    for data in items:
        previous = existing.get(data.get("id"))
        if previous and data["max_participants"] < previous.current_participants:
            raise ValidationAppError("子项目名额不能少于已报名人数")
    replacement = []
    for index, data in enumerate(items):
        item = existing.get(data.get("id")) or ActivitySubItem()
        item.name = data["name"]
        item.max_participants = data["max_participants"]
        item.sort_order = index
        replacement.append(item)
    activity.sub_items = replacement


def signup_activity(db: Session, activity: Activity, user: User, sub_item_ids: list[int] | None = None) -> ActivityParticipant:
    """Register once for the entire activity; selected projects are atomic."""

    activity = lock_activity(db, activity)
    if activity.status in TERMINAL_ACTIVITY_STATUSES:
        message = "Activity has been cancelled" if activity.status == CANCELLED else f"活动{activity.status}"
        raise ValidationAppError(message)

    if activity.signup_enabled is False:
        raise ValidationAppError("Signup is currently disabled for this activity")

    deadline = activity.start_time
    if deadline and _app_now() >= deadline:
        raise ValidationAppError("Signup deadline has passed")

    existing = next((participant for participant in activity.participants if participant.user_id == user.id), None)
    if existing is not None:
        raise ConflictError("You have already signed up for this activity")

    if activity.max_participants is not None:
        participant_count = len(activity.participants)
        if participant_count >= activity.max_participants:
            raise ValidationAppError("报名失败，活动参与人数已达上限")

    selected = sub_item_ids or []
    available = {item.id: item for item in activity.sub_items}
    if len(selected) != len(set(selected)) or any(item_id not in available for item_id in selected):
        raise ValidationAppError("子项目选择无效")
    if available and not selected:
        raise ValidationAppError("请至少选择一个子项目")
    for item_id in selected:
        item = available[item_id]
        if item.current_participants >= item.max_participants:
            raise ValidationAppError("所选子项目已满员")

    participant = ActivityParticipant(
        activity_id=activity.id,
        user_id=user.id,
        display_nickname=user.nickname,
        display_avatar_url=user.avatar_url,
    )
    db.add(participant)
    db.flush()
    for item_id in selected:
        db.add(ActivityParticipantSubItem(activity_id=activity.id, participant_id=participant.id,
                                          sub_item_id=item_id, user_id=user.id))
    db.commit()
    db.refresh(participant)
    return participant


def remove_participant(
    db: Session,
    activity: Activity,
    participant_id: int,
    actor: User,
    *,
    allow_activity_owner: bool = False,
) -> None:
    """Remove a participant from an activity."""

    activity = lock_activity(db, activity)

    participant = _find_participant(db, activity.id, participant_id=participant_id)
    if participant is None:
        raise NotFoundError("Participant not found")

    is_activity_manager = actor.role == "admin" or (
        allow_activity_owner and activity.created_by == actor.id
    )
    if not is_activity_manager and participant.user_id != actor.id:
        raise ValidationAppError("You can only remove your own signup")

    deadline = activity.start_time
    if not is_activity_manager and deadline and _app_now() >= deadline:
        raise ValidationAppError("Signup deadline has passed; contact an admin to remove this signup")

    db.delete(participant)
    db.commit()


def admin_checkin_participant(
    db: Session,
    activity: Activity,
    participant_id: int,
    actor: User,
) -> ActivityParticipant:
    """Admin-only retroactive checkin for a participant.

    Does not perform location or time window checks; intended for correcting records
    after an activity has completed or when on-site checkin failed.
    """

    if actor.role != "admin":
        raise ValidationAppError("Only admins can perform retroactive checkin")
    activity = lock_activity(db, activity)
    if activity.status not in RETROACTIVE_CHECKIN_STATUSES:
        raise ValidationAppError("Retroactive checkin is only allowed for ongoing or ended activities")

    participant = _find_participant(db, activity.id, participant_id=participant_id)
    if participant is None:
        raise NotFoundError("Participant not found")
    if participant.checked_in_at is not None:
        raise ConflictError("Participant has already checked in")

    participant.checked_in_at = _app_now()
    participant.checkin_method = "admin"
    participant.checkin_lat = None
    participant.checkin_lng = None
    participant.checkin_location_name = None
    participant.checkin_address = None
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def admin_cancel_checkin_participant(
    db: Session,
    activity: Activity,
    participant_id: int,
    actor: User,
) -> ActivityParticipant:
    """Admin-only cancel checkin for a participant."""

    if actor.role != "admin":
        raise ValidationAppError("Only admins can cancel checkin")
    activity = lock_activity(db, activity)
    if activity.status == CANCELLED:
        raise ValidationAppError("Cannot cancel checkin for a cancelled activity")

    participant = _find_participant(db, activity.id, participant_id=participant_id)
    if participant is None:
        raise NotFoundError("Participant not found")
    if participant.checked_in_at is None:
        raise ConflictError("Participant has not checked in")

    participant.checked_in_at = None
    participant.checkin_method = None
    participant.checkin_lat = None
    participant.checkin_lng = None
    participant.checkin_location_name = None
    participant.checkin_address = None
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def checkin_activity(
    db: Session,
    activity: Activity,
    user: User,
    payload: ActivityCheckinRequest,
) -> ActivityParticipant:
    """Check the current user in to an activity."""

    activity = lock_activity(db, activity)
    if activity.status != ONGOING:
        raise ValidationAppError("Only ongoing activities can be checked in")

    participant = _find_participant(db, activity.id, user_id=user.id)
    if participant is None:
        raise ValidationAppError("You must sign up before checking in")
    if participant.checked_in_at is not None:
        raise ConflictError("You have already checked in")

    if activity.location_latitude is None or activity.location_longitude is None:
        raise ValidationAppError("Activity location is not configured")

    distance = haversine_distance_meters(
        payload.lat,
        payload.lng,
        activity.location_latitude,
        activity.location_longitude,
    )
    if distance > settings.checkin_radius_meters:
        raise ValidationAppError("You are outside the allowed check-in radius")

    try:
        reverse_geocode_result = reverse_geocode(lat=payload.lat, lng=payload.lng)
    except Exception:
        # Reverse geocoding is supplemental: a provider failure must never block check-in.
        reverse_geocode_result = ReverseGeocodeResult()

    participant.checked_in_at = _app_now()
    participant.checkin_method = "location"
    participant.checkin_lat = payload.lat
    participant.checkin_lng = payload.lng
    participant.checkin_location_name = reverse_geocode_result.location_name
    participant.checkin_address = reverse_geocode_result.address
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant

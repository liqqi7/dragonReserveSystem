"""Activity use cases."""

from datetime import datetime
import hashlib
import json
from zoneinfo import ZoneInfo

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.orm.attributes import set_committed_value

from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models import Activity, ActivityParticipant, User
from app.models.activity import ActivitySubItem, ActivityParticipantSubItem
from app.services.activity_weather_service import ensure_weather_snapshot, invalidate_weather_snapshot
from app.schemas.activity import (
    ActivityCheckinRequest,
    ActivityCreateRequest,
    ActivityUpdateRequest,
)
from app.services.amap_service import ReverseGeocodeResult, reverse_geocode
from app.services.activity_type_style_service import (
    get_activity_style,
    list_available_style_keys_in_order,
    normalize_activity_style_key,
    normalize_activity_type_key,
)
from app.utils.geo import haversine_distance_meters


settings = get_settings()
FLOW_CANCEL_MIN_PARTICIPANTS = 2  # 触发流局的最低人数阈值
APP_TIME_ZONE = ZoneInfo("Asia/Shanghai")
TERMINAL_ACTIVITY_STATUSES = frozenset({"已结束", "已取消", "已流局"})


def _get_activity_query():
    return select(Activity).options(
        selectinload(Activity.participants).selectinload(ActivityParticipant.sub_item_associations),
        selectinload(Activity.sub_items).selectinload(ActivitySubItem.participant_associations),
    )


def _app_now() -> datetime:
    """Return a naive datetime in the timezone used by stored activity times."""

    return datetime.now(APP_TIME_ZONE).replace(tzinfo=None)


def get_activity_by_id(db: Session, activity_id: int) -> Activity:
    """Fetch an activity with participants."""

    activity = db.scalar(_get_activity_query().where(Activity.id == activity_id))
    if activity is None:
        raise NotFoundError("Activity not found")
    if _sync_activity_status(activity, _app_now()):
        db.commit()
        db.refresh(activity)
    return activity


def _sync_activity_status(activity: Activity, now: datetime) -> bool:
    """Compute time-based status for an activity. Returns True if status changed."""
    if activity.status in ("已取消", "已流局"):
        return False
    if activity.end_time <= now:
        new_status = "已结束"
    elif activity.start_time <= now:
        # 仅在活动开始时检查人数，历史独立截止时间不再生效
        participant_count = len(activity.participants)
        if participant_count <= FLOW_CANCEL_MIN_PARTICIPANTS:
            new_status = "已流局"
        elif activity.start_time <= now:
            new_status = "进行中"
        else:
            new_status = "未开始"
    elif activity.start_time <= now:
        new_status = "进行中"
    else:
        new_status = "未开始"
    if activity.status != new_status:
        activity.status = new_status
        return True
    return False


def list_activities(db: Session) -> list[Activity]:
    """List activities ordered by start time descending."""
    stmt = _get_activity_query().order_by(Activity.start_time.desc())
    activities = list(db.scalars(stmt).unique().all())
    now = _app_now()
    if any([_sync_activity_status(a, now) for a in activities]):
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
    if any([_sync_activity_status(a, now) for a in activities]):
        db.commit()
    return activities


def _resolve_style_key_implicit(db: Session, activity_type: str) -> Optional[str]:
    """Pick style_key when client omits it: rotate if multiple styles, else single or default."""

    type_key = normalize_activity_type_key(activity_type) or "other"
    keys = list_available_style_keys_in_order(type_key)
    if not keys:
        return normalize_activity_style_key(type_key, None)
    if len(keys) == 1:
        return keys[0]
    count = (
        db.scalar(
            select(func.count(Activity.id)).where(
                Activity.activity_type == type_key,
                Activity.status != "已取消",
            )
        )
        or 0
    )
    return keys[count % len(keys)]


def get_activity_style_signature(db: Session) -> tuple[str, int]:
    """Return signature for all persisted activity style-related fields."""

    rows = db.execute(
        select(Activity.id, Activity.activity_type, Activity.activity_style_key).order_by(Activity.id.asc())
    ).all()
    signature_items: list[dict[str, object]] = []
    for activity_id, activity_type, activity_style_key in rows:
        style = get_activity_style(activity_type or "other", activity_style_key)
        signature_items.append(
            {
                "id": int(activity_id),
                "activity_type": str(activity_type or "other"),
                "activity_style_key": str(activity_style_key or ""),
                "large_card_bg_image_url": str((style or {}).get("large_card_bg_image_url") or ""),
                "small_card_bg_image_url": str((style or {}).get("small_card_bg_image_url") or ""),
                "bg_video_url": str((style or {}).get("bg_video_url") or ""),
                "show_avatar_cluster": bool((style or {}).get("show_avatar_cluster", False)),
            }
        )
    payload = json.dumps(signature_items, ensure_ascii=False, separators=(",", ":"))
    signature = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return signature, len(signature_items)


def create_activity(db: Session, payload: ActivityCreateRequest, created_by: User) -> Activity:
    """Create a new activity."""

    activity_type = payload.activity_type or "other"
    explicit = (payload.activity_style_key or "").strip()
    if explicit:
        activity_style_key = normalize_activity_style_key(activity_type, payload.activity_style_key)
    else:
        activity_style_key = _resolve_style_key_implicit(db, activity_type)
        if not activity_style_key:
            activity_style_key = normalize_activity_style_key(activity_type, None)
    activity = Activity(
        name=payload.name,
        status=payload.status,
        remark=payload.remark,
        max_participants=payload.max_participants,
        start_time=payload.start_time,
        end_time=payload.end_time,
        signup_deadline=None,
        signup_enabled=payload.signup_enabled,
        activity_type=activity_type,
        activity_style_key=activity_style_key,
        location_name=payload.location_name,
        location_address=payload.location_address,
        location_latitude=payload.location_latitude,
        location_longitude=payload.location_longitude,
        created_by=created_by.id,
    )
    db.add(activity)
    db.flush()
    _sync_activity_status(activity, _app_now())

    # Auto-signup creator as a participant
    creator_participant = ActivityParticipant(
        activity_id=activity.id,
        user_id=created_by.id,
        display_nickname=created_by.nickname,
        display_avatar_url=created_by.avatar_url,
    )
    db.add(creator_participant)
    ensure_weather_snapshot(db, activity)

    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def update_activity(
    db: Session,
    activity: Activity,
    payload: ActivityUpdateRequest,
    actor: User | None = None,
) -> Activity:
    """Update an activity."""

    is_admin = bool(actor and getattr(actor, "role", None) == "admin")
    if activity.status in TERMINAL_ACTIVITY_STATUSES and not is_admin:
        raise ValidationAppError("Terminal activities cannot be edited")

    activity = lock_activity(db, activity)
    data = payload.model_dump(exclude_unset=True)
    sub_items = data.pop("sub_items", None)
    data.pop("signup_deadline", None)
    if sub_items is not None:
        replace_sub_items(activity, sub_items)
    capacity = data.get("max_participants")
    if capacity is not None and capacity < len(activity.participants):
        raise ValidationAppError("活动名额不能少于已报名人数")
    prev_type = activity.activity_type
    weather_source_changed = any(
        key in data and getattr(activity, key) != value
        for key, value in data.items()
        if key in {"start_time", "location_latitude", "location_longitude"}
    )
    for key, value in data.items():
        setattr(activity, key, value)

    if "activity_type" in data or "activity_style_key" in data:
        activity.activity_type = activity.activity_type or "other"
        prev_norm = normalize_activity_type_key(prev_type or "other") or "other"
        new_norm = normalize_activity_type_key(activity.activity_type or "other") or "other"
        if "activity_style_key" in data:
            activity.activity_style_key = normalize_activity_style_key(
                activity.activity_type,
                data["activity_style_key"],
            )
        elif "activity_type" in data and prev_norm != new_norm:
            resolved = _resolve_style_key_implicit(db, activity.activity_type)
            activity.activity_style_key = resolved or normalize_activity_style_key(activity.activity_type, None)
        elif "activity_type" in data:
            try:
                activity.activity_style_key = normalize_activity_style_key(
                    activity.activity_type,
                    activity.activity_style_key,
                )
            except ValueError:
                resolved = _resolve_style_key_implicit(db, activity.activity_type)
                activity.activity_style_key = resolved or normalize_activity_style_key(
                    activity.activity_type, None
                )

    if activity.end_time <= activity.start_time:
        raise ValidationAppError("end_time must be later than start_time")
    activity.signup_deadline = None

    _sync_activity_status(activity, _app_now())
    if weather_source_changed:
        invalidate_weather_snapshot(db, activity)

    db.add(activity)
    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def cancel_activity(db: Session, activity: Activity, actor: User | None = None) -> Activity:
    """Cancel an activity through an explicit state transition."""

    if activity.status == "已取消":
        raise ValidationAppError("Activity is already cancelled")

    is_admin = bool(actor and getattr(actor, "role", None) == "admin")
    if activity.status in TERMINAL_ACTIVITY_STATUSES and not is_admin:
        raise ValidationAppError("Terminal activities cannot be cancelled")

    activity.status = "已取消"
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

    if activity.status in TERMINAL_ACTIVITY_STATUSES:
        raise ValidationAppError("Activity has been cancelled")

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

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.id == participant_id,
        )
    )
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
    *,
    allow_activity_owner: bool = False,
) -> ActivityParticipant:
    """Admin-only retroactive checkin for a participant.

    Does not perform location or time window checks; intended for correcting records
    after an activity has completed or when on-site checkin failed.
    """

    if actor.role != "admin" and not (allow_activity_owner and activity.created_by == actor.id):
        raise ValidationAppError("Only admins can perform retroactive checkin")
    if activity.status == "已取消":
        raise ValidationAppError("Cannot check in participants for a cancelled activity")

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.id == participant_id,
        )
    )
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
    *,
    allow_activity_owner: bool = False,
) -> ActivityParticipant:
    """Admin-only cancel checkin for a participant."""

    if actor.role != "admin" and not (allow_activity_owner and activity.created_by == actor.id):
        raise ValidationAppError("Only admins can cancel checkin")
    if activity.status == "已取消":
        raise ValidationAppError("Cannot cancel checkin for a cancelled activity")

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.id == participant_id,
        )
    )
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

    if activity.status != "进行中":
        raise ValidationAppError("Only ongoing activities can be checked in")

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.user_id == user.id,
        )
    )
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


def cancel_signup(db: Session, activity: Activity, user: User) -> None:
    """Remove the current user's signup if still allowed."""

    activity = lock_activity(db, activity)

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.user_id == user.id,
        )
    )
    if participant is None:
        raise NotFoundError("Signup record not found")

    deadline = activity.start_time
    if user.role != "admin" and deadline and _app_now() >= deadline:
        raise ValidationAppError("Signup deadline has passed; contact an admin to remove this signup")

    db.delete(participant)
    db.commit()

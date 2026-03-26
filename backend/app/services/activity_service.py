"""Activity use cases."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models import Activity, ActivityParticipant, User
from app.schemas.activity import (
    ActivityCheckinRequest,
    ActivityCreateRequest,
    ActivityUpdateRequest,
)
from app.services.activity_type_style_service import normalize_activity_style_key
from app.utils.geo import haversine_distance_meters


settings = get_settings()
CHECKIN_EARLY_WINDOW_MINUTES = 30


def _get_activity_query():
    return select(Activity).options(selectinload(Activity.participants))


def _utcnow() -> datetime:
    return datetime.utcnow()


def get_activity_by_id(db: Session, activity_id: int) -> Activity:
    """Fetch an activity with participants."""

    activity = db.scalar(_get_activity_query().where(Activity.id == activity_id))
    if activity is None:
        raise NotFoundError("Activity not found")
    return activity


def list_activities(db: Session) -> list[Activity]:
    """List activities ordered by start time descending. Excludes logically deleted (已删除)."""
    stmt = (
        _get_activity_query()
        .where(Activity.status != "已删除")
        .order_by(Activity.start_time.desc())
    )
    return list(db.scalars(stmt).unique().all())


def create_activity(db: Session, payload: ActivityCreateRequest, created_by: User) -> Activity:
    """Create a new activity."""

    activity_type = payload.activity_type or "other"
    activity_style_key = normalize_activity_style_key(activity_type, payload.activity_style_key)
    activity = Activity(
        name=payload.name,
        status=payload.status,
        remark=payload.remark,
        max_participants=payload.max_participants,
        start_time=payload.start_time,
        end_time=payload.end_time,
        signup_deadline=payload.signup_deadline,
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

    # Auto-signup creator as a participant
    creator_participant = ActivityParticipant(
        activity_id=activity.id,
        user_id=created_by.id,
        nickname_snapshot=created_by.nickname,
        avatar_url_snapshot=created_by.avatar_url,
    )
    db.add(creator_participant)

    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def update_activity(db: Session, activity: Activity, payload: ActivityUpdateRequest) -> Activity:
    """Update an activity."""

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(activity, key, value)

    if "activity_type" in data or "activity_style_key" in data:
        activity.activity_type = activity.activity_type or "other"
        activity.activity_style_key = normalize_activity_style_key(
            activity.activity_type,
            activity.activity_style_key,
        )

    if activity.end_time <= activity.start_time:
        raise ValidationAppError("end_time must be later than start_time")
    if activity.signup_deadline and activity.signup_deadline > activity.start_time:
        raise ValidationAppError("signup_deadline must be earlier than or equal to start_time")

    db.add(activity)
    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def delete_activity(db: Session, activity: Activity) -> None:
    """Delete an activity and its participants."""

    db.delete(activity)
    db.commit()


def signup_activity(db: Session, activity: Activity, user: User) -> ActivityParticipant:
    """Register the current user for an activity."""

    if activity.status == "已取消":
        raise ValidationAppError("Activity has been cancelled")

    if activity.signup_enabled is False:
        raise ValidationAppError("Signup is currently disabled for this activity")

    deadline = activity.signup_deadline or activity.start_time
    if deadline and _utcnow() >= deadline:
        raise ValidationAppError("Signup deadline has passed")

    existing = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.user_id == user.id,
        )
    )
    if existing is not None:
        raise ConflictError("You have already signed up for this activity")

    if activity.max_participants is not None:
        participant_count = (
            db.query(ActivityParticipant)
            .filter(ActivityParticipant.activity_id == activity.id)
            .count()
        )
        if participant_count >= activity.max_participants:
            raise ValidationAppError("Activity is already full")

    participant = ActivityParticipant(
        activity_id=activity.id,
        user_id=user.id,
        nickname_snapshot=user.nickname,
        avatar_url_snapshot=user.avatar_url,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def cancel_signup(db: Session, activity: Activity, user: User) -> None:
    """Remove the current user's signup if still allowed."""

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.user_id == user.id,
        )
    )
    if participant is None:
        raise NotFoundError("Signup record not found")

    deadline = activity.signup_deadline or activity.start_time
    if user.role != "admin" and deadline and _utcnow() >= deadline:
        raise ValidationAppError("Signup deadline has passed; contact an admin to remove this signup")

    db.delete(participant)
    db.commit()


def remove_participant(db: Session, activity: Activity, participant_id: int, actor: User) -> None:
    """Remove a participant from an activity."""

    participant = db.scalar(
        select(ActivityParticipant).where(
            ActivityParticipant.activity_id == activity.id,
            ActivityParticipant.id == participant_id,
        )
    )
    if participant is None:
        raise NotFoundError("Participant not found")

    if actor.role != "admin" and participant.user_id != actor.id:
        raise ValidationAppError("You can only remove your own signup")

    deadline = activity.signup_deadline or activity.start_time
    if actor.role != "admin" and deadline and _utcnow() >= deadline:
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
    if activity.status in {"已取消", "已删除"}:
        raise ValidationAppError("Cannot check in participants for a cancelled or deleted activity")

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

    participant.checked_in_at = _utcnow()
    participant.checkin_lat = None
    participant.checkin_lng = None
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
    if activity.status in {"已取消", "已删除"}:
        raise ValidationAppError("Cannot cancel checkin for a cancelled or deleted activity")

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
    participant.checkin_lat = None
    participant.checkin_lng = None
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

    if activity.status == "已取消":
        raise ValidationAppError("Activity has been cancelled")

    # Allow checkin from 30 minutes before activity start.
    start_dt = activity.start_time
    if start_dt is not None:
        if start_dt.tzinfo is not None:
            now = datetime.now(tz=start_dt.tzinfo)
        else:
            # Naive datetime is treated in local time on both frontend and backend.
            now = datetime.now()
        checkin_open_time = start_dt - timedelta(minutes=CHECKIN_EARLY_WINDOW_MINUTES)
        if now < checkin_open_time:
            raise ValidationAppError("提前签到杀球下网、桌游丢件、持仓全绿、抽卡大保底")

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

    participant.checked_in_at = _utcnow()
    participant.checkin_lat = payload.lat
    participant.checkin_lng = payload.lng
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant

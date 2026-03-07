"""Activity use cases."""

from datetime import datetime

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
from app.utils.geo import haversine_distance_meters


settings = get_settings()


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
    """List activities ordered by start time descending."""

    stmt = _get_activity_query().order_by(Activity.start_time.desc())
    return list(db.scalars(stmt).unique().all())


def create_activity(db: Session, payload: ActivityCreateRequest, created_by: User) -> Activity:
    """Create a new activity."""

    activity = Activity(
        name=payload.name,
        status=payload.status,
        remark=payload.remark,
        max_participants=payload.max_participants,
        start_time=payload.start_time,
        end_time=payload.end_time,
        signup_deadline=payload.signup_deadline,
        location_name=payload.location_name,
        location_address=payload.location_address,
        location_latitude=payload.location_latitude,
        location_longitude=payload.location_longitude,
        created_by=created_by.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return get_activity_by_id(db, activity.id)


def update_activity(db: Session, activity: Activity, payload: ActivityUpdateRequest) -> Activity:
    """Update an activity."""

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(activity, key, value)

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

    participant_count = db.query(ActivityParticipant).filter(ActivityParticipant.activity_id == activity.id).count()
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


def checkin_activity(
    db: Session,
    activity: Activity,
    user: User,
    payload: ActivityCheckinRequest,
) -> ActivityParticipant:
    """Check the current user in to an activity."""

    if activity.status == "已取消":
        raise ValidationAppError("Activity has been cancelled")

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

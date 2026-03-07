"""Activity routes."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models import User
from app.schemas.activity import (
    ActivityCheckinRequest,
    ActivityCreateRequest,
    ActivityResponse,
    ActivitySignupResponse,
    ActivityUpdateRequest,
)
from app.services.activity_service import (
    cancel_signup,
    checkin_activity,
    create_activity,
    delete_activity,
    get_activity_by_id,
    list_activities,
    signup_activity,
    update_activity,
)


router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=list[ActivityResponse], summary="List activities")
def get_activities(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ActivityResponse]:
    """Return all activities."""

    activities = list_activities(db)
    return [ActivityResponse.model_validate(activity, from_attributes=True) for activity in activities]


@router.get("/{activity_id}", response_model=ActivityResponse, summary="Get activity detail")
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ActivityResponse:
    """Return a single activity."""

    activity = get_activity_by_id(db, activity_id)
    return ActivityResponse.model_validate(activity, from_attributes=True)


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED, summary="Create activity")
def post_activity(
    payload: ActivityCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ActivityResponse:
    """Create an activity."""

    activity = create_activity(db, payload, current_user)
    return ActivityResponse.model_validate(activity, from_attributes=True)


@router.patch("/{activity_id}", response_model=ActivityResponse, summary="Update activity")
def patch_activity(
    activity_id: int,
    payload: ActivityUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ActivityResponse:
    """Update an activity."""

    activity = get_activity_by_id(db, activity_id)
    updated = update_activity(db, activity, payload)
    return ActivityResponse.model_validate(updated, from_attributes=True)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete activity")
def remove_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Response:
    """Delete an activity."""

    activity = get_activity_by_id(db, activity_id)
    delete_activity(db, activity)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{activity_id}/signup", response_model=ActivitySignupResponse, summary="Sign up for activity")
def post_signup(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivitySignupResponse:
    """Sign the current user up for an activity."""

    activity = get_activity_by_id(db, activity_id)
    participant = signup_activity(db, activity, current_user)
    return ActivitySignupResponse(activity_id=activity.id, participant_id=participant.id, status="signed_up")


@router.delete("/{activity_id}/signup", status_code=status.HTTP_204_NO_CONTENT, summary="Cancel signup")
def delete_signup(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Cancel the current user's signup."""

    activity = get_activity_by_id(db, activity_id)
    cancel_signup(db, activity, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{activity_id}/checkin", response_model=ActivitySignupResponse, summary="Check in to activity")
def post_checkin(
    activity_id: int,
    payload: ActivityCheckinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivitySignupResponse:
    """Check the current user in to an activity."""

    activity = get_activity_by_id(db, activity_id)
    participant = checkin_activity(db, activity, current_user, payload)
    return ActivitySignupResponse(activity_id=activity.id, participant_id=participant.id, status="checked_in")

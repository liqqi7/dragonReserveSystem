"""Per-viewer privacy filtering at the API response boundary."""

from typing import Protocol, TypeVar
from app.models import User
from app.schemas.activity import ActivityParticipantResponse


class ParticipantActivityResponse(Protocol):
    created_by: int
    participants: list[ActivityParticipantResponse]


ResponseT = TypeVar("ResponseT", bound=ParticipantActivityResponse)
_LOCATION_FIELDS = ("checkin_lat", "checkin_lng", "checkin_location_name", "checkin_address")


def filter_participant_locations(response: ResponseT, viewer: User | None) -> ResponseT:
    """Managers may see all locations; other users may only see their own.

    Null fields keep old clients compatible. Only response models are changed,
    never the participant ORM objects or stored check-in records.
    """
    can_manage = bool(viewer and (viewer.role == "admin" or viewer.id == response.created_by))
    for participant in response.participants:
        if can_manage or (viewer and participant.user_id == viewer.id):
            continue
        for field in _LOCATION_FIELDS:
            setattr(participant, field, None)
    return response

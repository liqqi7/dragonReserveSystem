"""Retire only v1 activity routes, preserving current activity and v1 services."""

from datetime import timedelta
import importlib.util

import pytest

from app.models import ActivityParticipant
from app.services.activity_service import _app_now


RETIRED_OPERATIONS = [
    ("GET", ""), ("POST", ""),
    ("GET", "/type-styles"),
    ("GET", "/type-styles/badminton/badminton-default/glass-image"),
    ("GET", "/style-signature"), ("GET", "/me/signed-up"), ("GET", "/mine"),
    ("GET", "/1"), ("PATCH", "/1"), ("DELETE", "/1"),
    ("GET", "/1/share-preview"), ("POST", "/1/signup"), ("DELETE", "/1/signup"),
    ("DELETE", "/1/participants/1"), ("POST", "/1/checkin"),
    ("POST", "/1/participants/1/admin-checkin"),
    ("DELETE", "/1/participants/1/admin-checkin"),
]


@pytest.mark.parametrize("method,suffix", RETIRED_OPERATIONS)
def test_v1_activity_operations_are_removed(client, admin_headers, method, suffix):
    response = client.request(method, "/api/v1/activities" + suffix, headers=admin_headers)
    assert response.status_code == 404, response.text


def test_openapi_keeps_current_apis_without_v1_activity_schemas(client):
    schema = client.app.openapi()
    paths = schema["paths"]
    assert not any(path.startswith("/api/v1/activities") for path in paths)
    for path in ("/api/v2/activities", "/api/v2/activity-covers", "/api/v1/health"):
        assert path in paths
    for name in ("ActivityCreateRequest", "ActivityUpdateRequest", "ActivityResponse",
                 "ActivityDetailResponse", "ActivityTypeStyleResponse", "ActivityStyleSignatureResponse"):
        assert name not in schema["components"]["schemas"]
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v2/activities").status_code == 200
    assert importlib.util.find_spec("app.api.v1.activities") is None
    assert importlib.util.find_spec("app.services.activity_type_style_service") is None


@pytest.mark.parametrize("already_started", [False, True])
def test_self_cancellation_uses_v2_participant_route(
    client, db_session, signed_up_activity, normal_user, second_user, user_headers, already_started,
):
    activity = signed_up_activity
    activity.start_time = _app_now() + timedelta(hours=-1 if already_started else 1)
    activity.end_time = _app_now() + timedelta(hours=2)
    activity.signup_enabled = False  # Closing signup must not block early cancellation.
    other = ActivityParticipant(activity_id=activity.id, user_id=second_user.id,
                                display_nickname=second_user.nickname, display_avatar_url="")
    db_session.add(other)
    db_session.commit()
    own = db_session.query(ActivityParticipant).filter_by(activity_id=activity.id, user_id=normal_user.id).one()
    own_id, other_id = own.id, other.id
    response = client.delete(f"/api/v2/activities/{activity.id}/participants/{own_id}", headers=user_headers)
    assert response.status_code == (422 if already_started else 204), response.text
    db_session.expire_all()
    assert (db_session.get(ActivityParticipant, own_id) is not None) == already_started
    assert db_session.get(ActivityParticipant, other_id) is not None


def test_admin_can_remove_signup_after_start(client, db_session, signed_up_activity, admin_headers):
    activity = signed_up_activity
    activity.start_time = _app_now() - timedelta(hours=1)
    activity.end_time = _app_now() + timedelta(hours=1)
    db_session.commit()
    participant_id = activity.participants[0].id
    response = client.delete(f"/api/v2/activities/{activity.id}/participants/{participant_id}", headers=admin_headers)
    assert response.status_code == 204
    db_session.expire_all()
    assert db_session.get(ActivityParticipant, participant_id) is None

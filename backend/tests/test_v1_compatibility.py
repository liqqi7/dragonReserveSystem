"""Compatibility for the legacy activity endpoints still retained."""


def test_legacy_v1_read_endpoints(client, user_headers):
    for path in [
        "/api/v1/activities/mine",
    ]:
        response = client.get(path, headers=user_headers)
        assert response.status_code == 200, (path, response.text)


def test_legacy_cancel_signup_removes_only_current_user(client, db_session, signed_up_activity, normal_user, user_headers):
    from app.models import ActivityParticipant

    response = client.delete(
        f"/api/v1/activities/{signed_up_activity.id}/signup", headers=user_headers
    )
    assert response.status_code == 204
    assert db_session.query(ActivityParticipant).filter_by(
        activity_id=signed_up_activity.id, user_id=normal_user.id
    ).count() == 0

from datetime import datetime, timedelta


def test_activity_requires_auth(client) -> None:
    response = client.get("/api/v1/activities")

    assert response.status_code == 401


def test_admin_can_create_list_get_update_delete_activity(client, admin_headers) -> None:
    start_time = datetime.utcnow() + timedelta(days=2)
    end_time = start_time + timedelta(hours=2)

    create_response = client.post(
        "/api/v1/activities",
        headers=admin_headers,
        json={
            "name": "羽毛球活动",
            "status": "进行中",
            "remark": "周末开打",
            "max_participants": 12,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "signup_deadline": (start_time - timedelta(hours=3)).isoformat(),
            "location_name": "球馆 A",
            "location_address": "测试地址 A",
            "location_latitude": 39.9042,
            "location_longitude": 116.4074,
        },
    )
    assert create_response.status_code == 201
    activity = create_response.json()
    activity_id = activity["id"]
    assert activity["name"] == "羽毛球活动"

    list_response = client.get("/api/v1/activities", headers=admin_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    detail_response = client.get(f"/api/v1/activities/{activity_id}", headers=admin_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == activity_id

    update_response = client.patch(
        f"/api/v1/activities/{activity_id}",
        headers=admin_headers,
        json={"remark": "已修改", "max_participants": 16},
    )
    assert update_response.status_code == 200
    assert update_response.json()["remark"] == "已修改"
    assert update_response.json()["max_participants"] == 16

    delete_response = client.delete(f"/api/v1/activities/{activity_id}", headers=admin_headers)
    assert delete_response.status_code == 204

    list_after_delete = client.get("/api/v1/activities", headers=admin_headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []


def test_non_admin_cannot_create_activity(client, user_headers) -> None:
    start_time = datetime.utcnow() + timedelta(days=1)
    end_time = start_time + timedelta(hours=1)
    response = client.post(
        "/api/v1/activities",
        headers=user_headers,
        json={
            "name": "普通用户建活动",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
        },
    )

    assert response.status_code == 403
    assert response.json()["code"] == "PERMISSION_DENIED"


def test_user_can_signup_and_cancel_signup(client, sample_activity, user_headers) -> None:
    signup_response = client.post(f"/api/v1/activities/{sample_activity.id}/signup", headers=user_headers)
    assert signup_response.status_code == 200
    assert signup_response.json()["status"] == "signed_up"

    cancel_response = client.delete(f"/api/v1/activities/{sample_activity.id}/signup", headers=user_headers)
    assert cancel_response.status_code == 204


def test_admin_can_remove_participant(client, signed_up_activity, admin_headers, db_session, normal_user) -> None:
    detail_response = client.get(f"/api/v1/activities/{signed_up_activity.id}", headers=admin_headers)
    participant_id = detail_response.json()["participants"][0]["id"]

    response = client.delete(
        f"/api/v1/activities/{signed_up_activity.id}/participants/{participant_id}",
        headers=admin_headers,
    )

    assert response.status_code == 204


def test_user_cannot_remove_other_participant(
    client,
    db_session,
    sample_activity,
    second_user,
    user_headers,
) -> None:
    from app.models import ActivityParticipant

    participant = ActivityParticipant(
        activity_id=sample_activity.id,
        user_id=second_user.id,
        nickname_snapshot=second_user.nickname,
        avatar_url_snapshot=second_user.avatar_url,
    )
    db_session.add(participant)
    db_session.commit()

    response = client.delete(
        f"/api/v1/activities/{sample_activity.id}/participants/{participant.id}",
        headers=user_headers,
    )

    assert response.status_code == 422


def test_duplicate_signup_returns_conflict(client, signed_up_activity, user_headers) -> None:
    response = client.post(f"/api/v1/activities/{signed_up_activity.id}/signup", headers=user_headers)

    assert response.status_code == 409
    assert response.json()["code"] == "CONFLICT"


def test_checkin_success(client, signed_up_activity, user_headers) -> None:
    response = client.post(
        f"/api/v1/activities/{signed_up_activity.id}/checkin",
        headers=user_headers,
        json={"lat": 39.9042, "lng": 116.4074},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "checked_in"


def test_checkin_outside_radius_returns_validation_error(client, signed_up_activity, user_headers) -> None:
    response = client.post(
        f"/api/v1/activities/{signed_up_activity.id}/checkin",
        headers=user_headers,
        json={"lat": 31.2304, "lng": 121.4737},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_signup_after_deadline_returns_validation_error(client, db_session, admin_user, normal_user, user_headers) -> None:
    start_time = datetime.utcnow() - timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)
    from app.models import Activity

    activity = Activity(
        name="已截止活动",
        status="进行中",
        remark="已截止",
        max_participants=10,
        start_time=start_time,
        end_time=end_time,
        signup_deadline=start_time - timedelta(hours=1),
        location_name="球馆",
        location_address="地址",
        location_latitude=39.9042,
        location_longitude=116.4074,
        created_by=admin_user.id,
    )
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)

    response = client.post(f"/api/v1/activities/{activity.id}/signup", headers=user_headers)

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"

from datetime import datetime, timedelta

from app.models import Activity, ActivityParticipant


def test_history_stats_returns_pigeon_ranking(client, db_session, admin_user, normal_user, second_user, user_headers) -> None:
    now = datetime.utcnow()
    activity = Activity(name="Ended", status="ended", remark="", max_participants=10, start_time=now - timedelta(days=2), end_time=now - timedelta(days=1), signup_deadline=now - timedelta(days=3), location_name="Venue", location_address="Address", location_latitude=39.9042, location_longitude=116.4074, created_by=admin_user.id)
    db_session.add(activity)
    db_session.commit()
    db_session.add_all([ActivityParticipant(activity_id=activity.id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=now), ActivityParticipant(activity_id=activity.id, user_id=second_user.id, display_nickname=second_user.nickname, display_avatar_url=second_user.avatar_url)])
    db_session.commit()
    response = client.get("/api/v1/stats/history", headers=user_headers)
    assert response.status_code == 200
    assert len(response.json()) == 2

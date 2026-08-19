from datetime import datetime, timedelta

from app.models import Activity, ActivityParticipant
from app.services.stats_service import get_activity_ranking


def _activity(admin_user, *, name, start, end, status="已结束"):
    return Activity(name=name, status=status, remark="", max_participants=10, start_time=start, end_time=end, signup_deadline=None, location_name="Venue", location_address="Address", location_latitude=None, location_longitude=None, created_by=admin_user.id)


def test_history_stats_preserves_legacy_contract(client, db_session, admin_user, normal_user, second_user, user_headers) -> None:
    now = datetime.utcnow()
    activities = [_activity(admin_user, name=f"Ended {index}", start=now - timedelta(days=index + 2), end=now - timedelta(days=index + 1)) for index in range(3)]
    db_session.add_all(activities)
    db_session.commit()
    db_session.add_all([
        ActivityParticipant(activity_id=activities[0].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url),
        ActivityParticipant(activity_id=activities[1].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url),
        ActivityParticipant(activity_id=activities[2].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=now),
        ActivityParticipant(activity_id=activities[0].id, user_id=second_user.id, display_nickname=second_user.nickname, display_avatar_url=second_user.avatar_url),
    ])
    db_session.commit()

    response = client.get("/api/v1/stats/history", headers=user_headers)

    assert response.status_code == 200
    payload = response.json()
    assert [item["user_id"] for item in payload] == [second_user.id, normal_user.id]
    assert payload[0]["pigeon_rate"] == 100.0
    assert payload[1]["pigeon_count"] == 2
    assert "avatar_url" not in payload[0]


def test_activity_ranking_accumulates_same_day_and_splits_cross_day(db_session, admin_user, normal_user) -> None:
    today = datetime.utcnow().date()
    day = today - timedelta(days=2)
    overnight = _activity(admin_user, name="Overnight", start=datetime.combine(day, datetime.min.time()).replace(hour=23), end=datetime.combine(day + timedelta(days=1), datetime.min.time()).replace(hour=5))
    daytime = _activity(admin_user, name="Daytime", start=datetime.combine(day + timedelta(days=1), datetime.min.time()).replace(hour=10), end=datetime.combine(day + timedelta(days=1), datetime.min.time()).replace(hour=12))
    db_session.add_all([overnight, daytime])
    db_session.commit()
    db_session.add_all([
        ActivityParticipant(activity_id=overnight.id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=datetime.utcnow()),
        ActivityParticipant(activity_id=daytime.id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=datetime.utcnow()),
    ])
    db_session.commit()

    ranking = get_activity_ranking(db_session, today=today)

    assert ranking[0].checkin_count == 2
    by_date = {item.date: item for item in ranking[0].heatmap}
    assert by_date[day].duration_hours == 1
    assert by_date[day].level == 1
    assert by_date[day + timedelta(days=1)].duration_hours == 7
    assert by_date[day + timedelta(days=1)].level == 4
    assert ranking[0].attendance_days == 2


def test_activity_ranking_endpoint_returns_84_heatmap_days(client, db_session, admin_user, normal_user, second_user, user_headers) -> None:
    now = datetime.utcnow()
    activity = _activity(admin_user, name="Ended", start=now - timedelta(hours=4), end=now - timedelta(hours=1))
    db_session.add(activity)
    db_session.commit()
    db_session.add_all([
        ActivityParticipant(activity_id=activity.id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=now),
        ActivityParticipant(activity_id=activity.id, user_id=second_user.id, display_nickname=second_user.nickname, display_avatar_url=second_user.avatar_url),
    ])
    db_session.commit()

    response = client.get("/api/v1/stats/ranking/activity", headers=user_headers)

    assert response.status_code == 200
    payload = response.json()
    assert [item["user_id"] for item in payload] == [normal_user.id]
    assert payload[0]["avatar_url"] == normal_user.avatar_url
    assert len(payload[0]["heatmap"]) == 84

    exhausted_page = client.get(
        "/api/v1/stats/ranking/activity?offset=1&limit=20",
        headers=user_headers,
    )
    assert exhausted_page.status_code == 200
    assert exhausted_page.json() == []

    invalid_page = client.get(
        "/api/v1/stats/ranking/activity?offset=0&limit=51",
        headers=user_headers,
    )
    assert invalid_page.status_code == 422


def test_pigeon_ranking_endpoint_orders_by_count_and_excludes_zero(client, db_session, admin_user, normal_user, second_user, user_headers) -> None:
    now = datetime.utcnow()
    activities = [_activity(admin_user, name=f"Ended {index}", start=now - timedelta(days=index + 2), end=now - timedelta(days=index + 1)) for index in range(3)]
    db_session.add_all(activities)
    db_session.commit()
    db_session.add_all([
        ActivityParticipant(activity_id=activities[0].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url),
        ActivityParticipant(activity_id=activities[1].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url),
        ActivityParticipant(activity_id=activities[2].id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url, checked_in_at=now),
        ActivityParticipant(activity_id=activities[0].id, user_id=second_user.id, display_nickname=second_user.nickname, display_avatar_url=second_user.avatar_url),
    ])
    db_session.commit()

    response = client.get("/api/v1/stats/ranking/pigeon", headers=user_headers)

    assert response.status_code == 200
    payload = response.json()
    assert [item["user_id"] for item in payload] == [normal_user.id, second_user.id]
    assert payload[0]["pigeon_count"] == 2
    assert payload[0]["avatar_url"] == normal_user.avatar_url
    assert all(item["pigeon_count"] > 0 for item in payload)


def test_combined_ranking_endpoint_is_not_exposed(client, user_headers) -> None:
    response = client.get("/api/v1/stats/ranking", headers=user_headers)

    assert response.status_code == 404


def test_history_summary_counts_only_ended_activities(client, db_session, admin_user, user_headers) -> None:
    now = datetime.utcnow()
    db_session.add_all([
        _activity(admin_user, name="Ended", start=now - timedelta(days=2), end=now - timedelta(days=1)),
        _activity(admin_user, name="Upcoming", start=now + timedelta(days=1), end=now + timedelta(days=1, hours=2), status="未开始"),
        _activity(admin_user, name="Cancelled", start=now - timedelta(days=2), end=now - timedelta(days=1), status="已取消"),
    ])
    db_session.commit()

    response = client.get("/api/v1/stats/history-summary", headers=user_headers)

    assert response.status_code == 200
    assert response.json() == {"ended_activity_count": 1}

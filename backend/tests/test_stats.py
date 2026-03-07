from datetime import datetime, timedelta

from app.models import Activity, ActivityParticipant


def test_history_stats_returns_pigeon_ranking(
    client,
    db_session,
    admin_user,
    normal_user,
    second_user,
    user_headers,
) -> None:
    ended_activity = Activity(
        name="已结束活动",
        status="已结束",
        remark="统计用",
        max_participants=10,
        start_time=datetime.utcnow() - timedelta(days=2),
        end_time=datetime.utcnow() - timedelta(days=2, hours=-2),
        signup_deadline=datetime.utcnow() - timedelta(days=3),
        location_name="统计球馆",
        location_address="统计地址",
        location_latitude=39.9042,
        location_longitude=116.4074,
        created_by=admin_user.id,
    )
    db_session.add(ended_activity)
    db_session.commit()
    db_session.refresh(ended_activity)

    db_session.add_all(
        [
            ActivityParticipant(
                activity_id=ended_activity.id,
                user_id=normal_user.id,
                nickname_snapshot=normal_user.nickname,
                avatar_url_snapshot=normal_user.avatar_url,
                checked_in_at=datetime.utcnow(),
                checkin_lat=39.9042,
                checkin_lng=116.4074,
            ),
            ActivityParticipant(
                activity_id=ended_activity.id,
                user_id=second_user.id,
                nickname_snapshot=second_user.nickname,
                avatar_url_snapshot=second_user.avatar_url,
            ),
        ]
    )
    db_session.commit()

    response = client.get("/api/v1/stats/history", headers=user_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["nickname"] == second_user.nickname
    assert body[0]["pigeon_count"] == 1


def test_bill_stats_returns_aggregated_amounts(
    client,
    sample_bill,
    sample_activity,
    user_headers,
) -> None:
    response = client.get("/api/v1/stats/bills", headers=user_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["activity_id"] == sample_activity.id
    assert body[0]["activity_name"] == sample_activity.name
    assert body[0]["total_amount"] == 120.0
    assert body[0]["participant_count"] == 2
    assert body[0]["avg_amount"] == 60.0

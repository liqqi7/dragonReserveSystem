from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy.orm import Session

from app.models import ActivityParticipant
from app.services.activity_service import _get_activity_query, _persist_activity_status, _sync_activity_status


@pytest.mark.parametrize("change", ["cancel", "reschedule"])
def test_stale_status_sync_cannot_overwrite_concurrent_user_edit(db_session, sample_activity, change):
    sample_activity.status = "未开始"
    db_session.commit()
    stale = db_session.scalar(_get_activity_query())
    now = stale.end_time + timedelta(hours=1)
    with Session(db_session.get_bind()) as writer:
        current = writer.get(type(stale), stale.id)
        if change == "cancel":
            current.status = "已取消"
        else:
            current.start_time = now + timedelta(days=1)
            current.end_time = now + timedelta(days=1, hours=2)
        writer.commit()
    assert not _persist_activity_status(db_session, stale, now)
    db_session.commit()
    assert stale.status == ("已取消" if change == "cancel" else "未开始")
    if change == "reschedule":
        assert stale.start_time == now + timedelta(days=1)


def test_status_cas_updates_a_matching_snapshot(db_session, sample_activity):
    sample_activity.status = "未开始"
    db_session.commit()
    assert _persist_activity_status(db_session, sample_activity, sample_activity.end_time + timedelta(hours=1))
    db_session.commit()
    db_session.refresh(sample_activity)
    assert sample_activity.status == "已结束"


@pytest.mark.parametrize("detail", [False, True])
def test_api_exposes_participant_locations_to_all_viewers(client, db_session, signed_up_activity,
                                                  user_headers, second_user_headers, admin_headers,
                                                  detail):
    participant = signed_up_activity.participants[0]
    participant.checkin_lat = 31.234
    participant.checkin_lng = 121.456
    participant.checkin_location_name = "私人位置"
    participant.checkin_address = "私人地址"
    db_session.commit()
    path = f"/api/v2/activities" + (f"/{signed_up_activity.id}" if detail else "")
    for headers in (None, second_user_headers, user_headers, admin_headers):
        response = client.get(path, headers=headers)
        assert response.status_code == 200, response.text
        activity = response.json() if detail else response.json()[0]
        data = activity["participants"][0]
        assert data["checkin_lat"] == 31.234
        assert data["checkin_lng"] == 121.456
        assert data["checkin_location_name"] == "私人位置"
        assert data["checkin_address"] == "私人地址"
        assert data["user_id"] == participant.user_id
    db_session.refresh(participant)
    assert participant.checkin_address == "私人地址"  # filtering must not dirty the ORM record


def test_non_admin_creator_can_see_participant_locations(client, db_session, sample_activity,
                                                        normal_user, second_user, user_headers):
    sample_activity.created_by = normal_user.id
    db_session.add(ActivityParticipant(activity_id=sample_activity.id, user_id=second_user.id,
                                       display_nickname=second_user.nickname, display_avatar_url="",
                                       checkin_lat=31.2, checkin_address="管理可见"))
    db_session.commit()
    response = client.get(f"/api/v2/activities/{sample_activity.id}", headers=user_headers)
    assert response.status_code == 200, response.text
    assert response.json()["participants"][0]["checkin_address"] == "管理可见"


@pytest.mark.parametrize("status,offset,participants,expected", [
    ("未开始", -1, 0, "未开始"),
    ("未开始", 0, 0, "已流局"),
    ("未开始", 0, 2, "已流局"),
    ("未开始", 0, 3, "进行中"),
    ("进行中", 2, 3, "已结束"),
    ("已取消", 1, 3, "已取消"),
    ("已流局", 3, 3, "已流局"),
])
def test_status_branch_cleanup_preserves_time_and_participant_boundaries(status, offset, participants, expected):
    start = datetime(2026, 10, 18, 10)
    activity = SimpleNamespace(
        status=status, start_time=start, end_time=start + timedelta(hours=2),
        participants=[object() for _ in range(participants)],
    )
    assert _sync_activity_status(activity, start + timedelta(hours=offset)) is (status != expected)
    assert activity.status == expected

from datetime import timedelta

import pytest

from app.models import Activity
from app.models.activity import ActivityParticipantSubItem
from app.services.activity_service import _app_now
from sqlalchemy import select


def create(client, headers, **changes):
    start = _app_now() + timedelta(days=2)
    payload = dict(name="子项目测试", remark="说明" * 100, start_time=start.isoformat(),
                   end_time=(start + timedelta(hours=2)).isoformat(),
                   activity_cover_id="aleksey-rico-001", max_participants=16,
                   sub_items=[dict(name=" 桌游 ", max_participants=1),
                              dict(name="聚餐", max_participants=2)])
    payload.update(changes)
    return client.post("/api/v2/activities", headers=headers, json=payload)


def signup(client, headers, activity, ids):
    return client.post(f"/api/v2/activities/{activity['id']}/signup", headers=headers,
                       json={"sub_item_ids": ids})


def test_multi_signup_counts_and_whole_exit(client, admin_headers, user_headers, db_session):
    response = create(client, admin_headers)
    assert response.status_code == 201, response.text
    activity = response.json()
    assert activity["participants"] == []
    assert activity["sub_items"][0]["name"] == "桌游"
    ids = [item["id"] for item in activity["sub_items"]]
    response = signup(client, user_headers, activity, ids)
    assert response.status_code == 200, response.text
    assert set(response.json()["sub_item_ids"]) == set(ids)
    detail = client.get(f"/api/v2/activities/{activity['id']}", headers=user_headers).json()
    assert len(detail["participants"]) == 1
    assert all(item["current_participants"] == 1 and item["signed_up"] for item in detail["sub_items"])
    anonymous = client.get(f"/api/v2/activities/{activity['id']}").json()
    assert not any(item["signed_up"] for item in anonymous["sub_items"])
    pid = response.json()["participant_id"]
    response = client.delete(f"/api/v2/activities/{activity['id']}/participants/{pid}", headers=user_headers)
    assert response.status_code == 204
    assert db_session.scalars(select(ActivityParticipantSubItem)).all() == []
    assert signup(client, user_headers, activity, ids).status_code == 200


@pytest.mark.parametrize("selection", [[], [999999], ["duplicate"]])
def test_invalid_selection_is_atomic(client, admin_headers, user_headers, selection):
    activity = create(client, admin_headers).json()
    if selection == ["duplicate"]:
        selection = [activity["sub_items"][0]["id"]] * 2
    assert signup(client, user_headers, activity, selection).status_code == 422
    assert client.get(f"/api/v2/activities/{activity['id']}").json()["participants"] == []


def test_full_subitem_and_edit_guards(client, admin_headers, user_headers, second_user_headers):
    activity = create(client, admin_headers).json()
    ids = [item["id"] for item in activity["sub_items"]]
    assert signup(client, user_headers, activity, ids).status_code == 200
    assert signup(client, second_user_headers, activity, ids).status_code == 422
    assert signup(client, second_user_headers, activity, [ids[1]]).status_code == 200
    url = f"/api/v2/activities/{activity['id']}"
    assert client.patch(url, headers=admin_headers, json={"sub_items": []}).status_code == 422
    items = [dict(id=item["id"], name=item["name"], max_participants=1) for item in activity["sub_items"]]
    assert client.patch(url, headers=admin_headers, json={"sub_items": items}).status_code == 422
    assert client.patch(url, headers=admin_headers, json={"max_participants": 1}).status_code == 422


@pytest.mark.parametrize("items", [[dict(name=" ", max_participants=2)], [dict(name="项目", max_participants=2)] * 5])
def test_project_input_limits(client, admin_headers, items):
    assert create(client, admin_headers, sub_items=items).status_code == 422


def test_cross_activity_selection_and_edit(client, admin_headers, user_headers):
    first = create(client, admin_headers).json()
    second = create(client, admin_headers).json()
    foreign_id = second["sub_items"][0]["id"]
    assert signup(client, user_headers, first, [foreign_id]).status_code == 422
    assert client.patch(f"/api/v2/activities/{first['id']}", headers=admin_headers,
                        json={"sub_items": [dict(id=foreign_id, name="外部", max_participants=2)]}).status_code == 422


def test_old_deadline_ignored_and_start_boundary(client, admin_headers, user_headers, second_user_headers, db_session, monkeypatch):
    activity = create(client, admin_headers).json()
    stored = db_session.get(Activity, activity["id"])
    now = _app_now()
    stored.signup_deadline = now - timedelta(hours=1)
    stored.start_time = now + timedelta(seconds=1)
    db_session.commit()
    monkeypatch.setattr("app.services.activity_service._app_now", lambda: now)
    assert signup(client, user_headers, activity, [activity["sub_items"][1]["id"]]).status_code == 200
    monkeypatch.setattr("app.services.activity_service._app_now", lambda: now + timedelta(seconds=1))
    assert signup(client, second_user_headers, activity, [activity["sub_items"][1]["id"]]).status_code == 422


def test_single_project_preserves_creator_signup(client, admin_headers):
    activity = create(client, admin_headers, sub_items=[]).json()
    assert len(activity["participants"]) == 1
    assert activity["sub_items"] == []

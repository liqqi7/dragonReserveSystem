"""Regression tests for review items 19, 20, 21 and 27."""
from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, IntegrationError, ValidationAppError
from app.models import Activity, User
from app.models.activity import ActivitySubItem, ActivityParticipantSubItem
from app.schemas.auth import WeChatLoginRequest
from app.services import auth_service, activity_share_preview_service as preview
from app.services.activity_service import signup_activity


@pytest.mark.parametrize("field", ["name", "remark", "start_time", "end_time", "signup_enabled", "location_name", "location_address"])
def test_patch_required_fields_reject_null(client, admin_headers, sample_activity, field):
    response = client.patch(f"/api/v2/activities/{sample_activity.id}",
                            headers=admin_headers, json={field: None})
    assert response.status_code == 422, response.text


def test_patch_nullable_fields_can_be_cleared(client, admin_headers, sample_activity):
    response = client.patch(f"/api/v2/activities/{sample_activity.id}", headers=admin_headers,
                            json={"max_participants": None, "location_latitude": None, "location_longitude": None})
    assert response.status_code == 200, response.text
    for key in ("max_participants", "location_latitude", "location_longitude"):
        assert response.json()[key] is None


@pytest.mark.parametrize("status", ["已结束", "已取消", "已流局"])
def test_terminal_activity_precedes_project_validation(db_session, sample_activity, normal_user, status):
    sample_activity.status = status
    db_session.commit()
    with pytest.raises(ValidationAppError, match="cancelled" if status == "已取消" else status):
        signup_activity(db_session, sample_activity, normal_user, [9999])


def test_duplicate_signup_precedes_full_project(db_session, signed_up_activity, normal_user):
    item = ActivitySubItem(activity_id=signed_up_activity.id, name="满员项目", max_participants=1, sort_order=0)
    db_session.add(item)
    db_session.flush()
    participant = signed_up_activity.participants[0]
    db_session.add(ActivityParticipantSubItem(activity_id=signed_up_activity.id, participant_id=participant.id,
                                             sub_item_id=item.id, user_id=normal_user.id))
    db_session.commit()
    with pytest.raises(ConflictError, match="already signed up"):
        signup_activity(db_session, signed_up_activity, normal_user, [item.id])


def test_expired_signup_precedes_project_validation(db_session, sample_activity, normal_user):
    sample_activity.start_time = datetime(2020, 1, 1)
    db_session.commit()
    with pytest.raises(ValidationAppError, match="deadline"):
        signup_activity(db_session, sample_activity, normal_user, [9999])


@pytest.mark.parametrize("content", [b"not json", b"[]", b"null", b'"text"'])
def test_wechat_bad_response_is_integration_error(monkeypatch, content):
    monkeypatch.setattr(auth_service, "get_settings", lambda: SimpleNamespace(
        wechat_app_id="id", wechat_app_secret="secret", wechat_code2session_url="https://example.test"))
    monkeypatch.setattr(auth_service.httpx, "get", lambda *a, **kw: httpx.Response(
        200, content=content, request=httpx.Request("GET", "https://example.test")))
    with pytest.raises(IntegrationError):
        auth_service.exchange_wechat_code("code")


def test_racing_first_login_recovers_unique_openid(db_session, monkeypatch):
    existing = User(wechat_openid="same-openid", nickname="原昵称", avatar_url="", role="guest")
    db_session.add(existing)
    db_session.commit()
    existing_id = existing.id
    original_scalar = db_session.scalar
    first = True
    def stale_initial_lookup(statement, *args, **kwargs):
        nonlocal first
        if first:
            first = False
            return None  # The initial query ran before the other login committed.
        return original_scalar(statement, *args, **kwargs)
    monkeypatch.setattr(db_session, "scalar", stale_initial_lookup)
    monkeypatch.setattr(auth_service, "exchange_wechat_code", lambda code: {"openid": "same-openid"})
    user = auth_service.login_or_register_wechat_user(db_session, WeChatLoginRequest(code="code"))
    assert user.id == existing_id and user.nickname == "原昵称"
    assert len(db_session.scalars(select(User).where(User.wechat_openid == "same-openid")).all()) == 1


def test_unrelated_integrity_error_is_not_swallowed(db_session, monkeypatch):
    monkeypatch.setattr(auth_service, "exchange_wechat_code", lambda code: {"openid": "new-openid"})
    def broken_commit():
        raise IntegrityError("insert", {}, Exception("other constraint"))
    monkeypatch.setattr(db_session, "commit", broken_commit)
    with pytest.raises(IntegrityError):
        auth_service.login_or_register_wechat_user(db_session, WeChatLoginRequest(code="code"))


def test_preview_render_has_no_open_read_transaction_and_discards_stale_result(db_session, sample_activity, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    real_render = preview._render_share_preview
    sessions = []
    class TrackedSession(Session):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            sessions.append(self)
    monkeypatch.setattr(preview, "Session", TrackedSession)
    activity_id = sample_activity.id
    bind = db_session.get_bind()
    db_session.rollback()
    def render_with_newer_edit(target, activity, source):
        assert all(not session.in_transaction() for session in sessions)
        with Session(bind=bind) as newer:
            current = newer.get(Activity, activity_id)
            current.location_name = "更新的地点"
            newer.commit()
        real_render(target, activity, source)
    monkeypatch.setattr(preview, "_render_share_preview", render_with_newer_edit)
    preview.refresh_activity_share_preview_in_background(bind, activity_id)
    db_session.expire_all()
    current = db_session.get(Activity, activity_id)
    assert current.location_name == "更新的地点"
    assert current.share_preview_file is None  # The older render cannot overwrite this edit.
    monkeypatch.setattr(preview, "_render_share_preview", real_render)
    preview.refresh_activity_share_preview_in_background(bind, activity_id)
    db_session.expire_all()
    assert preview.read_activity_share_preview(db_session.get(Activity, activity_id)).status == "ready"


def test_missing_cover_asset_does_not_block_edit(client, admin_headers, sample_activity, monkeypatch):
    monkeypatch.setattr(preview, "get_activity_cover_source_path", lambda cover: None)
    response = client.patch(f"/api/v2/activities/{sample_activity.id}", headers=admin_headers,
                            json={"name": "成功保存"})
    assert response.status_code == 200, response.text
    assert client.get(f"/api/v2/activities/{sample_activity.id}").json()["name"] == "成功保存"


def test_unchanged_preview_inputs_do_not_render(client, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    start = datetime(2027, 1, 1, 12)
    response = client.post("/api/v2/activities", headers=admin_headers, json={
        "name": "缓存测试", "remark": "旧备注", "activity_cover_id": "aleksey-rico-001",
        "start_time": start.isoformat(), "end_time": "2027-01-01T13:00:00",
        "location_name": "场地", "location_address": "地址",
    })
    assert response.status_code == 201
    activity_id = response.json()["id"]
    old_url = client.get(f"/api/v2/activities/{activity_id}").json()["share_preview_image_url"]
    assert old_url
    def unexpected_render(*args):
        pytest.fail("Unchanged preview inputs must not render again")
    monkeypatch.setattr(preview, "_render_share_preview", unexpected_render)
    response = client.patch(f"/api/v2/activities/{activity_id}", headers=admin_headers, json={"remark": "新备注"})
    assert response.status_code == 200 and response.json()["share_preview_image_url"] == old_url


def test_safe_log_path_escapes_controls_without_changing_normal_path():
    from app.core.logging import safe_log_path

    assert safe_log_path("/api/v2/activities") == "/api/v2/activities"
    assert safe_log_path("/fake\nclient_diagnostic forged") == "/fake\\x0aclient_diagnostic forged"
    assert safe_log_path("/fake\x7fpath") == "/fake\\x7fpath"

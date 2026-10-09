"""Contract checks for the small shared backend primitives."""

from types import SimpleNamespace

import pytest

from app.api.v1.diagnostics import _build_record
from app.models import Activity
from app.schemas.diagnostic import ClientDiagnosticLogRequest
from app.services.activity_service import _find_participant
from app.utils import activity_status as status, media


def test_activity_status_groups_preserve_business_labels():
    assert status.TERMINAL_ACTIVITY_STATUSES == {"已结束", "已取消", "已流局"}
    assert status.ACTIVE_ACTIVITY_STATUSES == {"未开始", "进行中"}
    assert status.RETROACTIVE_CHECKIN_STATUSES == {"进行中", "已结束"}
    assert status.CANCELLED_ACTIVITY_STATUSES == ("已取消", "已流局")
    assert Activity.__table__.c.status.default.arg == "进行中"


@pytest.mark.parametrize("authenticated", [False, True])
def test_diagnostic_record_uses_normalized_fields_and_server_identity(authenticated):
    event = ClientDiagnosticLogRequest.model_validate({
        "event": "home_media_attempt", "traceId": "trace", "sessionId": "session",
        "page": "home", "level": "warn", "clientVersion": "1", "baseLibVersion": "3",
        "systemType": "ios", "payload": {"nested": {"value": 7}},
        "user_id": 999, "user_role": "admin",
    })
    user = SimpleNamespace(id=42, role="user") if authenticated else None
    record = _build_record(event, user)
    assert record == {
        "user_id": 42 if authenticated else None, "user_role": "user" if authenticated else "anonymous",
        "event": "home_media_attempt", "trace_id": "trace", "session_id": "session",
        "page": "home", "level": "warn", "client_version": "1", "base_lib_version": "3",
        "system_type": "ios", "payload": {"nested": {"value": 7}},
    }


@pytest.mark.parametrize("relative", [False, True])
def test_media_root_resolves_without_creating_directories(monkeypatch, tmp_path, relative):
    monkeypatch.chdir(tmp_path)
    path = "media/not-created" if relative else str(tmp_path / "absolute/not-created")
    monkeypatch.setattr(media, "get_settings", lambda: SimpleNamespace(media_root=path))
    resolved = media.resolve_media_root()
    assert resolved == (tmp_path / path).resolve()
    assert not resolved.exists()


def test_participant_lookup_keeps_activity_scope(db_session, signed_up_activity, normal_user):
    activity_id = signed_up_activity.id
    participant = _find_participant(db_session, activity_id, user_id=normal_user.id)
    assert participant is not None
    assert _find_participant(db_session, activity_id, participant_id=participant.id) is participant
    assert _find_participant(db_session, activity_id + 1, participant_id=participant.id) is None
    assert _find_participant(db_session, activity_id + 1, user_id=normal_user.id) is None
    assert _find_participant(db_session, activity_id, participant_id=0) is None
    for identities in ({}, {"participant_id": participant.id, "user_id": normal_user.id}):
        with pytest.raises(ValueError, match="exactly one"):
            _find_participant(db_session, activity_id, **identities)

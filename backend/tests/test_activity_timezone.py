from datetime import datetime
from types import SimpleNamespace

from app.schemas.activity_v2 import ActivityCreateV2Request, ActivityUpdateV2Request
from app.services.activity_service import _sync_activity_status


BASE = {
    "name": "时间测试",
    "remark": "用于验证时区",
    "start_time": "2026-10-18T10:00:00",
    "end_time": "2026-10-18T12:00:00",
}


def test_v2_create_converts_aware_datetimes_to_shanghai_naive():
    data = {**BASE, "start_time": "2026-10-18T10:00:00Z", "end_time": "2026-10-18T20:00:00+08:00", "activity_cover_id": "aleksey-rico-001"}
    model = ActivityCreateV2Request.model_validate(data)
    assert model.start_time == datetime(2026, 10, 18, 18)
    assert model.end_time == datetime(2026, 10, 18, 20)


def test_update_normalizes_aware_and_naive_mixed_time_fields():
    model = ActivityUpdateV2Request.model_validate({
        "start_time": "2026-10-18T10:00:00Z",
        "end_time": "2026-10-18T20:00:00",
    })
    assert model.start_time == datetime(2026, 10, 18, 18)
    assert model.end_time == datetime(2026, 10, 18, 20)


def test_v2_create_compares_mixed_timezone_inputs_safely():
    v2 = ActivityCreateV2Request.model_validate({**BASE, "start_time": "2026-10-18T10:00:00Z", "end_time": "2026-10-18T19:00:00", "activity_cover_id": "aleksey-rico-001"})
    assert v2.start_time == datetime(2026, 10, 18, 18)
    assert v2.end_time == datetime(2026, 10, 18, 19)


def test_status_sync_accepts_aware_activity_datetimes():
    activity = SimpleNamespace(
        status="未开始",
        start_time=datetime.fromisoformat("2026-10-18T10:00:00+00:00"),
        end_time=datetime.fromisoformat("2026-10-18T12:00:00+00:00"),
        participants=[object(), object(), object()],
    )
    assert _sync_activity_status(activity, datetime(2026, 10, 18, 19)) is True
    assert activity.status == "进行中"

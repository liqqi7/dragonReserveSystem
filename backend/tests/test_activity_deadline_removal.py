from datetime import timedelta

import pytest
from pydantic import ValidationError

from app.models import Activity
from app.schemas.activity_v2 import (
    ActivityCreateV2Request, ActivityUpdateV2Request, ActivityV2Response, ActivityDetailV2Response,
)
from app.services.activity_service import _app_now


@pytest.mark.parametrize("model", [
    ActivityCreateV2Request, ActivityUpdateV2Request, ActivityV2Response, ActivityDetailV2Response,
])
def test_activity_schemas_do_not_expose_independent_deadline(model):
    assert "signup_deadline" not in model.model_fields
    assert "signup_deadline" not in model.model_json_schema()["properties"]


def payload():
    start = _app_now() + timedelta(days=2)
    return {
        "name": "Deadline",
        "remark": "Start time controls signup",
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=2)).isoformat(),
        "activity_cover_id": "aleksey-rico-001",
    }


@pytest.mark.parametrize("model", [ActivityCreateV2Request, ActivityUpdateV2Request])
@pytest.mark.parametrize("old_value", [None, "2026-10-18T09:00:00"])
def test_v2_deadline_is_an_unsupported_extra_field(model, old_value):
    data = payload() if model is ActivityCreateV2Request else {}
    with pytest.raises(ValidationError) as exc:
        model.model_validate({**data, "signup_deadline": old_value})
    assert any(error["loc"] == ("signup_deadline",) and error["type"] == "extra_forbidden"
               for error in exc.value.errors())


def test_activity_api_omits_removed_columns(
    client, db_session, admin_headers, monkeypatch,
):
    module = "app.api.v2.activities"
    monkeypatch.setattr(f"{module}.refresh_activity_share_preview_in_background", lambda *args: None)
    monkeypatch.setattr(f"{module}.refresh_activity_weather_in_background", lambda *args: None)
    url = "/api/v2/activities"
    response = client.post(url, headers=admin_headers, json=payload())
    assert response.status_code == 201
    assert "signup_deadline" not in response.json()
    activity_id = response.json()["id"]
    stored = db_session.get(Activity, activity_id)
    removed = {"signup_deadline", "activity_type", "activity_style_key"}
    assert removed.isdisjoint(Activity.__table__.columns.keys())
    assert all(not hasattr(stored, column) for column in removed)

    listing = client.get(url, headers=admin_headers)
    assert listing.status_code == 200
    assert all("signup_deadline" not in item for item in listing.json())
    detail = client.get(f"{url}/{activity_id}", headers=admin_headers)
    assert detail.status_code == 200
    assert "signup_deadline" not in detail.json()
    updated = client.patch(f"{url}/{activity_id}", headers=admin_headers, json={"remark": "Updated"})
    assert updated.status_code == 200
    assert "signup_deadline" not in updated.json()
    db_session.refresh(stored)
    assert stored.remark == "Updated"
    assert "activity_type" not in updated.json()
    assert "activity_style_key" not in updated.json()


def test_openapi_has_no_activity_deadline_field(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schemas = response.json()["components"]["schemas"]
    for name, schema in schemas.items():
        if name.startswith("Activity"):
            assert "signup_deadline" not in schema.get("properties", {}), name

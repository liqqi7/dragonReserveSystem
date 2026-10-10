"""Logging changes must not leak credentials or change authentication behavior."""

import logging

import httpx
from fastapi import Request

from app.api import deps
from app.core.logging import request_context
from app.services import amap_service


def test_request_context_does_not_collect_query_or_headers():
    request = Request({
        "type": "http", "method": "GET", "path": "/api/v1/users/me",
        "query_string": b"token=private-query",
        "headers": [(b"authorization", b"Bearer private-token")],
    })
    context = request_context(request)
    assert context["path"] == "/api/v1/users/me"
    assert context["trace_id"]
    assert "private-" not in str(context)
    assert "query" not in context


def test_optional_invalid_token_is_silent_and_still_anonymous(monkeypatch, caplog):
    def fail(_):
        raise ValueError("private-token")

    monkeypatch.setattr(deps, "decode_access_token", fail)
    with caplog.at_level(logging.DEBUG, logger=deps.logger.name):
        assert deps.get_optional_current_user("private-token", db=None) is None
    assert not caplog.records


def test_optional_user_lookup_only_logs_exception_type(monkeypatch, caplog):
    from types import SimpleNamespace

    monkeypatch.setattr(deps, "decode_access_token", lambda _: SimpleNamespace(sub="42"))

    def fail(*_):
        raise RuntimeError("private-database-row")

    monkeypatch.setattr(deps, "get_user_by_id", fail)
    with caplog.at_level(logging.WARNING, logger=deps.logger.name):
        assert deps.get_optional_current_user("token", db=None) is None
    text = caplog.text
    assert "optional_user_lookup_failed error_type=RuntimeError" in text
    assert "private-" not in text
    assert "user_id" not in text


def test_amap_failure_logs_no_coordinates_key_or_upstream_url(monkeypatch, caplog):
    from types import SimpleNamespace

    monkeypatch.setattr(amap_service, "get_settings", lambda: SimpleNamespace(
        amap_web_service_key="private-key", amap_timeout_seconds=5,
        amap_regeocode_url="https://test/regeo",
    ))

    def fail(*_, **__):
        raise httpx.ConnectError("https://test/regeo?key=private-key&location=120,30")

    monkeypatch.setattr(amap_service.httpx, "get", fail)
    with caplog.at_level(logging.WARNING):
        assert amap_service.reverse_geocode(lat=30, lng=120).location_name is None
    assert "amap_reverse_geocode_unavailable error_type=ConnectError" in caplog.text
    assert "private-key" not in caplog.text
    assert all(not hasattr(record, "lat") and not hasattr(record, "lng") for record in caplog.records)


def test_invite_audit_correlates_without_code_or_ip(client, user_headers, caplog):
    with caplog.at_level(logging.WARNING, logger="dragon.reserve"):
        response = client.post("/api/v1/users/me/role", json={"invite_code": "private-invalid-code"},
                               headers={**user_headers, "X-Request-Id": "req-invite-policy"})
    assert response.status_code == 422
    records = [record.message for record in caplog.records if record.message.startswith("role_invite_request ")]
    assert len(records) == 1
    assert "trace_id=req-invite-policy" in records[0]
    assert "outcome=invalid" in records[0]
    assert "private-" not in records[0]
    assert "ip=" not in records[0]

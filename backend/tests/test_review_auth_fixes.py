from collections import defaultdict, deque

import pytest
from fastapi import FastAPI, HTTPException
from pydantic import ValidationError

from app.api.v1 import users
from app.api.v1.auth import router as auth_router
from app.core.config import Settings


def test_auth_exposes_only_wechat_login():
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")
    paths = app.openapi()["paths"]
    assert "/api/v1/auth/wechat-login" in paths
    assert "/api/v1/auth/login" not in paths
    assert "/api/v1/auth/register" not in paths


def test_role_invite_limited_by_user_even_if_resetting_role(client, user_headers, monkeypatch, caplog):
    monkeypatch.setattr(users, "_invite_attempts", defaultdict(deque))
    for _ in range(5):
        response = client.post("/api/v1/users/me/role", headers=user_headers,
                               json={"invite_code": "不得写入日志的错误邀请码"})
        assert response.status_code == 422
    assert client.delete("/api/v1/users/me/role", headers=user_headers).status_code == 200
    response = client.post("/api/v1/users/me/role", headers=user_headers, json={"invite_code": "bad"})
    assert response.status_code == 429
    assert "不得写入日志的错误邀请码" not in caplog.text
    assert "outcome=invalid" in caplog.text
    assert "outcome=limited" in caplog.text


def test_invite_rate_limit_by_ip_and_expires(monkeypatch):
    monkeypatch.setattr(users, "_invite_attempts", defaultdict(deque))
    clock = [1000.0]
    monkeypatch.setattr(users, "monotonic", lambda: clock[0])
    for user_id in range(20):
        users._check_invite_rate_limit(user_id, "same-ip")
    with pytest.raises(HTTPException) as error:
        users._check_invite_rate_limit(21, "same-ip")
    assert error.value.status_code == 429
    clock[0] += 3600
    users._check_invite_rate_limit(21, "same-ip")
    assert len(users._invite_attempts["ip:same-ip"]) == 1


def _production_settings(**extra):
    values = dict(APP_ENV="production", database_url="mysql+pymysql://u:secure@localhost/db",
                  jwt_secret_key="strong-jwt-secret-123", user_invite_code="user-code-1234567890",
                  admin_invite_code="admin-code-1234567890", _env_file=None)
    values.update(extra)
    return Settings(**values)


def test_production_invite_codes_have_no_minimum_length_but_must_differ():
    assert _production_settings(admin_invite_code="short", user_invite_code="u").environment == "production"
    with pytest.raises(ValidationError):
        _production_settings(admin_invite_code="same", user_invite_code="same")


def test_concurrent_invite_attempts_cannot_bypass_user_limit(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    monkeypatch.setattr(users, "_invite_attempts", defaultdict(deque))
    def attempt(_):
        try:
            users._check_invite_rate_limit(1, "same-ip")
            return True
        except HTTPException:
            return False
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(attempt, range(30)))
    assert sum(results) == 5

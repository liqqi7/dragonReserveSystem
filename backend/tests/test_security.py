from pathlib import Path
from datetime import datetime, timedelta, timezone
import subprocess
import sys
from textwrap import dedent

import pytest
from jose import JWTError, jwt

from app.core.config import Settings
from app.core import security
from app.core.security import create_access_token, decode_access_token


@pytest.mark.parametrize("role", ["admin", "user", "guest"])
def test_access_token_round_trip(role: str) -> None:
    token = create_access_token(subject="42", role=role)
    payload = decode_access_token(token)

    assert payload.sub == "42"
    assert payload.role == role
    assert payload.exp > 0


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token(subject="42", role="user", expires_minutes=-1)

    with pytest.raises(JWTError):
        decode_access_token(token)


@pytest.fixture
def legacy_jwt_settings(monkeypatch):
    settings = Settings(
        _env_file=None, APP_ENV="production",
        database_url="mysql+pymysql://service:secure@database/db",
        jwt_secret_key="legacy-test-change-me", allow_legacy_jwt_secret=True,
        user_invite_code="user-code", admin_invite_code="admin-code",
    )
    monkeypatch.setattr(security, "settings", settings)
    return settings


@pytest.mark.parametrize("role", ["admin", "user", "guest"])
def test_pre_release_token_remains_valid_with_legacy_key_opt_in(legacy_jwt_settings, role):
    secret = legacy_jwt_settings.jwt_secret_key
    # Old deployments signed tokens directly with the unchanged configured key.
    old_token = jwt.encode(
        {"sub": "42", "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        secret,
        algorithm="HS256",
    )

    payload = decode_access_token(old_token)
    assert (payload.sub, payload.role) == ("42", role)
    new_token = create_access_token("42", role)
    assert jwt.decode(new_token, secret, algorithms=["HS256"])["sub"] == "42"

    expired = jwt.encode(
        {"sub": "42", "role": role, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        secret, algorithm="HS256",
    )
    forged = jwt.encode(
        {"sub": "42", "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        "different-key", algorithm="HS256",
    )
    for invalid in (expired, forged):
        with pytest.raises(JWTError):
            decode_access_token(invalid)


def test_pre_release_token_authenticates_existing_user(client, normal_user, legacy_jwt_settings):
    old_token = jwt.encode(
        {"sub": str(normal_user.id), "role": normal_user.role,
         "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        legacy_jwt_settings.jwt_secret_key, algorithm="HS256",
    )
    response = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {old_token}"})
    assert response.status_code == 200
    assert response.json()["id"] == normal_user.id


def test_application_import_and_tokens_do_not_require_password_packages() -> None:
    code = dedent("""
        import builtins

        original_import = builtins.__import__

        def without_password_packages(name, *args, **kwargs):
            if name.split('.')[0] in {'passlib', 'bcrypt'}:
                raise ModuleNotFoundError(name)
            return original_import(name, *args, **kwargs)

        builtins.__import__ = without_password_packages
        from app.main import app
        from app.core.security import create_access_token, decode_access_token

        assert app is not None
        payload = decode_access_token(create_access_token('42', 'user'))
        assert payload.sub == '42'
        assert payload.role == 'user'
    """)
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr

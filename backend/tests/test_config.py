import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_development_security_defaults():
    with pytest.raises(ValidationError, match="Production configuration is missing secure values"):
        Settings(
            _env_file=None,
            APP_ENV="production",
            database_url="sqlite:///./dragon_reserve_dev.db",
            jwt_secret_key="dev-only-change-me",
            user_invite_code="",
            admin_invite_code="",
        )


def test_non_sqlite_database_enforces_production_security_when_app_env_is_unset():
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(
            _env_file=None,
            APP_ENV="",
            database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
            jwt_secret_key="dev-only-change-me",
            user_invite_code="user-code",
            admin_invite_code="admin-code",
        )


def test_non_sqlite_database_uses_production_runtime_without_app_env():
    settings = Settings(
        _env_file=None,
        APP_ENV="development",
        database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
        jwt_secret_key="a-production-secret-that-is-not-a-default",
        user_invite_code="configured-user-code",
        admin_invite_code="configured-admin-code",
        debug=False,
    )

    assert settings.is_production_runtime is True


def test_production_accepts_explicit_secure_configuration():
    settings = Settings(
        _env_file=None,
        APP_ENV="production",
        database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
        jwt_secret_key="a-production-secret-that-is-not-a-default",
        user_invite_code="configured-user-code",
        admin_invite_code="configured-admin-code",
        debug=False,
    )

    assert settings.environment == "production"


def test_production_rejects_debug_mode():
    with pytest.raises(ValidationError, match="APP_DEBUG"):
        Settings(
            _env_file=None,
            APP_ENV="production",
            database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
            jwt_secret_key="a-production-secret-that-is-not-a-default",
            user_invite_code="configured-user-code",
            admin_invite_code="configured-admin-code",
            APP_DEBUG=True,
        )


def test_production_rejects_wildcard_cors_origin():
    with pytest.raises(ValidationError, match="CORS_WILDCARD"):
        Settings(
            _env_file=None,
            APP_ENV="production",
            database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
            jwt_secret_key="a-production-secret-that-is-not-a-default",
            user_invite_code="configured-user-code",
            admin_invite_code="configured-admin-code",
            cors_origins=["*"],
        )


def _legacy_settings(**overrides):
    values = {
        "_env_file": None,
        "APP_ENV": "production",
        "database_url": "mysql+pymysql://service:strong-secret@database/dragon_reserve",
        "jwt_secret_key": "legacy-test-change-me",
        "user_invite_code": "configured-user-code",
        "admin_invite_code": "configured-admin-code",
        "allow_legacy_jwt_secret": True,
        "APP_DEBUG": False,
        "cors_origins": [],
    }
    return Settings(**{**values, **overrides})


@pytest.mark.parametrize("environment", ["production", "development", ""])
def test_legacy_jwt_key_requires_explicit_opt_in(environment):
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        _legacy_settings(APP_ENV=environment, allow_legacy_jwt_secret=False)

    settings = _legacy_settings(APP_ENV=environment)
    assert settings.jwt_secret_key == "legacy-test-change-me"
    assert settings.is_production_runtime is True


@pytest.mark.parametrize("secret", ["", "   ", "dev-only-change-me"])
def test_legacy_jwt_opt_in_never_accepts_missing_or_builtin_key(secret):
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        _legacy_settings(jwt_secret_key=secret)


@pytest.mark.parametrize(("overrides", "error"), [
    ({"database_url": "mysql+pymysql://root:password@database/db"}, "DATABASE_URL"),
    ({"user_invite_code": ""}, "USER_INVITE_CODE"),
    ({"admin_invite_code": ""}, "ADMIN_INVITE_CODE"),
    ({"user_invite_code": "same", "admin_invite_code": "same"}, "INVITE_CODES_MUST_DIFFER"),
    ({"APP_DEBUG": True}, "APP_DEBUG"),
    ({"cors_origins": ["*"]}, "CORS_WILDCARD"),
])
def test_legacy_jwt_opt_in_does_not_bypass_other_security_checks(overrides, error):
    with pytest.raises(ValidationError, match=error):
        _legacy_settings(**overrides)


def test_legacy_jwt_opt_in_can_be_loaded_from_environment(monkeypatch):
    monkeypatch.setenv("ALLOW_LEGACY_JWT_SECRET", "true")
    settings = Settings(
        _env_file=None,
        APP_ENV="production",
        database_url="mysql+pymysql://service:strong-secret@database/dragon_reserve",
        jwt_secret_key="legacy-test-change-me",
        user_invite_code="configured-user-code",
        admin_invite_code="configured-admin-code",
    )
    assert settings.allow_legacy_jwt_secret is True


def test_legacy_jwt_warning_is_once_per_process_and_contains_no_secret(monkeypatch):
    import logging
    from unittest.mock import patch
    from app.core import config

    settings = _legacy_settings()
    monkeypatch.setattr(config, "Settings", lambda: settings)
    config.get_settings.cache_clear()
    try:
        with patch.object(logging.getLogger("dragon.reserve"), "warning") as warning:
            assert config.get_settings() is settings
            assert config.get_settings() is settings
            warning.assert_called_once_with(
                "legacy_jwt_secret_allowed existing_sessions_preserved=true security_risk_accepted=true"
            )
            assert settings.jwt_secret_key not in str(warning.call_args)
    finally:
        config.get_settings.cache_clear()

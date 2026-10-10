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

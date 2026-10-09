"""Application configuration."""

from functools import lru_cache
import os
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ — select env files explicitly so production commands never inherit test settings.
# This keeps WECHAT_* configuration available without relying on uvicorn --env-file.
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def _env_files() -> tuple[Path | str, ...]:
    # Only load test overrides when test mode is explicitly selected (from process env
    # or APP_ENV in the base .env); production commands must never inherit test settings.
    app_env = os.getenv("APP_ENV", "").strip().lower()
    if not app_env:
        env_file = _BACKEND_DIR / ".env"
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                key, separator, value = line.partition("=")
                if separator and key.strip().upper() == "APP_ENV":
                    app_env = value.strip().strip("\"\'").lower()
                    break
    if app_env == "test" and (_BACKEND_DIR / ".env.test").is_file():
        return (_BACKEND_DIR / ".env", _BACKEND_DIR / ".env.test")
    return (_BACKEND_DIR / ".env",)


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "Dragon Reserve Backend"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", validation_alias="APP_ENV")
    api_v1_prefix: str = "/api/v1"
    api_v2_prefix: str = "/api/v2"
    debug: bool = Field(default=False, validation_alias="APP_DEBUG")

    database_url: str = Field(
        default="sqlite:///./dragon_reserve_dev.db",
        description="SQLAlchemy database URL",
    )

    jwt_secret_key: str = Field(
        default="dev-only-change-me",
        description="JWT signing secret",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30
    checkin_radius_meters: int = 1000
    user_invite_code: str = ""
    admin_invite_code: str = ""
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    wechat_code2session_url: str = "https://api.weixin.qq.com/sns/jscode2session"
    qweather_developer_id: str = ""
    qweather_project_id: str = ""
    qweather_credential_id: str = ""
    qweather_api_host: str = "n46cdr3rep.re.qweatherapi.com"
    qweather_private_key_path: str = "secrets/qweather-ed25519-private.pem"
    qweather_timeout_seconds: float = 8.0
    qweather_refresh_far_hours: int = 12
    qweather_refresh_near_hours: int = 6
    qweather_air_refresh_near_hours: int = 3
    qweather_stale_max_hours: int = 24
    qweather_refresh_batch_size: int = 100
    amap_web_service_key: str = ""
    amap_regeocode_url: str = "https://restapi.amap.com/v3/geocode/regeo"
    amap_timeout_seconds: float = 5.0
    public_base_url: str = ""
    activity_cover_cdn_base_url: str = ""
    media_root: str = "storage"
    media_url_prefix: str = "/media"
    client_cache_version: str = Field(default="1", validation_alias="CLIENT_CACHE_VERSION")

    cors_origins: list[str] = Field(default_factory=list)

    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def reject_insecure_production_defaults(self) -> "Settings":
        if self.environment.strip().lower() != "production":
            return self
        insecure = {
            "DATABASE_URL": self.database_url.startswith("sqlite:") or "password@" in self.database_url,
            "JWT_SECRET_KEY": not self.jwt_secret_key or "change-me" in self.jwt_secret_key,
            "USER_INVITE_CODE": not self.user_invite_code,
            "ADMIN_INVITE_CODE": not self.admin_invite_code,
            "INVITE_CODES_MUST_DIFFER": self.admin_invite_code == self.user_invite_code,
            "APP_DEBUG": self.debug,
            "CORS_WILDCARD": "*" in self.cors_origins,
        }
        invalid = [name for name, failed in insecure.items() if failed]
        if invalid:
            raise ValueError(
                "Production configuration is missing secure values for: " + ", ".join(invalid)
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    s = Settings()
    env_test = _BACKEND_DIR / ".env.test"
    if env_test.is_file() and env_test.stat().st_size == 0:
        import logging

        logging.getLogger("dragon.reserve").warning(
            "backend/.env.test exists but is empty (0 bytes). Save the file in your editor or WECHAT_* will stay unset."
        )
    return s

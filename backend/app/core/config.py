"""Application configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "Dragon Reserve Backend"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    debug: bool = Field(default=False, validation_alias="APP_DEBUG")

    database_url: str = Field(
        default="mysql+pymysql://root:password@127.0.0.1:3306/dragon_reserve?charset=utf8mb4",
        description="SQLAlchemy database URL",
    )

    jwt_secret_key: str = Field(
        default="change-me-in-production",
        description="JWT signing secret",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    checkin_radius_meters: int = 1000
    user_invite_code: str = "dragon"
    admin_invite_code: str = "manage"
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    wechat_code2session_url: str = "https://api.weixin.qq.com/sns/jscode2session"

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()

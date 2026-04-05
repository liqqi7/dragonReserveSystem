"""Application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ — load .env then .env.test when present so WECHAT_* work without relying on
# uvicorn injecting --env-file into os.environ (unreliable on Windows + --reload).
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def _env_files() -> tuple[Path | str, ...]:
    paths: list[Path] = []
    for name in (".env", ".env.test"):
        p = _BACKEND_DIR / name
        if p.is_file():
            paths.append(p)
    return tuple(paths) if paths else (_BACKEND_DIR / ".env",)


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
    access_token_expire_minutes: int = 60 * 24 * 30
    checkin_radius_meters: int = 1000
    user_invite_code: str = "dragon"
    admin_invite_code: str = "manage"
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    wechat_code2session_url: str = "https://api.weixin.qq.com/sns/jscode2session"
    public_base_url: str = ""
    media_root: str = "storage"
    media_url_prefix: str = "/media"

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


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

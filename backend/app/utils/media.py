"""Resolve the configured media root consistently without creating directories."""

from pathlib import Path

from app.core.config import get_settings


def resolve_media_root() -> Path:
    return Path(get_settings().media_root).resolve()

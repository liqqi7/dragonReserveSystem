"""Persistence helpers for client diagnostic logs."""

from __future__ import annotations

import json
import logging
import re
from logging.handlers import RotatingFileHandler
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def _diagnostic_log_path() -> Path:
    """Keep client telemetry separate from application/security logs."""
    settings = get_settings()
    application_log = Path(getattr(settings, "application_log_file", "logs/application.log")).resolve()
    return application_log.with_name("client-diagnostics.log")


_DIAGNOSTIC_LOGGER_NAME = "dragon.reserve.client_diagnostics"
_DIAGNOSTIC_MAX_BYTES = 10 * 1024 * 1024
_DIAGNOSTIC_BACKUP_COUNT = 5


def _diagnostic_logger(path: Path) -> logging.Logger:
    path.parent.mkdir(parents=True, exist_ok=True)
    log = logging.getLogger(_DIAGNOSTIC_LOGGER_NAME)
    handler = next((h for h in log.handlers if getattr(h, "baseFilename", None) == str(path)), None)
    if handler is None:
        handler = RotatingFileHandler(
            path, maxBytes=_DIAGNOSTIC_MAX_BYTES, backupCount=_DIAGNOSTIC_BACKUP_COUNT,
            encoding="utf-8",
        )
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False
    return log


def sanitize_diagnostic(value, depth=0):
    """Defense in depth for both authenticated and anonymous ingestion."""
    if depth > 8:
        return "[truncated]"
    if isinstance(value, dict):
        return {str(key)[:100]: sanitize_diagnostic(item, depth + 1)
                for key, item in list(value.items())[:50]
                if not re.search(r"token|authorization|password|cookie|secret", str(key), re.I)}
    if isinstance(value, list):
        return [sanitize_diagnostic(item, depth + 1) for item in value[:64]]
    if isinstance(value, str):
        value = re.sub(r"Bearer\s+[^\s\"']+", "Bearer [redacted]", value, flags=re.I)
        return re.sub(r"(https?://[^\s?#\"']+)[?#][^\s\"']*", r"\1", value)[:2048]
    return value


def append_client_diagnostic_log(record: dict[str, Any]) -> Path:
    """Write one client event to a bounded, dedicated rotating log."""

    path = _diagnostic_log_path()
    enriched = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        **sanitize_diagnostic(record),
    }
    _diagnostic_logger(path).info("client_diagnostic %s", json.dumps(enriched, ensure_ascii=False, separators=(",", ":")))
    return path


def read_recent_client_diagnostic_logs(limit: int = 100) -> list[dict[str, Any]]:
    """Read the most recent client diagnostic log entries."""

    path = _diagnostic_log_path()
    if not path.exists():
        return []

    rows: deque[str] = deque(maxlen=max(1, min(limit, 500)))
    # Rotated files are numbered .1 (newest) through .5 (oldest).
    for source in [*reversed([path.with_name(f"{path.name}.{i}") for i in range(1, _DIAGNOSTIC_BACKUP_COUNT + 1)]), path]:
        if not source.exists():
            continue
        with source.open("r", encoding="utf-8") as handle:
            for line in handle:
                if "client_diagnostic " in line:
                    rows.append(line)

    result: list[dict[str, Any]] = []
    for line in rows:
        try:
            payload = line.split("client_diagnostic ", 1)[1].strip()
            result.append(json.loads(payload))
        except json.JSONDecodeError:
            continue
    return result

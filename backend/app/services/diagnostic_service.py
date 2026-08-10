"""Persistence helpers for client diagnostic logs."""

from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.logging import logger


def _diagnostic_log_path() -> Path:
    settings = get_settings()
    return Path(getattr(settings, "application_log_file", "logs/application.log")).resolve()


def append_client_diagnostic_log(record: dict[str, Any]) -> Path:
    """Write one client diagnostic event to the unified backend application log."""

    path = _diagnostic_log_path()
    enriched = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        **record,
    }
    logger.info("client_diagnostic %s", json.dumps(enriched, ensure_ascii=False, separators=(",", ":")))
    return path


def read_recent_client_diagnostic_logs(limit: int = 100) -> list[dict[str, Any]]:
    """Read the most recent client diagnostic log entries."""

    path = _diagnostic_log_path()
    if not path.exists():
        return []

    rows: deque[str] = deque(maxlen=max(1, min(limit, 500)))
    with path.open("r", encoding="utf-8") as handle:
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

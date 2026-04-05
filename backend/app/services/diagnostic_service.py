"""Persistence helpers for client diagnostic logs."""

from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def _diagnostic_log_path() -> Path:
    settings = get_settings()
    root = Path(settings.media_root).resolve() / "diagnostics"
    root.mkdir(parents=True, exist_ok=True)
    return root / "client_media_logs.jsonl"


def append_client_diagnostic_log(record: dict[str, Any]) -> Path:
    """Append one client diagnostic log line to local storage."""

    path = _diagnostic_log_path()
    enriched = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        **record,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(enriched, ensure_ascii=False))
        handle.write("\n")
    return path


def read_recent_client_diagnostic_logs(limit: int = 100) -> list[dict[str, Any]]:
    """Read the most recent client diagnostic log entries."""

    path = _diagnostic_log_path()
    if not path.exists():
        return []

    rows: deque[str] = deque(maxlen=max(1, min(limit, 500)))
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(line)

    result: list[dict[str, Any]] = []
    for line in rows:
        try:
            result.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return result

#!/usr/bin/env python3
"""List activities whose activity_style_key fails normalize_activity_style_key for its type."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _apply_env_file(path: Path, *, override: bool = True) -> None:
    text = path.read_text(encoding="utf-8")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if not key:
            continue
        if override or key not in os.environ:
            os.environ[key] = val


def run() -> int:
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models.activity import Activity
    from app.services.activity_type_style_service import (
        normalize_activity_style_key,
        normalize_activity_type_key,
    )

    db = SessionLocal()
    bad: list[tuple[int, str, str | None, str | None, str]] = []
    eating_default: list[tuple[int, str, str | None]] = []
    rows: list[Activity] = []
    try:
        rows = list(db.scalars(select(Activity).order_by(Activity.id.asc())).all())
        for a in rows:
            tk = normalize_activity_type_key(a.activity_type or "other") or "other"
            sk = (a.activity_style_key or "").strip() or None
            if tk == "eating" and sk == "eating-default":
                eating_default.append((a.id, a.status or "", a.name or ""))
            try:
                normalize_activity_style_key(tk, sk)
            except ValueError as e:
                bad.append((a.id, tk, a.activity_type, sk, str(e)))
    finally:
        db.close()

    print(f"activities scanned: {len(rows)}", flush=True)
    print(f"eating + style_key 'eating-default': {len(eating_default)}", flush=True)
    for tid, st, name in eating_default:
        print(f"  id={tid} status={st!r} name={name!r}", flush=True)
    print(f"rows failing style normalize: {len(bad)}", flush=True)
    for tid, tk, raw_type, sk, err in bad:
        print(
            f"  id={tid} normalized_type={tk!r} raw_type={raw_type!r} "
            f"activity_style_key={sk!r} -> {err}",
            flush=True,
        )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        metavar="PATH",
        help="Load this env file before connecting (same as backfill_activity_style_keys.py).",
    )
    args = parser.parse_args()

    if args.env_file is not None:
        if not args.env_file.is_file():
            raise SystemExit(f"env file not found: {args.env_file}")
        _apply_env_file(args.env_file, override=True)

    from app.core.config import get_settings

    get_settings.cache_clear()
    import app.core.database  # noqa: F401 — rebind engine after env

    raise SystemExit(run())


if __name__ == "__main__":
    main()

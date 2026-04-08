#!/usr/bin/env python3
"""Reassign activity_style_key for non-deleted, non-cancelled activities to match rotation rules."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def _apply_env_file(path: Path, *, override: bool = True) -> None:
    """Load KEY=VALUE lines into os.environ (UTF-8)."""

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


def run(*, dry_run: bool) -> int:
    from collections import defaultdict

    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models import Activity
    from app.services.activity_type_style_service import (
        list_available_style_keys_in_order,
        normalize_activity_style_key,
        normalize_activity_type_key,
    )

    db = SessionLocal()
    changes = 0
    try:
        rows = list(
            db.scalars(
                select(Activity)
                .where(Activity.status != "已删除", Activity.status != "已取消")
                .order_by(Activity.id.asc())
            ).all()
        )
        by_type: dict[str, list[Activity]] = defaultdict(list)
        for a in rows:
            tk = normalize_activity_type_key(a.activity_type or "other") or "other"
            by_type[tk].append(a)

        for tk in sorted(by_type.keys()):
            group = sorted(by_type[tk], key=lambda x: x.id)
            keys = list_available_style_keys_in_order(tk)
            for i, a in enumerate(group):
                if not keys:
                    new_key = normalize_activity_style_key(tk, None)
                elif len(keys) == 1:
                    new_key = keys[0]
                else:
                    new_key = keys[i % len(keys)]

                old = a.activity_style_key
                if old != new_key:
                    changes += 1
                    print(f"id={a.id} type={tk} {old!r} -> {new_key!r}", flush=True)
                    if not dry_run:
                        a.activity_style_key = new_key

        if dry_run:
            db.rollback()
            print(f"[dry-run] would update {changes} row(s)", flush=True)
        else:
            db.commit()
            print(f"updated {changes} row(s)", flush=True)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing to the database",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        metavar="PATH",
        help="Load this env file into the process before connecting (overrides existing vars). "
        "Use for production DATABASE_URL without changing .env.test.",
    )
    args = parser.parse_args()

    if args.env_file is not None:
        if not args.env_file.is_file():
            raise SystemExit(f"env file not found: {args.env_file}")
        _apply_env_file(args.env_file, override=True)

    from app.core.config import get_settings

    get_settings.cache_clear()
    import app.core.database  # noqa: F401 — bind engine after env / cache reset

    raise SystemExit(run(dry_run=args.dry_run))


if __name__ == "__main__":
    main()

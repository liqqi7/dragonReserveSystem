"""List or prune unreferenced activity share cards after a retention period.

Dry-run by default; never remove referenced files or recently written files.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import re

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Activity
from app.services.activity_share_preview_service import SHARE_PREVIEW_DIR


# Cleanup also scans historical hash lengths without widening the serving rule.
PRUNABLE_FILE_NAME = re.compile(r"activity-\d+-[0-9a-f]{24,32}\.png\Z")


def prune(*, apply: bool = False, min_age_days: int = 14) -> None:
    if min_age_days < 7:
        raise ValueError("At least 7 days of retention are required")
    with SessionLocal() as db:
        referenced = set(db.scalars(select(Activity.share_preview_file).where(Activity.share_preview_file.is_not(None))))
    cutoff = datetime.now(timezone.utc) - timedelta(days=min_age_days)
    for path in sorted(SHARE_PREVIEW_DIR.glob("activity-*.png")) if SHARE_PREVIEW_DIR.is_dir() else []:
        if not PRUNABLE_FILE_NAME.fullmatch(path.name):
            continue
        try:
            if datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) > cutoff:
                continue
        except FileNotFoundError:
            continue
        # Recheck just before deletion; the initial snapshot is only for fast filtering.
        if path.name in referenced:
            continue
        print(f"{'REMOVE' if apply else 'DRY-RUN'} {path}")
        if apply:
            with SessionLocal() as db:
                still_referenced = db.scalar(select(Activity.id).where(Activity.share_preview_file == path.name).limit(1))
            if still_referenced is None:
                path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--min-age-days", type=int, default=14)
    args = parser.parse_args()
    if args.min_age_days < 7:
        parser.error("At least 7 days of retention are required")
    prune(apply=args.apply, min_age_days=args.min_age_days)


if __name__ == "__main__":
    main()

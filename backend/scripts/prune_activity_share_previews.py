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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--min-age-days", type=int, default=14)
    args = parser.parse_args()
    if args.min_age_days < 7:
        parser.error("At least 7 days of retention are required")
    with SessionLocal() as db:
        referenced = set(db.scalars(select(Activity.share_preview_file).where(Activity.share_preview_file.is_not(None))))
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.min_age_days)
    candidate = re.compile(r"activity-\d+-[0-9a-f]{24,32}\.png\Z")
    for path in sorted(SHARE_PREVIEW_DIR.glob("activity-*.png")) if SHARE_PREVIEW_DIR.is_dir() else []:
        if not candidate.fullmatch(path.name) or path.name in referenced:
            continue
        if datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) > cutoff:
            continue
        print(f"{'REMOVE' if args.apply else 'DRY-RUN'} {path}")
        if args.apply:
            path.unlink()

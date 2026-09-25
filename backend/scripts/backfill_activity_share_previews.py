"""Backfill pre-generated share cards; dry-run by default.

Run after the activities.share_preview_file migration and before deploying the
read-only share client. The cursor is the last printed activity ID; reruns are safe.
"""
from __future__ import annotations

import argparse
import logging

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Activity
from app.services.activity_share_preview_service import (
    discard_prepared_preview, prepare_activity_share_preview, read_activity_share_preview,
)

logger = logging.getLogger(__name__)


def backfill(*, apply: bool, start_after: int = 0, limit: int = 0) -> tuple[int, int]:
    with SessionLocal() as db:
        ids = list(db.scalars(select(Activity.id).where(Activity.id > start_after).order_by(Activity.id)))
    processed = failures = 0
    for activity_id in ids[:limit or None]:
        with SessionLocal() as db:
            prepared_name, created = "", False
            try:
                activity = db.scalar(select(Activity).where(Activity.id == activity_id).with_for_update())
                if activity is None:
                    continue
                if not apply:
                    print(f"DRY-RUN {activity_id}: {'ready' if read_activity_share_preview(activity).status == 'ready' else 'missing'}")
                    continue
                prepared_name, created = prepare_activity_share_preview(activity)
                if activity.share_preview_file != prepared_name:
                    activity.share_preview_file = prepared_name
                    db.commit()
                else:
                    db.rollback()
                processed += 1
                print(f"READY {activity_id}: {prepared_name}")
            except Exception:
                db.rollback()
                if prepared_name:
                    discard_prepared_preview(prepared_name, created)
                failures += 1
                logger.exception("share_preview_backfill_failed activity_id=%s", activity_id)
                print(f"FAILED {activity_id}")
    return processed, failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Actually write files and DB references")
    parser.add_argument("--start-after", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    done, failed = backfill(apply=args.apply, start_after=args.start_after, limit=args.limit)
    print(f"processed={done} failed={failed}")
    raise SystemExit(1 if failed else 0)

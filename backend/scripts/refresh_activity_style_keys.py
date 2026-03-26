from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import select

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def load_env_file(env_file: str) -> None:
    if not os.path.exists(env_file):
        raise FileNotFoundError(f"Env file not found: {env_file}")

    with open(env_file, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            os.environ[key] = value


def refresh_style_keys(dry_run: bool, only_status: str | None) -> tuple[int, int]:
    from app.core.database import SessionLocal
    from app.models import Activity
    from app.services.activity_type_style_service import (
        list_selectable_styles_by_rule,
        normalize_activity_style_key,
    )

    scanned = 0
    changed = 0
    type_counters: dict[str, int] = {}

    with SessionLocal() as db:
        stmt = select(Activity).order_by(Activity.id.asc())
        if only_status:
            stmt = stmt.where(Activity.status == only_status)
        activities = list(db.scalars(stmt).all())

        for activity in activities:
            scanned += 1
            activity_type = str(activity.activity_type or "other").strip() or "other"
            selectable_styles = list_selectable_styles_by_rule(activity_type)

            if selectable_styles:
                idx = type_counters.get(activity_type, 0)
                picked = selectable_styles[idx % len(selectable_styles)]
                next_style_key = str(picked.get("style_key", "")).strip() or None
                type_counters[activity_type] = idx + 1
            else:
                next_style_key = normalize_activity_style_key(activity_type, None)

            if next_style_key != activity.activity_style_key:
                changed += 1
                print(
                    f"[UPDATE] activity_id={activity.id} type={activity_type} "
                    f"style_key: {activity.activity_style_key!r} -> {next_style_key!r}"
                )
                activity.activity_type = activity_type
                activity.activity_style_key = next_style_key
                db.add(activity)

        if dry_run:
            db.rollback()
            print(f"[DRY-RUN] scanned={scanned}, changed={changed}")
        else:
            db.commit()
            print(f"[DONE] scanned={scanned}, changed={changed}")

    return scanned, changed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refresh activity_style_key based on current activity_type style rules."
    )
    parser.add_argument("--env-file", default=".env", help="Path to env file (default: .env)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without commit")
    parser.add_argument(
        "--only-status",
        default="",
        help="Optional activity status filter, e.g. 未开始/进行中/已结束",
    )
    args = parser.parse_args()

    load_env_file(args.env_file)
    refresh_style_keys(dry_run=args.dry_run, only_status=(args.only_status or "").strip() or None)


if __name__ == "__main__":
    main()


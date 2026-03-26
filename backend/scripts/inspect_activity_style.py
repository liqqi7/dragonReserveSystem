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
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect activity style resolution by name keyword.")
    parser.add_argument("--env-file", default=".env", help="Path to env file")
    parser.add_argument("--keyword", required=True, help="Activity name keyword")
    args = parser.parse_args()

    load_env_file(args.env_file)

    from app.core.database import SessionLocal
    from app.models import Activity
    from app.services.activity_type_style_service import list_activity_type_styles

    style_map = {}
    for t in list_activity_type_styles():
        type_key = str(t.get("key", "")).strip()
        default_style_key = str(t.get("default_style_key", "")).strip()
        style_map[type_key] = {
            "default_style_key": default_style_key,
            "styles": {
                str(s.get("style_key", "")).strip(): s
                for s in (t.get("styles") or [])
                if str(s.get("style_key", "")).strip()
            },
        }

    with SessionLocal() as db:
        rows = list(
            db.scalars(
                select(Activity)
                .where(Activity.name.like(f"%{args.keyword}%"))
                .order_by(Activity.id.desc())
            ).all()
        )
        print(f"matches={len(rows)}")
        for a in rows:
            type_key = str(a.activity_type or "other").strip() or "other"
            type_entry = style_map.get(type_key) or {}
            style_key = str(a.activity_style_key or "").strip() or type_entry.get("default_style_key", "")
            style = (type_entry.get("styles") or {}).get(style_key, {})
            print(
                {
                    "id": a.id,
                    "name": a.name,
                    "activity_type": a.activity_type,
                    "activity_style_key": a.activity_style_key,
                    "resolved_style_key": style_key,
                    "large_card_bg_image_url": style.get("large_card_bg_image_url"),
                    "small_card_bg_image_url": style.get("small_card_bg_image_url"),
                    "bg_video_url": style.get("bg_video_url"),
                }
            )


if __name__ == "__main__":
    main()


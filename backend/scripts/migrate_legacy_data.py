#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models import Activity, ActivityParticipant, User


@dataclass
class PreviewStats:
    raw_users: int = 0
    deduped_users: int = 0
    raw_activities: int = 0
    raw_participants: int = 0
    inserted_users: int = 0
    updated_users: int = 0
    inserted_activities: int = 0
    inserted_participants: int = 0


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def parse_dt(value: Any) -> datetime | None:
    if value in (None, "", {}):
        return None
    if isinstance(value, dict):
        if "$date" in value:
            return datetime.fromisoformat(value["$date"].replace("Z", "+00:00"))
        return None
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                pass
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return None


def choose_better_user(old: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    def score(x: dict[str, Any]) -> tuple[int, int, int, str]:
        return (
            1 if (x.get("nickname") or "").strip() else 0,
            1 if (x.get("avatarUrl") or "").strip() else 0,
            1 if (x.get("role") or "").strip() else 0,
            x.get("updatedAt", {}).get("$date", "") if isinstance(x.get("updatedAt"), dict) else "",
        )

    return new if score(new) > score(old) else old


def dedupe_users(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        openid = row.get("_openid")
        if not openid:
            continue
        if openid in result:
            result[openid] = choose_better_user(result[openid], row)
        else:
            result[openid] = row
    return result


def build_session() -> Session:
    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return SessionLocal()


def upsert_users(db: Session, deduped_users: dict[str, dict[str, Any]], stats: PreviewStats, apply: bool) -> dict[str, int]:
    openid_to_user_id: dict[str, int] = {}
    for openid, row in deduped_users.items():
        existing = db.scalar(select(User).where(User.wechat_openid == openid))
        nickname = (row.get("nickname") or "").strip()
        avatar_url = (row.get("avatarUrl") or "").strip()
        role = (row.get("role") or "user").strip() or "user"

        if existing:
            if apply:
                existing.nickname = nickname
                existing.avatar_url = avatar_url
                existing.role = role
                if row.get("createdAt"):
                    existing.created_at = parse_dt(row.get("createdAt")) or existing.created_at
                if row.get("updatedAt"):
                    existing.updated_at = parse_dt(row.get("updatedAt")) or existing.updated_at
            stats.updated_users += 1
            openid_to_user_id[openid] = existing.id
        else:
            user = User(
                username=None,
                wechat_openid=openid,
                password_hash=None,
                nickname=nickname,
                avatar_url=avatar_url,
                role=role,
            )
            if apply:
                if row.get("createdAt"):
                    user.created_at = parse_dt(row.get("createdAt")) or user.created_at
                if row.get("updatedAt"):
                    user.updated_at = parse_dt(row.get("updatedAt")) or user.updated_at
                db.add(user)
                db.flush()
                openid_to_user_id[openid] = user.id
            stats.inserted_users += 1
            if not apply:
                openid_to_user_id[openid] = -1
    if apply:
        db.flush()
        for openid in deduped_users:
            if openid_to_user_id.get(openid, -1) == -1:
                user = db.scalar(select(User).where(User.wechat_openid == openid))
                if user:
                    openid_to_user_id[openid] = user.id
    return openid_to_user_id


def insert_activities(db: Session, activities: list[dict[str, Any]], openid_to_user_id: dict[str, int], stats: PreviewStats, apply: bool) -> None:
    for row in activities:
        creator_id = openid_to_user_id[row["_openid"]]
        activity = Activity(
            name=row.get("name") or "",
            status=row.get("status") or "进行中",
            remark=row.get("remark") or "",
            max_participants=int(row.get("maxParticipants") or 20),
            start_time=parse_dt(row.get("startTime")),
            end_time=parse_dt(row.get("endTime")),
            signup_deadline=parse_dt(row.get("signupDeadline")),
            location_name=row.get("locationName") or "",
            location_address=row.get("locationAddress") or "",
            location_latitude=row.get("locationLatitude"),
            location_longitude=row.get("locationLongitude"),
            created_by=creator_id,
        )
        if row.get("createdAt"):
            activity.created_at = parse_dt(row.get("createdAt")) or activity.created_at
        if row.get("updatedAt"):
            activity.updated_at = parse_dt(row.get("updatedAt")) or activity.updated_at

        if apply:
            db.add(activity)
            db.flush()
            activity_id = activity.id
        else:
            activity_id = -1
        stats.inserted_activities += 1

        for participant in row.get("participants", []) or []:
            uid = participant.get("userId")
            if not uid or uid not in openid_to_user_id:
                continue
            ap = ActivityParticipant(
                activity_id=activity_id,
                user_id=openid_to_user_id[uid],
                nickname_snapshot=participant.get("name") or "",
                avatar_url_snapshot=participant.get("avatarUrl") or "",
                checked_in_at=parse_dt(participant.get("checkedInAt")),
                checkin_lat=participant.get("checkinLat"),
                checkin_lng=participant.get("checkinLng"),
            )
            if apply:
                db.add(ap)
            stats.inserted_participants += 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate legacy WeChat cloud data into the new backend database.")
    parser.add_argument("--users", required=True, help="Path to legacy users JSONL export")
    parser.add_argument("--activities", required=True, help="Path to legacy activities JSONL export")
    parser.add_argument("--apply", action="store_true", help="Actually write data into the database")
    args = parser.parse_args()

    users = load_jsonl(Path(args.users))
    activities = load_jsonl(Path(args.activities))

    stats = PreviewStats(raw_users=len(users), raw_activities=len(activities))
    stats.raw_participants = sum(len(a.get("participants", []) or []) for a in activities)
    deduped_users = dedupe_users(users)
    stats.deduped_users = len(deduped_users)

    db = build_session()
    try:
        openid_to_user_id = upsert_users(db, deduped_users, stats, apply=args.apply)
        insert_activities(db, activities, openid_to_user_id, stats, apply=args.apply)
        if args.apply:
            db.commit()
        else:
            db.rollback()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("=== MIGRATION RESULT ===")
    print(f"RAW_USERS={stats.raw_users}")
    print(f"DEDUPED_USERS={stats.deduped_users}")
    print(f"RAW_ACTIVITIES={stats.raw_activities}")
    print(f"RAW_PARTICIPANTS={stats.raw_participants}")
    print(f"INSERTED_USERS={stats.inserted_users}")
    print(f"UPDATED_USERS={stats.updated_users}")
    print(f"INSERTED_ACTIVITIES={stats.inserted_activities}")
    print(f"INSERTED_PARTICIPANTS={stats.inserted_participants}")
    print(f"APPLY_MODE={args.apply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

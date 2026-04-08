#!/usr/bin/env python3
"""Wipe all activities on the current DB, seed test users, create 10 activities via create_activity (no style key).

Intended for test / dev databases only. Uses the same DATABASE_URL as the app (merged .env + .env.test).
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import delete, func, select

from app.core.database import SessionLocal
from app.core.exceptions import ConflictError
from app.models import Activity, ActivityParticipant, User
from app.schemas.activity import ActivityCreateRequest
from app.services.activity_service import create_activity, signup_activity


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def main() -> None:
    print("Connecting (uses app DATABASE_URL from .env / .env.test)...", flush=True)
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.role == "admin").limit(1))
        if admin is None:
            raise SystemExit("No admin user; run: python scripts/create_admin.py")

        n_act = db.scalar(select(func.count(Activity.id))) or 0
        n_participants = db.scalar(select(func.count(ActivityParticipant.id))) or 0
        db.execute(delete(ActivityParticipant))
        db.execute(delete(Activity))
        db.commit()
        print(f"Deleted activities (had {n_act} activities, {n_participants} participant rows).", flush=True)

        prefix = "seed_demo_"
        seed_users: list[User] = []
        for i in range(1, 9):
            openid = f"{prefix}openid_{i:02d}"
            u = db.scalar(select(User).where(User.wechat_openid == openid))
            if u is None:
                u = User(
                    wechat_openid=openid,
                    nickname=f"测试用户{i:02d}",
                    avatar_url=f"https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
                    role="user",
                )
                db.add(u)
                db.flush()
            seed_users.append(u)
        db.commit()
        print(f"Ensured {len(seed_users)} seed users ({prefix}*).", flush=True)

        # 10 activities, mixed types; no activity_style_key → server rotation / defaults
        specs: list[tuple[str, str]] = [
            ("movie", "【演示】电影 A"),
            ("movie", "【演示】电影 B"),
            ("movie", "【演示】电影 C"),
            ("movie", "【演示】电影 D"),
            ("outing", "【演示】外出 ①"),
            ("outing", "【演示】外出 ②"),
            ("boardgame", "【演示】桌游 ①"),
            ("boardgame", "【演示】桌游 ②"),
            ("eating", "【演示】吃饭 ①"),
            ("badminton", "【演示】羽毛球 ①"),
        ]

        base = _utcnow().replace(microsecond=0)
        created: list[Activity] = []
        for idx, (atype, title) in enumerate(specs):
            start = base + timedelta(days=1, hours=idx * 2)
            end = start + timedelta(hours=3)
            deadline = start - timedelta(minutes=30)
            payload = ActivityCreateRequest(
                name=title,
                status="进行中",
                remark=f"种子数据 idx={idx + 1}",
                start_time=start,
                end_time=end,
                signup_deadline=deadline,
                signup_enabled=True,
                activity_type=atype,
                activity_style_key=None,
                location_name="测试地点",
                location_address="演示用地址",
                location_latitude=31.2304,
                location_longitude=121.4737,
                max_participants=20,
            )
            act = create_activity(db, payload, admin)
            created.append(act)
            print(
                f"  id={act.id} type={act.activity_type} style_key={act.activity_style_key!r} name={act.name!r}",
                flush=True,
            )

        # Sign up seed users (admin already creator-participant)
        for act in created:
            for u in seed_users[:5]:
                if u.id == admin.id:
                    continue
                try:
                    signup_activity(db, act, u)
                except ConflictError:
                    pass
            n = (
                db.scalar(
                    select(func.count(ActivityParticipant.id)).where(
                        ActivityParticipant.activity_id == act.id
                    )
                )
                or 0
            )
            print(f"  activity id={act.id} participants={n}", flush=True)

        print("Done.", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()

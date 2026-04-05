from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select

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


def ensure_seed_users(db, min_count: int):
    from app.models import User

    users = list(db.scalars(select(User).order_by(User.id)).all())
    needed = max(0, min_count - len(users))
    if needed == 0:
        return users

    for idx in range(needed):
        serial = len(users) + idx + 1
        user = User(
            username=f"seed_user_{serial:03d}",
            wechat_openid=f"seed_openid_{serial:03d}",
            password_hash=None,
            nickname=f"测试用户{serial:03d}",
            avatar_url="/images/default-avatar.svg",
            role="user",
        )
        db.add(user)

    db.commit()
    return list(db.scalars(select(User).order_by(User.id)).all())


def pick_activity_name(index: int, activity_type: str) -> str:
    prefixes = ["晨光", "晚风", "周末", "冲刺", "轻松", "星夜", "热身", "欢乐", "极速", "全勤"]
    suffixes = {
        "badminton": ["羽球对抗", "羽球双打", "羽球拉练", "羽球上分"],
        "boardgame": ["桌游局", "桌游联赛", "桌游新手局", "桌游欢乐局"],
        "other": ["综合活动", "自由活动", "兴趣小组", "休闲聚会"],
    }
    return f"{random.choice(prefixes)}{random.choice(suffixes[activity_type])}{index + 1:02d}"


# 第 10 条测试活动固定名称；novusluna 在该活动中默认已签到
DEMO_BADMINTON_ACTIVITY_INDEX = 9
DEMO_BADMINTON_ACTIVITY_NAME = "轻松羽球双打10"


def ensure_novusluna_user(db):
    from app.models import User

    existing = db.scalar(select(User).where(func.lower(User.username) == "novusluna"))
    if existing is not None:
        return existing
    user = User(
        username="novusluna",
        wechat_openid="seed_openid_novusluna",
        password_hash=None,
        nickname="NovusLuna",
        avatar_url="/images/default-avatar.svg",
        role="user",
    )
    db.add(user)
    db.flush()
    return user


def create_activities(count: int, participants_per_activity: int):
    from app.core.database import SessionLocal
    from app.models import Activity, ActivityParticipant

    activity_types = ["badminton", "boardgame", "other"]
    now = datetime.now()

    with SessionLocal() as db:
        users = ensure_seed_users(db, min_count=max(30, participants_per_activity + 5))
        ensure_novusluna_user(db)
        db.commit()
        users = list(db.scalars(select(User).order_by(User.id)).all())
        user_ids = [u.id for u in users]
        user_by_id = {u.id: u for u in users}
        creator_id = users[0].id
        novus_user = db.scalar(select(User).where(func.lower(User.username) == "novusluna"))
        assert novus_user is not None

        created = []
        for i in range(count):
            day_offset = random.randint(1, 10)
            start_hour = random.randint(8, 21)
            start_minute = random.choice([0, 15, 30, 45])
            duration_hours = random.choice([2, 2, 2, 3, 4])
            if i == DEMO_BADMINTON_ACTIVITY_INDEX:
                activity_type = "badminton"
                activity_name = DEMO_BADMINTON_ACTIVITY_NAME
            else:
                activity_type = random.choice(activity_types)
                activity_name = pick_activity_name(i, activity_type)

            start_time = (now + timedelta(days=day_offset)).replace(
                hour=start_hour,
                minute=start_minute,
                second=0,
                microsecond=0,
            )
            end_time = start_time + timedelta(hours=duration_hours)
            signup_deadline = start_time - timedelta(hours=random.choice([6, 8, 12, 24]))

            activity = Activity(
                name=activity_name,
                status="进行中",
                remark="自动生成测试活动",
                max_participants=20,
                start_time=start_time,
                end_time=end_time,
                signup_deadline=signup_deadline,
                signup_enabled=True,
                activity_type=activity_type,
                location_name=f"测试场馆{random.randint(1, 6)}号",
                location_address=f"测试路{random.randint(1, 120)}号",
                location_latitude=39.9042 + random.uniform(-0.03, 0.03),
                location_longitude=116.4074 + random.uniform(-0.03, 0.03),
                created_by=creator_id,
            )
            db.add(activity)
            db.flush()

            if i == DEMO_BADMINTON_ACTIVITY_INDEX and novus_user.id in user_ids:
                others = [uid for uid in user_ids if uid != novus_user.id]
                need = max(0, participants_per_activity - 1)
                base = random.sample(others, min(need, len(others)))
                chosen_ids = base + [novus_user.id]
            else:
                chosen_ids = random.sample(user_ids, participants_per_activity)

            checked_in_at_utc = datetime.now(timezone.utc)
            participants = []
            for uid in chosen_ids:
                kwargs = {
                    "activity_id": activity.id,
                    "user_id": uid,
                    "nickname_snapshot": user_by_id[uid].nickname,
                    "avatar_url_snapshot": user_by_id[uid].avatar_url,
                }
                if i == DEMO_BADMINTON_ACTIVITY_INDEX and uid == novus_user.id:
                    kwargs["checked_in_at"] = checked_in_at_utc
                participants.append(ActivityParticipant(**kwargs))
            db.add_all(participants)
            created.append((activity.id, activity.name, start_time, activity_type))

        db.commit()
        return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed test database with random activities.")
    parser.add_argument("--env-file", default=".env.test", help="Path to env file (default: .env.test)")
    parser.add_argument("--count", type=int, default=20, help="Number of activities to create")
    parser.add_argument(
        "--participants-per-activity",
        type=int,
        default=10,
        help="Participants per activity",
    )
    args = parser.parse_args()

    load_env_file(args.env_file)
    created = create_activities(args.count, args.participants_per_activity)

    print(f"Created {len(created)} activities:")
    for activity_id, name, start_time, activity_type in created:
        print(f"- #{activity_id} {name} | {start_time.isoformat()} | {activity_type}")


if __name__ == "__main__":
    main()

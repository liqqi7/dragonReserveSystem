"""Create deterministic, non-production data for mini-program integration testing."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def load_env_file(env_file: str) -> None:
    for raw_line in Path(env_file).read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip("'").strip('"')


def add_participants(db, activity, users, count: int, checked_in: int = 0, admin_checked_in: int = 0) -> None:
    from app.models import ActivityParticipant
    from app.services.activity_service import _app_now

    for index, user in enumerate(users[:count]):
        participant = ActivityParticipant(
            activity_id=activity.id,
            user_id=user.id,
            display_nickname=user.nickname,
            display_avatar_url=user.avatar_url,
        )
        if index < checked_in:
            participant.checked_in_at = _app_now() - timedelta(hours=1)
            participant.checkin_method = "location"
            participant.checkin_lat = activity.location_latitude
            participant.checkin_lng = activity.location_longitude
        elif index < checked_in + admin_checked_in:
            participant.checked_in_at = _app_now() - timedelta(hours=1)
            participant.checkin_method = "admin"
        db.add(participant)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the integration-test database.")
    parser.add_argument("--env-file", default=".env.test")
    args = parser.parse_args()
    load_env_file(args.env_file)

    from app.core.database import SessionLocal
    from app.core.security import get_password_hash
    from app.models import Activity, User
    from app.services.activity_service import _app_now

    now = _app_now()
    # Test data uses stable, publicly accessible production avatar URLs. The old SVG
    # placeholders were intentionally removed from the mini-program package.
    test_avatar_urls = [
        "https://dragon.liqqihome.top/media/avatars/3e61efeb45c64f09ad96f929b390d451.jpg",
        "https://dragon.liqqihome.top/media/avatars/5faa1227342e45acb9da2661151230ce.jpg",
        "https://dragon.liqqihome.top/media/avatars/654a32e3-b92d-4149-a596-952ee05abd30.jpg",
        "https://dragon.liqqihome.top/media/avatars/84c5c9ce08714ce2aec2e6750ce8f4ac.jpg",
        "https://dragon.liqqihome.top/media/avatars/c22de226c2d74ab2a600739e95f3bdd4.jpg",
        "https://dragon.liqqihome.top/media/avatars/d0589308-71ee-4ee5-be7a-2c7743d3412d.jpg",
        "https://dragon.liqqihome.top/media/avatars/d9f16109-2780-48ae-9595-77186327c78f.jpg",
        "https://dragon.liqqihome.top/media/avatars/ebc8614ede6e4f91b22bcee77a7d095f.jpg",
    ]
    with SessionLocal() as db:
        users: list[User] = []
        for index in range(1, 17):
            role = "admin" if index <= 2 else ("guest" if index >= 14 else "user")
            user = User(
                username=f"test_user_{index:02d}",
                password_hash=get_password_hash("Test123456"),
                nickname=f"测试用户{index:02d}",
                avatar_url=test_avatar_urls[(index - 1) % len(test_avatar_urls)],
                role=role,
                wechat_openid=f"test_openid_{index:02d}",
            )
            db.add(user)
            users.append(user)
        db.flush()

        def activity(name: str, status: str, start_offset: timedelta, duration: timedelta, capacity: int | None = 12, signup_enabled: bool = True, deadline_offset: timedelta | None = None) -> Activity:
            start = now + start_offset
            record = Activity(
                name=name,
                status=status,
                remark="用于小程序联调的虚构测试数据",
                max_participants=capacity,
                start_time=start,
                end_time=start + duration,
                signup_deadline=now + deadline_offset if deadline_offset is not None else start - timedelta(hours=2),
                signup_enabled=signup_enabled,
                activity_type="badminton" if "羽毛球" in name else "boardgame",
                location_name="测试运动中心",
                location_address="北京市昌平区测试路 100 号",
                location_latitude=40.069,
                location_longitude=116.324,
                created_by=users[0].id,
            )
            db.add(record)
            db.flush()
            return record

        future_open = activity("测试羽毛球公开局", "未开始", timedelta(days=2), timedelta(hours=3))
        add_participants(db, future_open, users, 5)
        future_full = activity("测试桌游满员局", "未开始", timedelta(days=3), timedelta(hours=5), capacity=5)
        add_participants(db, future_full, users, 5)
        activity("测试关闭报名局", "未开始", timedelta(days=1), timedelta(hours=2), signup_enabled=False)
        activity("测试报名截止局", "未开始", timedelta(days=1), timedelta(hours=2), deadline_offset=timedelta(hours=-1))
        ongoing = activity("测试进行中羽毛球", "进行中", timedelta(hours=-1), timedelta(hours=3))
        add_participants(db, ongoing, users, 8, checked_in=3)
        ended = activity("测试已结束羽毛球", "未开始", timedelta(days=-3), timedelta(hours=3))
        add_participants(db, ended, users, 10, checked_in=6, admin_checked_in=2)
        cancelled = activity("测试已取消桌游局", "已取消", timedelta(days=-2), timedelta(hours=4))
        add_participants(db, cancelled, users, 4)
        flow = activity("测试已流局羽毛球", "已流局", timedelta(hours=-1), timedelta(hours=2))
        add_participants(db, flow, users, 1)
        activity("测试不限人数桌游局", "未开始", timedelta(days=5), timedelta(hours=6), capacity=None)

        db.commit()
        summary = db.execute(select(User.role, User.id)).all()
        print(f"Seeded users={len(users)} activities=9 role_rows={len(summary)}")


if __name__ == "__main__":
    main()

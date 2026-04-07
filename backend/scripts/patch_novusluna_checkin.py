"""将活动「轻松羽球双打10」中用户 novusluna 的签到状态设为已签到（用于已有测试库）。"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
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


def patch_novusluna_checked_in() -> bool:
    from app.core.database import SessionLocal
    from app.models import Activity, ActivityParticipant, User

    activity_name = "轻松羽球双打10"

    with SessionLocal() as db:
        act = db.scalar(select(Activity).where(Activity.name == activity_name))
        if act is None:
            print(f"未找到活动：{activity_name}")
            return False

        user = db.scalar(select(User).where(func.lower(User.username) == "novusluna"))
        if user is None:
            user = db.scalar(select(User).where(func.lower(User.nickname) == "novusluna"))
        if user is None:
            print("未找到用户：username 或昵称为 novusluna（不区分大小写）")
            return False

        part = db.scalar(
            select(ActivityParticipant).where(
                ActivityParticipant.activity_id == act.id,
                ActivityParticipant.user_id == user.id,
            )
        )
        if part is None:
            print("该用户未报名此活动，无法设置签到")
            return False

        part.checked_in_at = datetime.now(timezone.utc)
        db.commit()
        print(f"已更新：{activity_name} — {user.username or user.nickname} 已签到")
        return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env.test", help="Env file path (default: .env.test)")
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if not env_path.is_absolute():
        env_path = PROJECT_ROOT / env_path
    load_env_file(str(env_path))

    ok = patch_novusluna_checked_in()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

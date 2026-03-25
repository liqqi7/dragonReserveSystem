from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def load_env_file(env_file: str) -> None:
    env_path = Path(env_file)
    if not env_path.exists():
        raise FileNotFoundError(f"Env file not found: {env_file}")

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip("'").strip('"')


def main() -> None:
    parser = argparse.ArgumentParser(description="Fix invalid avatar URLs in test database.")
    parser.add_argument("--env-file", default=".env.test", help="Path to env file (default: .env.test)")
    args = parser.parse_args()

    load_env_file(args.env_file)

    from app.core.database import engine

    with Session(engine) as db:
        user_result = db.execute(
            text("UPDATE users SET avatar_url=:new_url WHERE avatar_url LIKE :pattern"),
            {"new_url": "/images/default-avatar.svg", "pattern": "%example.com%"},
        )
        participant_result = db.execute(
            text(
                "UPDATE activity_participants SET avatar_url_snapshot=:new_url "
                "WHERE avatar_url_snapshot LIKE :pattern"
            ),
            {"new_url": "/images/default-avatar.svg", "pattern": "%example.com%"},
        )
        db.commit()

    print(
        "Avatar URL fix completed:",
        f"users={user_result.rowcount}",
        f"participants={participant_result.rowcount}",
    )


if __name__ == "__main__":
    main()

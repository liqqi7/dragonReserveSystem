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


AVATAR_COLORS = [
    "#4F46E5",
    "#0EA5E9",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
    "#EC4899",
    "#22C55E",
    "#3B82F6",
]


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


def build_svg(color: str, index: int) -> str:
    label = f"T{index}"
    return f"""<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g{index}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{color}" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="url(#g{index})"/>
  <circle cx="100" cy="78" r="34" fill="rgba(255,255,255,0.85)"/>
  <path d="M40 168c8-28 31-46 60-46s52 18 60 46" fill="rgba(255,255,255,0.75)"/>
  <text x="100" y="192" text-anchor="middle" font-size="18" fill="#FFFFFF" font-family="Arial, sans-serif">{label}</text>
</svg>
"""


def generate_avatar_files(media_root: Path) -> list[str]:
    avatars_dir = media_root / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)

    urls: list[str] = []
    for i, color in enumerate(AVATAR_COLORS, start=1):
        filename = f"test-avatar-{i:02d}.svg"
        (avatars_dir / filename).write_text(build_svg(color, i), encoding="utf-8")
        urls.append(f"/media/avatars/{filename}")
    return urls


def assign_avatars(db: Session, avatar_urls: list[str]) -> tuple[int, int]:
    case_parts = []
    params: dict[str, object] = {}
    for i, url in enumerate(avatar_urls, start=1):
        mod_value = i - 1
        case_parts.append(f"WHEN MOD(id, {len(avatar_urls)}) = {mod_value} THEN :u{i}")
        params[f"u{i}"] = url

    user_update_sql = (
        "UPDATE users "
        "SET avatar_url = CASE "
        + " ".join(case_parts)
        + " ELSE :u1 END"
    )
    user_result = db.execute(text(user_update_sql), params)

    participant_result = db.execute(
        text(
            "UPDATE activity_participants ap "
            "JOIN users u ON u.id = ap.user_id "
            "SET ap.avatar_url_snapshot = u.avatar_url"
        )
    )
    db.commit()
    return int(user_result.rowcount or 0), int(participant_result.rowcount or 0)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate local test avatars and assign to users.")
    parser.add_argument("--env-file", default=".env.test", help="Path to env file (default: .env.test)")
    args = parser.parse_args()

    load_env_file(args.env_file)

    from app.core.config import get_settings
    from app.core.database import engine

    settings = get_settings()
    media_root = Path(settings.media_root).resolve()
    avatar_urls = generate_avatar_files(media_root)

    with Session(engine) as db:
        user_count, participant_count = assign_avatars(db, avatar_urls)

    print(
        "Assigned test avatars:",
        f"files={len(avatar_urls)}",
        f"users={user_count}",
        f"participants={participant_count}",
    )
    print("Sample URL:", avatar_urls[0])


if __name__ == "__main__":
    main()

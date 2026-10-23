#!/usr/bin/env python3
"""Run the feature-gated board game preview worker against the configured database."""

import os
from pathlib import Path
import argparse
import signal
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _load_env_file(env_file: str) -> None:
    """Load KEY=VALUE lines into os.environ (existing process env wins)."""
    path = Path(env_file)
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# launchd 启动时进程环境为空，必须先载入 .env.test，否则功能开关全是默认值、worker 空转
_load_env_file(str(Path(__file__).resolve().parents[1] / ".env.test"))

from app.core.database import SessionLocal
from app.services.boardgame_worker import run_once


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    stopping = False
    def stop(*_):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while not stopping:
        worked = run_once(SessionLocal)
        if args.once:
            break
        time.sleep(0.1 if worked else 1)


if __name__ == '__main__':
    main()

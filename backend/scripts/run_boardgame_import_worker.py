#!/usr/bin/env python3
"""Run the feature-gated board game import worker against the configured database."""

from pathlib import Path
import argparse
import signal
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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

"""Run the name-search preview worker as a supervised process."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.database import SessionLocal
from app.services.boardgame_worker import run_once

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    while True:
        consumed = run_once(SessionLocal)
        if args.once:
            break
        if not consumed:
            time.sleep(1)

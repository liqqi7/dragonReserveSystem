"""Process submitted media and reclaim expired, unsubmitted upload sessions."""

import argparse
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.services.memory_worker import process_one
from app.services.memory_service import expire_one_draft
import logging


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    options = parser.parse_args()
    while True:
        with SessionLocal() as db:
            try:
                reclaimed = expire_one_draft(db)
                worked = process_one(db) or reclaimed
            except Exception as exc:
                db.rollback()
                logging.getLogger("dragon.reserve").warning("memory_worker_failed error_type=%s", type(exc).__name__)
                worked = False
        if options.once:
            return
        if not worked:
            time.sleep(3)


if __name__ == "__main__":
    main()

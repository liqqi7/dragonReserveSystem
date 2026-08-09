"""Synchronize time-derived activity statuses for the production timer."""

from app.core.database import SessionLocal
from app.services.activity_service import list_activities


def main() -> None:
    db = SessionLocal()
    try:
        list_activities(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()

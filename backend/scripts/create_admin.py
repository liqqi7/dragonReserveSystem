"""Bootstrap an admin user for local development."""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User


def main() -> None:
    """Create a default admin user if one does not already exist."""

    session = SessionLocal()
    try:
        existing = session.scalar(select(User).where(User.username == "admin"))
        if existing is not None:
            print("admin user already exists")
            return

        admin = User(
            username="admin",
            nickname="管理员",
            role="admin",
            avatar_url="",
            password_hash=get_password_hash("admin123456"),
        )
        session.add(admin)
        session.commit()
        print("admin user created: username=admin password=admin123456")
    finally:
        session.close()


if __name__ == "__main__":
    main()

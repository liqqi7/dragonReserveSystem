from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models import Activity, ActivityParticipant, User


@pytest.fixture()
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_user(db_session: Session) -> User:
    user = User(username="admin", password_hash=get_password_hash("admin123456"), nickname="Admin", avatar_url="", role="admin")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def normal_user(db_session: Session) -> User:
    user = User(username="member", password_hash=get_password_hash("member123456"), nickname="Member", avatar_url="https://example.com/avatar-member.png", role="user")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def second_user(db_session: Session) -> User:
    user = User(username="member2", password_hash=get_password_hash("member223456"), nickname="Member 2", avatar_url="https://example.com/avatar-member2.png", role="user")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_headers(client: TestClient, admin_user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'username': admin_user.username, 'password': 'admin123456'}).json()['access_token']}"}


@pytest.fixture()
def user_headers(client: TestClient, normal_user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'username': normal_user.username, 'password': 'member123456'}).json()['access_token']}"}


@pytest.fixture()
def second_user_headers(client: TestClient, second_user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {client.post('/api/v1/auth/login', json={'username': second_user.username, 'password': 'member223456'}).json()['access_token']}"}


@pytest.fixture()
def sample_activity(db_session: Session, admin_user: User) -> Activity:
    now = datetime.utcnow()
    activity = Activity(name="Sample activity", status="ongoing", remark="", max_participants=10, start_time=now + timedelta(days=1), end_time=now + timedelta(days=1, hours=2), signup_deadline=now + timedelta(hours=12), location_name="Venue", location_address="Address", location_latitude=39.9042, location_longitude=116.4074, created_by=admin_user.id)
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)
    return activity


@pytest.fixture()
def signed_up_activity(db_session: Session, sample_activity: Activity, normal_user: User) -> Activity:
    db_session.add(ActivityParticipant(activity_id=sample_activity.id, user_id=normal_user.id, display_nickname=normal_user.nickname, display_avatar_url=normal_user.avatar_url))
    db_session.commit()
    db_session.refresh(sample_activity)
    return sample_activity

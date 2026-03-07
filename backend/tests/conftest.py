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
from app.models import Activity, ActivityParticipant, Bill, BillParticipant, User


@pytest.fixture()
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
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
    user = User(
        username="admin",
        password_hash=get_password_hash("admin123456"),
        nickname="管理员",
        avatar_url="",
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def normal_user(db_session: Session) -> User:
    user = User(
        username="member",
        password_hash=get_password_hash("member123456"),
        nickname="普通成员",
        avatar_url="https://example.com/avatar-member.png",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def second_user(db_session: Session) -> User:
    user = User(
        username="member2",
        password_hash=get_password_hash("member223456"),
        nickname="第二成员",
        avatar_url="https://example.com/avatar-member2.png",
        role="user",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def admin_headers(client: TestClient, admin_user: User) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": admin_user.username, "password": "admin123456"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_headers(client: TestClient, normal_user: User) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": normal_user.username, "password": "member123456"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def second_user_headers(client: TestClient, second_user: User) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": second_user.username, "password": "member223456"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def sample_activity(db_session: Session, admin_user: User) -> Activity:
    now = datetime.utcnow()
    activity = Activity(
        name="周末活动",
        status="进行中",
        remark="测试活动",
        max_participants=10,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=2),
        signup_deadline=now + timedelta(hours=12),
        location_name="测试球馆",
        location_address="测试地址",
        location_latitude=39.9042,
        location_longitude=116.4074,
        created_by=admin_user.id,
    )
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)
    return activity


@pytest.fixture()
def signed_up_activity(db_session: Session, sample_activity: Activity, normal_user: User) -> Activity:
    participant = ActivityParticipant(
        activity_id=sample_activity.id,
        user_id=normal_user.id,
        nickname_snapshot=normal_user.nickname,
        avatar_url_snapshot=normal_user.avatar_url,
    )
    db_session.add(participant)
    db_session.commit()
    db_session.refresh(sample_activity)
    return sample_activity


@pytest.fixture()
def checked_in_activity(db_session: Session, sample_activity: Activity, normal_user: User) -> Activity:
    participant = ActivityParticipant(
        activity_id=sample_activity.id,
        user_id=normal_user.id,
        nickname_snapshot=normal_user.nickname,
        avatar_url_snapshot=normal_user.avatar_url,
        checked_in_at=datetime.utcnow(),
        checkin_lat=39.9042,
        checkin_lng=116.4074,
    )
    db_session.add(participant)
    db_session.commit()
    db_session.refresh(sample_activity)
    return sample_activity


@pytest.fixture()
def sample_bill(
    db_session: Session,
    sample_activity: Activity,
    normal_user: User,
    second_user: User,
) -> Bill:
    bill = Bill(
        activity_id=sample_activity.id,
        item="场地费",
        note="测试账单",
        total_amount=120.00,
        payer_user_id=normal_user.id,
        payer_name_snapshot=normal_user.nickname,
        per_share=60.00,
        date=datetime.utcnow().date(),
        participants=[
            BillParticipant(user_id=normal_user.id, nickname_snapshot=normal_user.nickname),
            BillParticipant(user_id=second_user.id, nickname_snapshot=second_user.nickname),
        ],
    )
    db_session.add(bill)
    db_session.commit()
    db_session.refresh(bill)
    return bill

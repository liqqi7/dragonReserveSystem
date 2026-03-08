from app.models import User


def test_login_success(client, admin_user) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": admin_user.username, "password": "admin123456"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["access_token"]


def test_login_failure_returns_401(client, admin_user) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": admin_user.username, "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_FAILED"


def test_register_success(client) -> None:
    response = client.post(
      "/api/v1/auth/register",
      json={
        "username": "new_user",
        "password": "new-user-password",
        "nickname": "新成员",
        "avatar_url": ""
      },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "new_user"
    assert body["role"] == "guest"


def test_register_duplicate_username_returns_conflict(client, admin_user) -> None:
    response = client.post(
      "/api/v1/auth/register",
      json={
        "username": admin_user.username,
        "password": "new-user-password",
        "nickname": "新成员",
        "avatar_url": ""
      },
    )

    assert response.status_code == 409
    assert response.json()["code"] == "CONFLICT"


def test_wechat_login_success(client, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.exchange_wechat_code",
        lambda code: {"openid": "wx-openid-123", "session_key": "session-key"},
    )

    response = client.post(
        "/api/v1/auth/wechat-login",
        json={
            "code": "mock-code",
            "profile": {
                "nickname": "微信成员",
                "avatar_url": "https://example.com/wx-avatar.png",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_wechat_login_reuses_existing_user(client, db_session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.exchange_wechat_code",
        lambda code: {"openid": "wx-openid-existing", "session_key": "session-key"},
    )

    existing = User(
        username=None,
        wechat_openid="wx-openid-existing",
        password_hash=None,
        nickname="旧微信用户",
        avatar_url="",
        role="guest",
    )
    db_session.add(existing)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/wechat-login",
        json={
            "code": "mock-code",
            "profile": {
                "nickname": "新昵称",
                "avatar_url": "https://example.com/new.png",
            },
        },
    )

    assert response.status_code == 200
    refreshed = db_session.get(User, existing.id)
    assert refreshed is not None
    assert refreshed.wechat_openid == "wx-openid-existing"

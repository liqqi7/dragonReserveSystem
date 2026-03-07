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

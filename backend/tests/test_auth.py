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

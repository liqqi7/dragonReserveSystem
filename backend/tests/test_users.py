def test_get_current_user(client, admin_user, admin_headers) -> None:
    response = client.get("/api/v1/users/me", headers=admin_headers)

    assert response.status_code == 200
    assert response.json()["username"] == admin_user.username
    assert response.json()["role"] == "admin"


def test_update_current_user(client, user_headers) -> None:
    response = client.patch(
        "/api/v1/users/me",
        headers=user_headers,
        json={"nickname": "改名后的成员", "avatar_url": "https://example.com/new.png"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nickname"] == "改名后的成员"
    assert body["avatar_url"] == "https://example.com/new.png"


def test_get_current_user_requires_auth(client) -> None:
    response = client.get("/api/v1/users/me")

    assert response.status_code == 401


def test_update_role_by_invite_code(client, user_headers) -> None:
    response = client.post(
        "/api/v1/users/me/role",
        headers=user_headers,
        json={"invite_code": "dragon"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_clear_role_resets_to_guest(client, user_headers) -> None:
    promote = client.post(
        "/api/v1/users/me/role",
        headers=user_headers,
        json={"invite_code": "manage"},
    )
    assert promote.status_code == 200

    clear = client.delete("/api/v1/users/me/role", headers=user_headers)
    assert clear.status_code == 200
    assert clear.json()["role"] == "guest"

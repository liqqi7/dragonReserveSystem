from io import BytesIO
from urllib.parse import urlparse


def test_get_current_user(client, admin_user, admin_headers) -> None:
    response = client.get("/api/v1/users/me", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["username"] == admin_user.username


def test_update_current_user_syncs_activity_display_data(client, db_session, user_headers, signed_up_activity, normal_user) -> None:
    response = client.patch("/api/v1/users/me", headers=user_headers, json={"nickname": "Renamed", "avatar_url": "/media/avatars/new.png"})
    assert response.status_code == 200
    participant = signed_up_activity.participants[0]
    db_session.refresh(participant)
    assert participant.display_nickname == "Renamed"
    assert participant.display_avatar_url == "/media/avatars/new.png"


def test_update_current_user_rejects_external_avatar_url(client, user_headers) -> None:
    response = client.patch(
        "/api/v1/users/me",
        headers=user_headers,
        json={"nickname": "Renamed", "avatar_url": "https://thirdwx.qlogo.cn/avatar.png"},
    )

    assert response.status_code == 422


def test_upload_current_user_avatar_returns_permanent_url(client, user_headers) -> None:
    response = client.post("/api/v1/users/me/avatar", headers=user_headers, files={"file": ("avatar.png", BytesIO(b"\x89PNG\r\n\x1a\nfake"), "image/png")})
    assert response.status_code == 200
    avatar_path = urlparse(response.json()["avatar_url"]).path
    assert client.get(avatar_path).status_code == 200

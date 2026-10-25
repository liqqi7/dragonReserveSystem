from io import BytesIO
from urllib.parse import urlparse

import pytest


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


def test_user_invite_code_grants_user_role(client, user_headers, monkeypatch) -> None:
    from app.api.v1 import users as users_api

    monkeypatch.setattr(users_api.settings, "user_invite_code", "test-user-invite")
    response = client.post(
        "/api/v1/users/me/role",
        headers=user_headers,
        json={"invite_code": "test-user-invite"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_admin_invite_code_grants_admin_role(client, user_headers, monkeypatch) -> None:
    from app.api.v1 import users as users_api

    monkeypatch.setattr(users_api.settings, "admin_invite_code", "test-admin-invite")
    response = client.post(
        "/api/v1/users/me/role",
        headers=user_headers,
        json={"invite_code": "test-admin-invite"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"


@pytest.mark.parametrize(
    "legacy_code",
    ["dragon", "manage", "xiandiancaiba", "xianchifanba"],
)
def test_legacy_invite_codes_are_rejected(client, user_headers, legacy_code) -> None:
    response = client.post(
        "/api/v1/users/me/role",
        headers=user_headers,
        json={"invite_code": legacy_code},
    )

    assert response.status_code == 422
    assert response.json()["message"] == "Invite code is invalid"


@pytest.mark.parametrize("size,expected", [(2 * 1024 * 1024, 200), (2 * 1024 * 1024 + 1, 422)])
def test_avatar_file_size_boundary(client, user_headers, size, expected):
    response = client.post("/api/v1/users/me/avatar", headers=user_headers,
                           files={"file": ("avatar.png", b"x" * size, "image/png")})
    assert response.status_code == expected


def test_avatar_rejects_large_request_before_multipart_parsing(client):
    response = client.post("/api/v1/users/me/avatar", content=b"x",
                           headers={"Content-Type": "multipart/form-data; boundary=test",
                                    "Content-Length": str(2 * 1024 * 1024 + 128 * 1024 + 1)})
    assert response.status_code == 413


def test_avatar_read_is_bounded_and_upload_is_closed():
    import asyncio
    from app.api.v1.users import upload_my_avatar
    from app.core.exceptions import ValidationAppError
    from app.utils.media import MAX_AVATAR_BYTES

    class Upload:
        content_type = "image/png"
        closed = False
        async def read(self, size=-1):
            assert size == MAX_AVATAR_BYTES + 1
            return b"x" * size
        async def close(self):
            self.closed = True

    upload = Upload()
    with pytest.raises(ValidationAppError):
        asyncio.run(upload_my_avatar(None, upload, None))
    assert upload.closed

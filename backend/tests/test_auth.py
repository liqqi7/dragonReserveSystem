from app.models import User


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


def test_wechat_login_ignores_profile_avatar(client, db_session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.exchange_wechat_code",
        lambda code: {"openid": "wx-openid-no-avatar", "session_key": "session-key"},
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
    user = db_session.query(User).filter_by(wechat_openid="wx-openid-no-avatar").one()
    assert user.nickname == "微信用户"
    assert user.avatar_url == ""


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

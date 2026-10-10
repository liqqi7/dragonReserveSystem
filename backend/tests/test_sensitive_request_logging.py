import logging

import httpx


def test_sensitive_upstream_requests_do_not_log_credentials(caplog):
    import app.core.logging  # noqa: F401

    def respond(request):
        return httpx.Response(200, json={"ok": True})

    with caplog.at_level(logging.INFO):
        with httpx.Client(transport=httpx.MockTransport(respond)) as client:
            for url, params in (
                ("https://api.weixin.qq.com/sns/jscode2session", {"secret": "wechat-secret-test"}),
                ("https://restapi.amap.com/v3/geocode/regeo", {"key": "amap-secret-test"}),
            ):
                assert client.get(url, params=params).status_code == 200
        logging.getLogger("dragon.reserve").info("ordinary application event")

    assert "wechat-secret-test" not in caplog.text
    assert "amap-secret-test" not in caplog.text
    assert "HTTP Request:" not in caplog.text
    assert "ordinary application event" in caplog.text

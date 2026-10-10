import httpx
from app.services import boardgame_http


def test_bgg_proxy_is_scoped_and_mock_transport_bypasses_it(monkeypatch):
    settings = boardgame_http.get_settings()
    monkeypatch.setattr(settings, "bgg_http_proxy", "http://127.0.0.1:18973")
    assert boardgame_http.request_options() == {"trust_env": False, "proxy": settings.bgg_http_proxy}
    transport = httpx.MockTransport(lambda req: httpx.Response(200, content=b"<items/>"))
    assert boardgame_http.request_options(transport) == {"trust_env": False, "transport": transport}
    with boardgame_http.client(transport) as client:
        assert client.get("https://boardgamegeek.com/xmlapi2/thing").content == b"<items/>"


def test_unconfigured_bgg_proxy_uses_direct_transport(monkeypatch):
    monkeypatch.setattr(boardgame_http.get_settings(), "bgg_http_proxy", "")
    assert boardgame_http.request_options() == {"trust_env": False}

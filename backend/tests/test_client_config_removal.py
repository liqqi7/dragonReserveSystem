"""The unused remote cache-version contract is no longer exposed."""

import importlib.util

import pytest

from app.core.config import Settings, get_settings


@pytest.mark.parametrize("authenticated", [False, True])
def test_client_config_is_removed_for_all_callers(client, admin_headers, authenticated):
    headers = admin_headers if authenticated else {}
    response = client.get("/api/v1/client-config", headers=headers)
    assert response.status_code == 404, response.text


def test_client_config_schema_modules_and_setting_are_removed(client):
    schema = client.app.openapi()
    assert "/api/v1/client-config" not in schema["paths"]
    assert "ClientConfigResponse" not in schema["components"]["schemas"]
    assert "client_cache_version" not in Settings.model_fields
    assert not hasattr(get_settings(), "client_cache_version")
    assert importlib.util.find_spec("app.api.v1.client_config") is None
    assert importlib.util.find_spec("app.schemas.client_config") is None
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v2/activities").status_code == 200

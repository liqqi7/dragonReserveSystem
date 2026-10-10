"""Approved unused operations stay absent, regardless of caller privileges."""

import pytest


@pytest.mark.parametrize("method,path,status", [
    ("get", "/api/v1/diagnostics/client-logs", 404),
    ("post", "/api/v1/diagnostics/client-logs/batch", 404),
    ("post", "/api/v1/diagnostics/anonymous-client-logs/batch", 404),
    ("get", "/api/v2/activities/me/signed-up", 404),
    ("get", "/api/v2/activities/1/share-preview", 404),
    ("delete", "/api/v2/activities/1", 405),
])
@pytest.mark.parametrize("caller", ["guest", "user", "admin"])
def test_removed_operations_are_unavailable(client, user_headers, admin_headers, method, path, status, caller):
    headers = {"guest": {}, "user": user_headers, "admin": admin_headers}[caller]
    assert client.request(method, path, headers=headers).status_code == status


def test_openapi_preserves_replacements_and_retires_diagnostic_uploads(client):
    schema = client.app.openapi()
    paths = schema["paths"]
    assert "/api/v1/diagnostics/client-logs" not in paths
    assert "/api/v2/activities/me/signed-up" not in paths
    assert "/api/v2/activities/{activity_id}/share-preview" not in paths
    assert "delete" not in paths["/api/v2/activities/{activity_id}"]
    assert {"get", "patch"} <= paths["/api/v2/activities/{activity_id}"].keys()
    for path in ("client-logs/batch", "anonymous-client-logs/batch"):
        assert f"/api/v1/diagnostics/{path}" not in paths
    assert "post" in paths["/api/v2/activities/{activity_id}/cancel"]
    assert "ActivitySharePreviewResponse" not in schema["components"]["schemas"]

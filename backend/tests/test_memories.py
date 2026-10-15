from io import BytesIO
import asyncio
import os
from pathlib import Path
import subprocess

from PIL import Image
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models.memory import Memory, MemoryCapacity, MemoryMedia
from app.services import memory_media, memory_service, memory_worker


@pytest.fixture(autouse=True)
def memory_settings(monkeypatch, tmp_path, db_session):
    settings = get_settings()
    for key, value in dict(memory_enabled=True, memory_publish_enabled=True,
        memory_storage_root=str(tmp_path / "private"), memory_capacity_bytes=1024**3,
        memory_min_free_bytes=0, memory_media_signing_key="s" * 64,
        wechat_app_id="test-app", public_base_url="https://example.test").items():
        monkeypatch.setattr(settings, key, value)
    db_session.add(MemoryCapacity(id=1, reserved_bytes=0))
    db_session.commit()


def picture(color="red", size=(200, 300), mode="RGB", format="JPEG"):
    stream = BytesIO()
    Image.new(mode, size, color).save(stream, format)
    return stream.getvalue()


def make_draft(client, headers, files=None, **extra):
    files = files or [picture()]
    payload = {"client_submission_id": "submission-123", "media": [
        {"kind": "image", "size": len(file)} for file in files], **extra}
    result = client.post("/api/v1/memory-drafts", headers=headers, json=payload)
    assert result.status_code == 201, result.text
    return result.json(), payload


def send_file(client, headers, draft, slot=0, data=None):
    return client.post(f"/api/v1/memory-drafts/{draft['id']}/media/{slot}", headers=headers,
                       files={"file": ("photo.jpg", data or picture(), "image/jpeg")})


def prepared(client, headers, db, count=1):
    draft, payload = make_draft(client, headers, [picture()] * count)
    for slot in range(count):
        assert send_file(client, headers, draft, slot).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=headers).status_code == 200
    for _ in range(count):
        assert memory_worker.process_one(db)
    memory = db.get(Memory, draft["id"])
    items = memory_service.assets(db, memory.id)
    return memory, items


def test_feature_disabled(client, user_headers, monkeypatch):
    monkeypatch.setattr(get_settings(), "memory_enabled", False)
    assert client.get("/api/v1/memories").status_code == 503


def test_individual_review_list_exposes_every_file(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=3)
    items[2].kind, items[2].duration = "video", 12
    db_session.commit()
    result = client.get("/api/v1/admin/memories?individual=true&status=pending", headers=admin_headers)
    assert result.status_code == 200
    body = result.json()
    assert body["pending_count"] == 3
    assert [item["id"] for item in body["items"][0]["media"]] == [item.id for item in items]
    assert body["items"][0]["id"] == memory.id


def individual_action(client, headers, memory, item, action, **extra):
    return client.post(f"/api/v1/admin/memories/{memory.id}/review", headers=headers, json={
        "individual": True, "action": action, "expected_revision": memory.revision,
        "selected_media_ids": [item.id], "manually_reviewed": action == "publish", **extra})


def test_public_individual_feed_exposes_all_published_files_but_no_private_siblings(
        client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=4)
    items[1].kind, items[1].duration = "video", 8
    db_session.commit()
    for item in items[:2]:
        assert individual_action(client, admin_headers, memory, item, "publish").status_code == 200
    assert individual_action(client, admin_headers, memory, items[2], "reject").status_code == 200
    legacy = client.get("/api/v1/memories").json()
    assert len(legacy["items"][0]["media"]) == 1
    response = client.get("/api/v1/memories?individual=true&limit=1")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    exposed = body["items"][0]
    assert exposed["media_count"] == 2
    assert [item["id"] for item in exposed["media"]] == [item.id for item in items[:2]]
    assert {item["kind"] for item in exposed["media"]} == {"image", "video"}
    for item in exposed["media"]:
        assert item["url"] and item["thumbnail_url"]
        assert not {"state", "publication_status", "original_bytes"} & item.keys()
        assert "actor=" not in item["url"] and "signature=" not in item["url"]
    assert "status_counts" not in body and "revision" not in exposed
    for item in items[2:]:
        assert client.get(f"/api/v1/memory-media/{item.id}").status_code == 404
    assert individual_action(client, admin_headers, memory, items[1], "offline").status_code == 200
    remaining = client.get("/api/v1/memories?individual=true").json()
    assert [item["id"] for item in remaining["items"][0]["media"]] == [items[0].id]


def test_failed_compression_keeps_original_and_manual_retry_reaches_review(client, user_headers, admin_headers,
                                                                          db_session, monkeypatch):
    draft, _ = make_draft(client, user_headers)
    assert send_file(client, user_headers, draft).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=user_headers).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    item = memory_service.assets(db_session, memory.id)[0]
    original = memory_media.private_path(memory_service.storage_root(), item.original_key)
    reservation = item.reserved_bytes
    def broken(*args):
        raise RuntimeError("测试压缩失败")
    with monkeypatch.context() as patch:
        patch.setattr(memory_media, "compress_image", broken)
        for _ in range(3):
            assert memory_worker.process_one(db_session)
    assert item.state == "failed" and item.attempts == 3
    assert original.exists() and memory.status == "failed"
    assert individual_action(client, admin_headers, memory, item, "publish").status_code == 409
    assert individual_action(client, admin_headers, memory, item, "reject").status_code == 409
    assert individual_action(client, user_headers, memory, item, "retry").status_code == 403
    assert individual_action(client, admin_headers, memory, item, "retry", expected_revision=999).status_code == 409
    assert individual_action(client, admin_headers, memory, item, "retry", individual=False).status_code == 409
    result = individual_action(client, admin_headers, memory, item, "retry")
    assert result.status_code == 200, result.text
    assert memory.status == "processing" and item.state == "uploaded" and item.attempts == 0
    assert item.reserved_bytes == reservation == db_session.get(MemoryCapacity, 1).reserved_bytes
    assert individual_action(client, admin_headers, memory, item, "retry").status_code == 409
    assert client.get("/api/v1/admin/memories?individual=true&status=pending", headers=admin_headers).json()["items"] == []
    assert memory_worker.process_one(db_session)
    assert item.state == "ready" and memory.status == "pending"
    assert not original.exists() and item.original_key == ""
    assert memory_media.private_path(memory_service.storage_root(), item.display_key).is_file()
    assert memory_media.private_path(memory_service.storage_root(), item.thumbnail_key).is_file()
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == item.reserved_bytes < reservation


def test_retry_mixed_submission_preserves_public_and_cleaned_siblings(client, user_headers, admin_headers,
                                                                    db_session, monkeypatch):
    draft, _ = make_draft(client, user_headers, [picture()] * 3)
    for slot in range(3):
        assert send_file(client, user_headers, draft, slot).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=user_headers).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    items = memory_service.assets(db_session, memory.id)
    assert memory_worker.process_one(db_session)
    assert individual_action(client, admin_headers, memory, items[0], "publish").status_code == 200
    def broken(*args):
        raise RuntimeError("测试压缩失败")
    with monkeypatch.context() as patch:
        patch.setattr(memory_media, "compress_image", broken)
        for _ in range(3):
            assert memory_worker.process_one(db_session)
    assert memory_worker.process_one(db_session)
    assert individual_action(client, admin_headers, memory, items[2], "reject").status_code == 200
    assert client.post(f"/api/v1/admin/memories/{memory.id}/cleanup", headers=admin_headers, json={
        "expected_revision": memory.revision, "media_id": items[2].id, "confirmed": True}).status_code == 200
    public_url = f"/api/v1/memory-media/{items[0].id}"
    public_bytes = client.get(public_url).content
    ledger = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert individual_action(client, admin_headers, memory, items[1], "retry").status_code == 200
    assert memory.status == "published"
    processing = client.get("/api/v1/admin/memories?individual=true&status=processing", headers=admin_headers).json()
    assert [item["id"] for item in processing["items"][0]["media"]] == [items[1].id]
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == ledger
    assert client.get(public_url).content == public_bytes
    assert memory_worker.process_one(db_session)
    assert memory.status == "published" and items[1].state == "ready"
    assert items[2].state == "cleaned"
    pending = client.get("/api/v1/admin/memories?individual=true&status=pending", headers=admin_headers).json()
    assert [item["id"] for item in pending["items"][0]["media"]] == [items[1].id]
    assert client.get(public_url).content == public_bytes
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == sum(item.reserved_bytes for item in items)


@pytest.mark.parametrize("count", [1, 2])
def test_republish_restores_only_offline_file_and_delete_removes_actual_files(client, user_headers, admin_headers,
                                                                            db_session, monkeypatch, count):
    memory, items = prepared(client, user_headers, db_session, count=count)
    for item in items:
        assert individual_action(client, admin_headers, memory, item, "publish").status_code == 200
    item = items[0]
    paths = [memory_media.private_path(memory_service.storage_root(), key)
             for key in (item.display_key, item.thumbnail_key)]
    file_bytes = [path.read_bytes() for path in paths]
    ledger = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert individual_action(client, admin_headers, memory, item, "offline").status_code == 200
    assert client.get(f"/api/v1/memory-media/{item.id}").status_code == 404
    assert individual_action(client, user_headers, memory, item, "republish").status_code == 403
    assert individual_action(client, admin_headers, memory, item, "republish", expected_revision=999).status_code == 409
    monkeypatch.setattr(get_settings(), "memory_publish_enabled", False)
    assert individual_action(client, admin_headers, memory, item, "republish").status_code == 503
    monkeypatch.setattr(get_settings(), "memory_publish_enabled", True)
    result = individual_action(client, admin_headers, memory, item, "republish")
    assert result.status_code == 200, result.text
    assert item.publication_status == "published" and memory.status == "published"
    assert [path.read_bytes() for path in paths] == file_bytes
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == ledger
    assert client.get(f"/api/v1/memories/{memory.id}").json()["media_count"] == count
    assert individual_action(client, admin_headers, memory, item, "republish").status_code == 409
    assert individual_action(client, admin_headers, memory, item, "offline").status_code == 200
    cleanup = f"/api/v1/admin/memories/{memory.id}/cleanup"
    body = {"expected_revision": memory.revision, "media_id": item.id, "confirmed": False}
    assert client.post(cleanup, headers=admin_headers, json=body).status_code == 409
    assert all(path.exists() for path in paths)
    assert client.post(cleanup, headers=admin_headers, json={**body, "confirmed": True}).status_code == 200
    assert not any(path.exists() for path in paths)
    assert item.original_key == item.display_key == item.thumbnail_key == ""
    assert item.state == "cleaned" and item.reserved_bytes == 0
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == sum(value.reserved_bytes for value in items)
    assert individual_action(client, admin_headers, memory, item, "republish").status_code == 409


def test_recovery_refuses_missing_files(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session)
    item = items[0]
    item.state, item.attempts, memory.status = "failed", 3, "failed"
    db_session.commit()
    assert individual_action(client, admin_headers, memory, item, "retry").status_code == 409
    assert item.state == "failed" and item.attempts == 3
    item.state, item.publication_status, memory.status = "ready", "offline", "offline"
    db_session.commit()
    memory_media.private_path(memory_service.storage_root(), item.thumbnail_key).unlink()
    assert individual_action(client, admin_headers, memory, item, "republish").status_code == 409
    assert item.publication_status == "offline"


def test_retry_can_fail_again_and_confirmed_delete_releases_original(client, user_headers, admin_headers,
                                                                    db_session, monkeypatch):
    draft, _ = make_draft(client, user_headers)
    assert send_file(client, user_headers, draft).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=user_headers).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    item = memory_service.assets(db_session, memory.id)[0]
    original = memory_media.private_path(memory_service.storage_root(), item.original_key)
    def broken(*args):
        raise RuntimeError("测试再次压缩失败")
    monkeypatch.setattr(memory_media, "compress_image", broken)
    for _ in range(3):
        assert memory_worker.process_one(db_session)
    assert individual_action(client, admin_headers, memory, item, "retry").status_code == 200
    for _ in range(3):
        assert memory_worker.process_one(db_session)
    assert item.state == "failed" and item.attempts == 3 and original.exists()
    assert client.post(f"/api/v1/admin/memories/{memory.id}/cleanup", headers=admin_headers, json={
        "expected_revision": memory.revision, "media_id": item.id, "confirmed": True}).status_code == 200
    assert not original.exists() and item.state == "cleaned"
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0


def test_worker_recovers_original_disposal_in_a_published_submission(client, user_headers, admin_headers,
                                                                   db_session, monkeypatch):
    draft, _ = make_draft(client, user_headers)
    assert send_file(client, user_headers, draft).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=user_headers).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    item = memory_service.assets(db_session, memory.id)[0]
    original = memory_media.private_path(memory_service.storage_root(), item.original_key)
    unlink = Path.unlink
    def interrupted(path, *args, **kwargs):
        if path == original:
            raise OSError("测试中断原件删除")
        return unlink(path, *args, **kwargs)
    with monkeypatch.context() as patch:
        patch.setattr(Path, "unlink", interrupted)
        with pytest.raises(OSError):
            memory_worker.process_one(db_session)
    db_session.rollback()
    assert item.state == "ready" and item.original_key and original.exists()
    assert individual_action(client, admin_headers, memory, item, "publish").status_code == 200
    revision = memory.revision
    assert memory.status == "published"
    assert not memory_worker.process_one(db_session)
    assert not original.exists() and item.original_key == ""
    assert memory.status == "published" and memory.revision > revision
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == item.reserved_bytes
    revision = memory.revision
    assert not memory_worker.process_one(db_session)
    assert memory.revision == revision


def test_six_admin_filters_use_resource_states_not_parent_state(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=6)
    items[0].state = "working"
    items[1].state = "failed"
    items[3].publication_status = "published"
    items[4].publication_status = "offline"
    items[5].publication_status = "excluded"
    memory.status = "published"
    db_session.commit()
    for status, item in zip(("processing", "failed", "pending", "published", "offline", "rejected"), items):
        result = client.get(f"/api/v1/admin/memories?individual=true&status={status}", headers=admin_headers)
        assert result.status_code == 200
        assert [value["id"] for value in result.json()["items"][0]["media"]] == [item.id]
    assert client.get("/api/v1/admin/memories?status=draft", headers=admin_headers).status_code == 422


def test_status_counts_are_global_resources_not_paginated_submissions(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=6)
    items[0].state = "working"
    items[1].state = "failed"
    items[3].publication_status = "published"
    items[4].publication_status = "offline"
    items[5].publication_status = "excluded"
    memory.status = "published"
    other = Memory(user_id=memory.user_id, client_submission_id="count-second", status="pending",
                   expires_at=memory.expires_at, author_nickname=memory.author_nickname)
    db_session.add(other)
    db_session.flush()
    db_session.add(MemoryMedia(memory_id=other.id, sort=0, kind="image", state="ready",
                               declared_bytes=0, reserved_bytes=0))
    for slot, state in [(6, "cleaned"), (7, "removed")]:
        db_session.add(MemoryMedia(memory_id=memory.id, sort=slot, kind="image", state=state,
                                  publication_status="excluded", declared_bytes=0, reserved_bytes=0))
    db_session.commit()
    make_draft(client, user_headers, client_submission_id="counts-unsubmitted")
    expected = dict(processing=1, failed=1, pending=2, published=1, offline=1, rejected=1)
    body = client.get("/api/v1/admin/memories?individual=true&status=pending&limit=1", headers=admin_headers).json()
    assert body["cursor"] and len(body["items"]) == 1
    assert body["status_counts"] == expected and body["pending_count"] == 2
    next_page = client.get(f"/api/v1/admin/memories?individual=true&status=pending&limit=1&cursor={body['cursor']}",
                           headers=admin_headers).json()
    assert next_page["status_counts"] == expected
    url = "/api/v1/admin/memories/counts"
    assert client.get(url, headers=admin_headers).json() == {"status_counts": expected}
    assert client.get(url, headers=user_headers).status_code == 403
    assert client.get(url).status_code == 401
    public = client.get("/api/v1/memories").json()
    assert "status_counts" not in public and "pending_count" not in public


def test_empty_status_counts_include_six_zeroes(client, admin_headers):
    result = client.get("/api/v1/admin/memories/counts", headers=admin_headers)
    assert result.status_code == 200
    assert result.json()["status_counts"] == dict.fromkeys(memory_service.SUBMITTED_STATUSES, 0)


@pytest.mark.parametrize("count", [1, 2])
def test_rejected_resource_returns_to_review_without_publishing_or_changing_siblings(client, user_headers,
                                                                                     admin_headers, db_session, count):
    memory, items = prepared(client, user_headers, db_session, count=count)
    item = items[0]
    assert individual_action(client, admin_headers, memory, item, "reject").status_code == 200
    if count == 2:
        assert individual_action(client, admin_headers, memory, items[1], "publish").status_code == 200
    paths = [memory_media.private_path(memory_service.storage_root(), key) for key in (item.display_key, item.thumbnail_key)]
    content = [path.read_bytes() for path in paths]
    capacity = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert individual_action(client, user_headers, memory, item, "reopen").status_code == 403
    assert individual_action(client, admin_headers, memory, item, "reopen", expected_revision=999).status_code == 409
    assert individual_action(client, admin_headers, memory, item, "reopen", individual=False).status_code == 409
    result = individual_action(client, admin_headers, memory, item, "reopen")
    assert result.status_code == 200, result.text
    assert item.publication_status == "unreviewed" and item.state == "ready"
    assert memory.status == ("published" if count == 2 else "pending")
    assert [path.read_bytes() for path in paths] == content
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == capacity
    counts = client.get("/api/v1/admin/memories/counts", headers=admin_headers).json()["status_counts"]
    assert counts["pending"] == 1 and counts["rejected"] == 0 and counts["published"] == count - 1
    assert client.get(f"/api/v1/memory-media/{item.id}").status_code == 404
    if count == 2:
        public = client.get(f"/api/v1/memories/{memory.id}").json()
        assert [value["id"] for value in public["media"]] == [items[1].id]
    assert individual_action(client, admin_headers, memory, item, "reopen").status_code == 409
    assert individual_action(client, admin_headers, memory, item, "publish", manually_reviewed=False).status_code == 409
    assert individual_action(client, admin_headers, memory, item, "reject").status_code == 200
    assert client.post(f"/api/v1/admin/memories/{memory.id}/cleanup", headers=admin_headers, json={
        "expected_revision": memory.revision, "media_id": item.id, "confirmed": True}).status_code == 200
    assert individual_action(client, admin_headers, memory, item, "reopen").status_code == 409


@pytest.mark.parametrize("change", ["failed", "missing"])
def test_reopen_requires_processed_files(client, user_headers, admin_headers, db_session, change):
    memory, items = prepared(client, user_headers, db_session)
    item = items[0]
    assert individual_action(client, admin_headers, memory, item, "reject").status_code == 200
    if change == "failed":
        item.state = "failed"
        db_session.commit()
    else:
        memory_media.private_path(memory_service.storage_root(), item.display_key).unlink()
    assert individual_action(client, admin_headers, memory, item, "reopen").status_code == 409
    assert item.publication_status == "excluded"


def test_individual_publish_reject_cleanup_leave_siblings_untouched(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=2)
    path = f"/api/v1/admin/memories/{memory.id}"
    body = {"individual": True, "action": "publish", "expected_revision": memory.revision,
            "selected_media_ids": [items[0].id], "manually_reviewed": True}
    result = client.post(path + "/review", headers=admin_headers, json=body)
    assert result.status_code == 200, result.text
    pending = client.get("/api/v1/admin/memories?individual=true", headers=admin_headers).json()
    assert pending["pending_count"] == 1
    assert [item["id"] for item in pending["items"][0]["media"]] == [items[1].id]
    public = client.get(f"/api/v1/memories/{memory.id}").json()
    assert [item["id"] for item in public["media"]] == [items[0].id]
    assert client.get(f"/api/v1/memory-media/{items[1].id}").status_code == 404
    preview = client.get(path + f"/cleanup?media_id={items[1].id}", headers=admin_headers).json()
    assert preview["allowed"] is False
    result = client.post(path + "/review", headers=admin_headers, json={**body, "action": "reject",
        "expected_revision": result.json()["revision"], "selected_media_ids": [items[1].id]})
    assert result.status_code == 200, result.text
    rejected = client.get("/api/v1/admin/memories?individual=true&status=rejected", headers=admin_headers).json()
    assert [item["id"] for item in rejected["items"][0]["media"]] == [items[1].id]
    preview = client.get(path + f"/cleanup?media_id={items[1].id}", headers=admin_headers).json()
    assert preview["allowed"] and preview["bytes"] == items[1].reserved_bytes
    sibling_file = memory_media.private_path(memory_service.storage_root(), items[0].display_key)
    cleanup = {"media_id": items[1].id, "expected_revision": preview["revision"], "confirmed": True}
    assert client.post(path + "/cleanup", headers=admin_headers, json=cleanup).status_code == 200
    assert client.post(path + "/cleanup", headers=admin_headers, json=cleanup).status_code == 200
    assert sibling_file.exists()
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == items[0].reserved_bytes
    assert client.get(f"/api/v1/memory-media/{items[0].id}").status_code == 200
    assert client.get("/api/v1/admin/memories?individual=true&status=rejected", headers=admin_headers).json()["items"] == []


def test_individual_second_publish_and_offline_preserve_other_public_file(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, count=2)
    path = f"/api/v1/admin/memories/{memory.id}/review"
    revision = memory.revision
    for item in items:
        result = client.post(path, headers=admin_headers, json={"individual": True, "action": "publish",
            "expected_revision": revision, "selected_media_ids": [item.id], "manually_reviewed": True})
        assert result.status_code == 200, result.text
        revision = result.json()["revision"]
    assert client.get(f"/api/v1/memories/{memory.id}").json()["media_count"] == 2
    result = client.post(path, headers=admin_headers, json={"individual": True, "action": "offline",
        "expected_revision": revision, "selected_media_ids": [items[0].id]})
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "published"
    public = client.get(f"/api/v1/memories/{memory.id}").json()
    assert [item["id"] for item in public["media"]] == [items[1].id]
    offline = client.get("/api/v1/admin/memories?individual=true&status=offline", headers=admin_headers).json()
    assert [item["id"] for item in offline["items"][0]["media"]] == [items[0].id]
    assert client.get(f"/api/v1/memory-media/{items[0].id}").status_code == 404


@pytest.mark.parametrize("change", [{"selected_media_ids": []}, {"selected_media_ids": [99999]},
    {"selected_media_ids": [1, 2]}, {"manually_reviewed": False}, {"expected_revision": 999}])
def test_individual_review_keeps_selection_and_manual_guards(client, user_headers, admin_headers, db_session, change):
    memory, items = prepared(client, user_headers, db_session, count=2)
    body = {"individual": True, "action": "publish", "expected_revision": memory.revision,
            "selected_media_ids": [items[0].id], "manually_reviewed": True, **change}
    path = f"/api/v1/admin/memories/{memory.id}/review"
    assert client.post(path, headers=user_headers, json=body).status_code == 403
    assert client.post(path, headers=admin_headers, json=body).status_code == 409
    db_session.refresh(items[0])
    assert items[0].publication_status == "unreviewed"


def test_anonymous_and_guest_cannot_submit(client, normal_user, user_headers, db_session):
    payload = {"client_submission_id": "submission-123", "media": [{"kind": "image", "size": 100}]}
    assert client.post("/api/v1/memory-drafts", json=payload).status_code == 401
    normal_user.role = "guest"
    db_session.commit()
    assert client.post("/api/v1/memory-drafts", headers=user_headers, json=payload).status_code == 403


@pytest.mark.parametrize("media", [[{"kind": "image", "size": 100}] * 11,
    [{"kind": "image", "size": 20 * 1024**2 + 1}], [{"kind": "video", "size": 20 * 1024**2 + 1}]])
def test_original_admission_limits(client, user_headers, media):
    response = client.post("/api/v1/memory-drafts", headers=user_headers,
                           json={"client_submission_id": "submission-123", "media": media})
    assert response.status_code == 422


@pytest.mark.parametrize("size", [5 * 1024**2 + 1, 20 * 1024**2])
def test_images_above_previous_limit_upload_and_compress(client, user_headers, db_session, size):
    content = picture()
    content += b"\0" * (size - len(content))
    draft, _ = make_draft(client, user_headers, [content])
    assert send_file(client, user_headers, draft, data=content).status_code == 200
    assert client.post(f"/api/v1/memory-drafts/{draft['id']}/submit", headers=user_headers).status_code == 200
    assert memory_worker.process_one(db_session)
    memory = db_session.get(Memory, draft["id"])
    item = memory_service.assets(db_session, memory.id)[0]
    assert memory.status == "pending"
    assert item.state == "ready"
    assert item.original_bytes == size
    assert item.reserved_bytes <= memory_media.IMAGE_OUTPUT_MAX_BYTES


def test_no_per_person_daily_quota(client, user_headers, db_session):
    for number in range(5):
        make_draft(client, user_headers, client_submission_id=f"submission-{number}")
    assert len(list(db_session.scalars(select(Memory)))) == 5


def test_capacity_and_idempotency(client, user_headers, db_session, monkeypatch):
    draft, payload = make_draft(client, user_headers)
    reserved = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert client.post("/api/v1/memory-drafts", headers=user_headers, json=payload).json()["id"] == draft["id"]
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == reserved
    payload["caption"] = "different"
    assert client.post("/api/v1/memory-drafts", headers=user_headers, json=payload).status_code == 409
    monkeypatch.setattr(get_settings(), "memory_capacity_bytes", reserved)
    payload["client_submission_id"] = "submission-new"
    assert client.post("/api/v1/memory-drafts", headers=user_headers, json=payload).status_code == 503


def test_private_draft_upload_and_freeze(client, user_headers, second_user_headers):
    draft, _ = make_draft(client, user_headers)
    path = f"/api/v1/memory-drafts/{draft['id']}"
    assert client.get(path, headers=second_user_headers).status_code == 404
    assert client.get(f"/api/v1/memories/{draft['id']}").status_code == 404
    assert send_file(client, second_user_headers, draft).status_code == 404
    assert send_file(client, user_headers, draft).status_code == 200
    assert send_file(client, user_headers, draft).status_code == 200
    assert client.post(path + "/submit", headers=user_headers).status_code == 200
    assert client.post(path + "/submit", headers=user_headers).status_code == 200
    assert send_file(client, user_headers, draft).status_code == 409
    assert client.get(path, headers=user_headers).status_code == 409
    assert client.delete(path, headers=user_headers).status_code == 409


def empty_draft(client, headers, key="preupload-session"):
    result = client.post("/api/v1/memory-drafts", headers=headers,
                         json={"client_submission_id": key, "media": []})
    assert result.status_code == 201, result.text
    return result.json()


def declare_file(client, headers, draft, slot=0):
    return client.put(f"/api/v1/memory-drafts/{draft['id']}/media/{slot}", headers=headers,
                      json={"kind": "image", "size": len(picture())})


def test_preupload_is_private_and_final_metadata_is_submitted_atomically(client, user_headers, db_session):
    draft = empty_draft(client, user_headers)
    path = f"/api/v1/memory-drafts/{draft['id']}"
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0
    assert client.post(path + "/submit", headers=user_headers).status_code == 409
    assert declare_file(client, user_headers, draft).status_code == 200
    assert send_file(client, user_headers, draft).status_code == 200
    assert not memory_worker.process_one(db_session)
    assert db_session.get(Memory, draft["id"]).status == "draft"
    assert client.get("/api/v1/memories").json()["items"] == []
    # A repeated create acknowledgement does not reserve twice or erase uploaded slots.
    assert empty_draft(client, user_headers)["id"] == draft["id"]
    assert declare_file(client, user_headers, draft).json()["state"] == "uploaded"
    assert client.post(path + "/submit", headers=user_headers,
                       json={"caption": "最终备注", "location_name": "最终地点"}).status_code == 200
    assert client.post(path + "/submit", headers=user_headers,
                       json={"caption": "不应覆盖"}).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    assert (memory.caption, memory.location_name, memory.status) == ("最终备注", "最终地点", "processing")


def test_preupload_delete_reclaims_bytes_and_prevents_late_resurrection(client, user_headers, second_user_headers, db_session):
    draft = empty_draft(client, user_headers)
    path = f"/api/v1/memory-drafts/{draft['id']}/media/0"
    assert declare_file(client, second_user_headers, draft).status_code == 404
    assert declare_file(client, user_headers, draft).status_code == 200
    assert send_file(client, user_headers, draft).status_code == 200
    item = memory_service.assets(db_session, draft["id"])[0]
    original = memory_media.private_path(memory_service.storage_root(), item.original_key)
    assert client.delete(path, headers=second_user_headers).status_code == 404
    assert client.delete(path, headers=user_headers).status_code == 200
    assert client.delete(path, headers=user_headers).status_code == 200
    assert not original.exists()
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0
    assert declare_file(client, user_headers, draft).status_code == 409
    assert send_file(client, user_headers, draft).status_code == 404
    assert client.get(f"/api/v1/memory-drafts/{draft['id']}", headers=user_headers).json()["media"] == []
    # A deletion that arrives before declaration also leaves a tombstone.
    assert client.delete(path[:-1] + "1", headers=user_headers).status_code == 200
    assert declare_file(client, user_headers, draft, 1).status_code == 409


def test_preupload_active_limit_and_cancel(client, user_headers, db_session):
    draft = empty_draft(client, user_headers)
    path = f"/api/v1/memory-drafts/{draft['id']}"
    for slot in range(10):
        assert declare_file(client, user_headers, draft, slot).status_code == 200
    reserved = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert declare_file(client, user_headers, draft, 0).status_code == 200
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == reserved
    assert declare_file(client, user_headers, draft, 10).status_code == 409
    assert client.delete(path + "/media/3", headers=user_headers).status_code == 200
    assert declare_file(client, user_headers, draft, 10).status_code == 200
    assert send_file(client, user_headers, draft, 10).status_code == 200
    assert client.delete(path, headers=user_headers).status_code == 200
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0
    assert not any(memory_service.storage_root().rglob("original-*"))


def test_expiry_only_reclaims_unsubmitted_sessions_including_partial_files(client, user_headers, db_session):
    from datetime import timedelta
    from app.utils.app_time import app_now
    draft = empty_draft(client, user_headers)
    assert declare_file(client, user_headers, draft).status_code == 200
    assert send_file(client, user_headers, draft).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    item = memory_service.assets(db_session, memory.id)[0]
    directory = memory_media.private_path(memory_service.storage_root(), f"{memory.id}/{item.id}")
    (directory / "original-interrupted.bin").write_bytes(b"partial abandoned transfer")
    memory.expires_at = app_now() - timedelta(seconds=1)
    db_session.commit()
    assert memory_service.expire_one_draft(db_session)
    assert not directory.exists()
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0
    assert memory.status == "cleaned"
    assert not memory_service.expire_one_draft(db_session)


@pytest.mark.parametrize("status", ["processing", "pending", "rejected", "offline", "published", "failed"])
def test_expiry_never_cleans_submitted_memories(client, user_headers, db_session, status):
    from datetime import timedelta
    from app.utils.app_time import app_now
    draft, _ = make_draft(client, user_headers)
    assert send_file(client, user_headers, draft).status_code == 200
    memory = db_session.get(Memory, draft["id"])
    memory.status = status
    memory.expires_at = app_now() - timedelta(days=2)
    db_session.commit()
    reserved = db_session.get(MemoryCapacity, 1).reserved_bytes
    assert not memory_service.expire_one_draft(db_session)
    assert memory.status == status
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == reserved
    assert any(memory_service.storage_root().rglob("original-*"))


def test_upload_activity_extends_expiry_and_invalid_files_leave_no_partial_bytes(client, user_headers, db_session):
    from datetime import timedelta
    from app.utils.app_time import app_now
    draft = empty_draft(client, user_headers)
    memory = db_session.get(Memory, draft["id"])
    memory.expires_at = app_now() + timedelta(minutes=1)
    db_session.commit()
    assert declare_file(client, user_headers, draft).status_code == 200
    assert memory.expires_at > app_now() + timedelta(hours=23)
    assert send_file(client, user_headers, draft, data=b"bad").status_code == 422
    assert not any(memory_service.storage_root().rglob("original-*"))


def test_missing_login_user_is_an_authentication_error_not_a_resource_error(client):
    from app.core.security import create_access_token
    headers = {"Authorization": "Bearer " + create_access_token(subject="999999", role="user")}
    assert client.get("/api/v1/users/me", headers=headers).status_code == 401
    assert client.post("/api/v1/memory-drafts", headers=headers,
                       json={"client_submission_id": "preupload-session"}).status_code == 401


def test_bounded_real_bytes_and_invalid_image(client, user_headers):
    draft, _ = make_draft(client, user_headers)
    assert send_file(client, user_headers, draft, data=picture() + b"oversize").status_code == 413
    assert send_file(client, user_headers, draft, data=b"x" * len(picture())).status_code == 422


def test_partial_publish_visibility_range_and_offline(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session, 2)
    assert memory.status == "pending"
    summary = client.get("/api/v1/admin/memories?status=pending", headers=admin_headers).json()["items"][0]
    assert len(summary["media"]) == 1
    assert summary["image_count"] == 2
    assert summary["video_count"] == 0
    assert summary["total_duration"] == 0
    assert summary["total_original_bytes"] == sum(item.original_bytes for item in items)
    assert client.get(f"/api/v1/memory-media/{items[0].id}").status_code == 404
    result = client.post(f"/api/v1/admin/memories/{memory.id}/review", headers=admin_headers,
        json={"action": "publish", "expected_revision": memory.revision, "selected_media_ids": [items[1].id], "manually_reviewed": True})
    assert result.status_code == 200, result.text
    public = client.get(f"/api/v1/memories/{memory.id}").json()
    assert public["media_count"] == 1
    assert public["media"][0]["id"] == items[1].id
    assert "security" not in public["media"][0]
    assert not {"total_original_bytes", "total_duration", "image_count", "video_count"} & public.keys()
    assert client.get(f"/api/v1/memory-media/{items[0].id}").status_code == 404
    path = f"/api/v1/memory-media/{items[1].id}"
    assert client.get(path).status_code == 200
    response = client.get(path, headers={"Range": "bytes=0-9"})
    assert response.status_code == 206
    assert len(response.content) == 10
    assert client.head(path).content == b""
    assert client.post(f"/api/v1/admin/memories/{memory.id}/review", headers=admin_headers,
        json={"action": "offline", "expected_revision": result.json()["revision"]}).status_code == 200
    assert client.get(path).status_code == 404
    assert client.get(f"/api/v1/memories/{memory.id}").status_code == 404


@pytest.mark.parametrize("state", ["waiting", "uploaded", "working", "failed"])
def test_unprocessed_media_cannot_publish(client, user_headers, admin_headers, db_session, state):
    memory, items = prepared(client, user_headers, db_session)
    items[0].state = state
    db_session.commit()
    assert client.post(f"/api/v1/admin/memories/{memory.id}/review", headers=admin_headers,
        json={"action": "publish", "expected_revision": memory.revision, "selected_media_ids": [items[0].id],
              "manually_reviewed": True}).status_code == 409


def test_revision_permission_and_selection_guards(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session)
    path = f"/api/v1/admin/memories/{memory.id}/review"
    payload = {"action": "publish", "expected_revision": memory.revision, "selected_media_ids": [items[0].id], "manually_reviewed": True}
    assert client.post(path, headers=user_headers, json=payload).status_code == 403
    for change in ({"expected_revision": 999}, {"selected_media_ids": []},
                   {"selected_media_ids": [999]}, {"selected_media_ids": [items[0].id] * 2}):
        assert client.post(path, headers=admin_headers, json={**payload, **change}).status_code == 409


def test_signed_preview_scope_expiry_and_revocation(client, user_headers, admin_headers, admin_user, db_session):
    memory, items = prepared(client, user_headers, db_session)
    detail = client.get(f"/api/v1/admin/memories/{memory.id}", headers=admin_headers).json()
    url = detail["media"][0]["url"]
    assert client.get(url).status_code == 200
    assert client.get(url.replace("variant=display", "variant=thumbnail")).status_code == 404
    assert client.get(url.replace(f"actor={admin_user.id}", "actor=0")).status_code == 404
    import re
    assert client.get(re.sub(r"expires=\d+", "expires=0", url)).status_code == 404
    admin_user.role = "user"
    db_session.commit()
    assert client.get(url).status_code == 404


def test_cancel_manual_cleanup_and_no_auto_deletion(client, user_headers, admin_headers, db_session):
    memory, items = prepared(client, user_headers, db_session)
    path = f"/api/v1/admin/memories/{memory.id}"
    assert client.get(path + "/cleanup", headers=admin_headers).json()["allowed"] is False
    assert client.post(path + "/review", headers=admin_headers, json={"action": "reject",
        "expected_revision": memory.revision}).status_code == 200
    preview = client.get(path + "/cleanup", headers=admin_headers).json()
    file = memory_media.private_path(memory_service.storage_root(), items[0].display_key)
    assert file.exists()
    assert client.post(path + "/cleanup", headers=admin_headers,
        json={"expected_revision": preview["revision"]}).status_code == 409
    assert client.post(path + "/cleanup", headers=admin_headers,
        json={"expected_revision": preview["revision"], "confirmed": True}).status_code == 200
    assert not file.exists()
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0
    assert client.post(path + "/cleanup", headers=admin_headers,
        json={"expected_revision": preview["revision"], "confirmed": True}).status_code == 200
    assert db_session.get(MemoryCapacity, 1).reserved_bytes == 0


@pytest.mark.parametrize("kind", ["image", "video"])
def test_publish_requires_explicit_manual_review_for_every_kind(client, user_headers, admin_headers, db_session, kind):
    memory, items = prepared(client, user_headers, db_session)
    item = items[0]
    item.kind = kind
    db_session.commit()
    path = f"/api/v1/admin/memories/{memory.id}/review"
    body = {"action": "publish", "expected_revision": memory.revision, "selected_media_ids": [item.id]}
    assert client.post(path, headers=admin_headers, json=body).status_code == 409
    assert client.get(f"/api/v1/memories/{memory.id}").status_code == 404
    assert client.post(path, headers=admin_headers, json={**body, "manually_reviewed": True}).status_code == 200


def test_standard_image_outputs_and_metadata(tmp_path):
    source = tmp_path / "photo.jpg"
    source.write_bytes(picture(size=(2500, 1000)))
    result = memory_media.compress_image(source, tmp_path / "processed")
    assert (result.width, result.height) == (1920, 768)
    with Image.open(result.display) as image:
        assert image.format == "JPEG"
        assert not image.getexif()
    with Image.open(result.thumbnail) as image:
        assert image.width == 600
    assert source.exists()


def test_transparency_and_no_upscaling(tmp_path):
    source = tmp_path / "alpha.png"
    source.write_bytes(picture(color=(10, 20, 30, 128), mode="RGBA", size=(60, 40), format="PNG"))
    result = memory_media.compress_image(source, tmp_path / "processed")
    with Image.open(result.display) as image:
        assert image.size == (60, 40)
        assert image.getpixel((0, 0))[3] == 128


def test_original_oversize_cannot_be_compressed_to_bypass_limit(tmp_path):
    source = tmp_path / "photo.jpg"
    source.write_bytes(picture() + b"\0" * memory_media.IMAGE_MAX_BYTES)
    with pytest.raises(AppError) as error:
        memory_media.compress_image(source, tmp_path / "processed")
    assert error.value.status_code == 413


@pytest.mark.parametrize("key", ["../outside", "/outside", "", "."])
def test_private_path_rejects_escape(tmp_path, key):
    with pytest.raises(AppError):
        memory_media.private_path(tmp_path, key)


def test_manual_review_has_no_automatic_security_endpoints_or_fields(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert not any("content-security" in path or "retry-check" in path for path in paths)
    assert "text_security" not in Memory.__table__.c
    assert "security" not in MemoryMedia.__table__.c
    assert "trace_id" not in MemoryMedia.__table__.c


def test_processed_submission_reaches_admin_without_wechat_credentials_or_network(client, user_headers, db_session, normal_user, monkeypatch):
    import httpx
    def forbid_network(*args, **kwargs):
        raise AssertionError("Memory processing must not call WeChat detection")
    monkeypatch.setattr(httpx, "get", forbid_network)
    monkeypatch.setattr(httpx, "post", forbid_network)
    monkeypatch.setattr(get_settings(), "wechat_app_id", "")
    monkeypatch.setattr(get_settings(), "wechat_app_secret", "")
    normal_user.wechat_openid = None
    db_session.commit()
    memory, items = prepared(client, user_headers, db_session)
    item = items[0]
    assert memory.status == "pending"
    assert item.state == "ready"
    assert memory_media.private_path(memory_service.storage_root(), item.display_key).exists()
    assert client.get(f"/api/v1/memories/{memory.id}").status_code == 404


def test_chunked_upload_limit_closes_spooled_files(monkeypatch):
    from fastapi import FastAPI, UploadFile, File
    from starlette import formparsers
    from app.memory_upload_limit import MemoryUploadLimitMiddleware
    opened = []
    original = formparsers.SpooledTemporaryFile
    def tracked(*args, **kwargs):
        result = original(*args, **kwargs)
        opened.append(result)
        return result
    monkeypatch.setattr(formparsers, "SpooledTemporaryFile", tracked)
    app = FastAPI()
    @app.post("/memory-drafts/1/media/0")
    async def upload(file: UploadFile = File(...)):
        return {"size": file.size}
    middleware = MemoryUploadLimitMiddleware(app)
    async def run():
        chunks = iter([
            b'--test\r\nContent-Disposition: form-data; name="file"; filename="a.mp4"\r\n\r\n',
            b"x" * (1024 * 1024),
            b"x" * memory_media.VIDEO_MAX_BYTES,
        ])
        async def receive():
            return {"type": "http.request", "body": next(chunks), "more_body": True}
        messages = []
        async def send(message):
            messages.append(message)
        await middleware({"type": "http", "method": "POST", "path": "/memory-drafts/1/media/0",
            "query_string": b"", "headers": [(b"content-type", b"multipart/form-data; boundary=test")],
            "http_version": "1.1", "scheme": "http", "server": ("test", 80), "client": ("test", 123)}, receive, send)
        assert messages[0]["status"] == 413
    asyncio.run(run())
    assert opened and all(file.closed for file in opened)


@pytest.mark.parametrize("size,fps,audio", [("1920x1080", 30, True), ("1080x1920", 60, False), ("320x240", 24, False)])
def test_real_standard_video_compression(tmp_path, size, fps, audio):
    ffmpeg, ffprobe = os.getenv("MEMORY_TEST_FFMPEG"), os.getenv("MEMORY_TEST_FFPROBE")
    if not ffmpeg or not ffprobe:
        pytest.skip("Set MEMORY_TEST_FFMPEG and MEMORY_TEST_FFPROBE for actual-codec checks")
    source = tmp_path / "source.mp4"
    command = [ffmpeg, "-nostdin", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=size={size}:rate={fps}"]
    if audio:
        command += ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100"]
    command += ["-t", "1", "-c:v", "libx264", "-preset", "ultrafast", "-threads", "1", "-pix_fmt", "yuv420p"]
    if audio:
        command += ["-c:a", "aac"]
    subprocess.run(command + [str(source)], check=True, capture_output=True, timeout=30)
    result = memory_media.compress_video(source, tmp_path / "output", ffmpeg, ffprobe)
    info = memory_media.inspect_video(result.display, ffprobe)
    assert info["video"]["codec_name"] == "h264"
    assert bool(info["audio"]) == audio
    if audio:
        assert info["audio"][0]["codec_name"] == "aac"
    numerator, denominator = map(int, info["video"]["avg_frame_rate"].split("/"))
    assert numerator / denominator <= 30
    assert max(result.width, result.height) <= 1280 and min(result.width, result.height) <= 720
    assert result.duration == pytest.approx(1, abs=0.15)
    if size == "320x240":
        assert (result.width, result.height) == (320, 240)
    assert result.total_bytes > 0
    with Image.open(result.thumbnail) as thumb:
        assert thumb.format == "JPEG"

"""Pre-generated share cards use the selected cover and immutable activity fields."""

from datetime import datetime, timedelta
from pathlib import Path

import pytest
from PIL import Image, ImageDraw

from app.models import Activity, ActivityParticipant
from app.services import activity_share_preview_service as preview
from app.services.activity_cover_service import get_activity_cover_source_path


def _payload(cover="aleksey-rico-001"):
    start = datetime(2026, 12, 31, 19, 30)
    return {
        "name": "分享预览测试", "remark": "静态信息", "activity_cover_id": cover,
        "start_time": start.isoformat(), "end_time": (start + timedelta(minutes=30)).isoformat(),
        "location_name": "龙城运动中心", "location_address": "测试路 1 号",
    }


def _file(url, folder):
    return folder / Path(url).name


def test_create_prepares_card_and_reads_never_generate(client, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    response = client.post("/api/v2/activities", headers=admin_headers, json=_payload())
    assert response.status_code == 201, response.text
    body = response.json()
    image_url = body["share_preview_image_url"]
    assert image_url.endswith(".png")
    with Image.open(_file(image_url, tmp_path)) as image:
        assert image.size == (550, 440)
        assert image.mode == "RGB"
        cover = Image.open(get_activity_cover_source_path(body["activity_cover_id"])).convert("RGBA")
        x, y, width, height = preview._cover_layout(cover.width, cover.height)
        expected = cover.resize((width, height), Image.Resampling.LANCZOS)
        assert image.getpixel((10, 10)) == expected.getpixel((10 - x, 10 - y))[:3]
    monkeypatch.setattr(preview, "_render_share_preview", lambda *args: pytest.fail("GET attempted to render"))
    detail = client.get(f"/api/v2/activities/{body['id']}")
    assert detail.json()["share_preview_image_url"] == image_url
    assert client.get(f"/api/v2/activities/{body['id']}/share-preview").json()["image_url"] == image_url
    assert client.get(f"/api/v1/activities/{body['id']}/share-preview").json()["image_url"] == image_url


def test_edited_static_fields_change_url_but_other_data_does_not(client, db_session, admin_headers, normal_user, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    created = client.post("/api/v2/activities", headers=admin_headers, json=_payload()).json()
    activity_id = created["id"]
    url = created["share_preview_image_url"]
    for field, value in [
        ("location_name", "新场地"), ("location_address", "新地址"),
        ("end_time", "2027-01-01T20:30:00"), ("start_time", "2027-01-01T19:30:00"),
        ("activity_cover_id", "lam-002"),
    ]:
        response = client.patch(f"/api/v2/activities/{activity_id}", headers=admin_headers, json={field: value})
        assert response.status_code == 200, response.text
        next_url = response.json()["share_preview_image_url"]
        assert next_url != url and _file(next_url, tmp_path).is_file()
        assert _file(url, tmp_path).is_file()  # old URLs are retained for already-shared cards
        url = next_url
    response = client.patch(f"/api/v2/activities/{activity_id}", headers=admin_headers, json={"remark": "只改备注"})
    assert response.json()["share_preview_image_url"] == url
    activity = db_session.get(Activity, activity_id)
    db_session.add(ActivityParticipant(activity_id=activity_id, user_id=normal_user.id,
                                       display_nickname="额外报名", display_avatar_url=""))
    db_session.commit()
    assert client.get(f"/api/v2/activities/{activity_id}").json()["share_preview_image_url"] == url


def test_failed_render_rolls_back_edit_and_retains_previous_card(client, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    created = client.post("/api/v2/activities", headers=admin_headers, json=_payload()).json()
    old_url = created["share_preview_image_url"]
    def fail(*args):
        raise RuntimeError("renderer unavailable")
    monkeypatch.setattr(preview, "_render_share_preview", fail)
    response = client.patch(f"/api/v2/activities/{created['id']}", headers=admin_headers, json={"location_name": "不能保存"})
    assert response.status_code == 503
    assert response.json()["code"] == "SHARE_PREVIEW_GENERATION_FAILED"
    detail = client.get(f"/api/v2/activities/{created['id']}").json()
    assert detail["location_name"] == "龙城运动中心"
    assert detail["share_preview_image_url"] == old_url
    assert _file(old_url, tmp_path).is_file()


def test_gif_middle_by_elapsed_duration_and_cross_day(tmp_path, sample_activity, monkeypatch):
    gif = tmp_path / "frames.gif"
    frames = [Image.new("RGB", (25, 25), color) for color in ("red", "green", "blue")]
    frames[0].save(gif, save_all=True, append_images=frames[1:], duration=[100, 300, 100], loop=0)
    assert preview._middle_frame(gif).getpixel((5, 5))[:3] == (0, 128, 0)
    sample_activity.start_time = datetime(2026, 12, 31, 19, 30)
    sample_activity.end_time = datetime(2027, 1, 1, 1, 0)
    assert preview._time_text(sample_activity) == "2026/12/31 19:30-2027/01/01 01:00"
    assert preview._time_text(sample_activity).find("-2027") > 0


def test_missing_cover_and_unbackfilled_activity_are_not_lazily_generated(sample_activity, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    assert preview.read_activity_share_preview(sample_activity).status == "failed"
    sample_activity.activity_cover_id = "missing-cover"
    with pytest.raises(Exception, match="分享图片生成失败"):
        preview.prepare_activity_share_preview(sample_activity)
    assert not list(tmp_path.glob("*.png"))


def test_selected_gif_cover_produces_png(sample_activity, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    sample_activity.activity_cover_id = "miguel-angel-camprubi-009"
    name, created = preview.prepare_activity_share_preview(sample_activity)
    assert created
    sample_activity.share_preview_file = name
    with Image.open(tmp_path / name) as image:
        assert image.format == "PNG" and image.size == (550, 440)
    assert preview.read_activity_share_preview(sample_activity).status == "ready"




def test_v1_create_also_prepares_share_card(client, db_session, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    payload = _payload()
    payload.pop("activity_cover_id")  # The legacy endpoint uses the database default cover.
    response = client.post("/api/v1/activities", headers=admin_headers, json=payload)
    assert response.status_code == 201, response.text
    activity = db_session.get(Activity, response.json()["id"])
    assert activity.activity_cover_id == "aleksey-rico-001"
    assert activity.share_preview_file
    with Image.open(tmp_path / activity.share_preview_file) as image:
        assert image.format == "PNG" and image.size == (550, 440)
    assert client.get(f"/api/v1/activities/{activity.id}/share-preview").json()["status"] == "ready"


def test_failed_create_rolls_back_row_and_does_not_publish_partial_file(
    client, db_session, admin_headers, monkeypatch, tmp_path,
):
    from sqlalchemy import select

    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    def fail(*args):
        raise RuntimeError("renderer unavailable")
    monkeypatch.setattr(preview, "_render_share_preview", fail)
    response = client.post("/api/v2/activities", headers=admin_headers, json=_payload())
    assert response.status_code == 503
    assert response.json()["code"] == "SHARE_PREVIEW_GENERATION_FAILED"
    assert db_session.scalars(select(Activity)).all() == []
    assert list(tmp_path.glob("activity-*.png")) == []


def test_backfill_is_dry_run_by_default_and_recovers_missing_reference(
    client, db_session, admin_headers, monkeypatch, tmp_path, capsys,
):
    from sqlalchemy.orm import sessionmaker
    from scripts import backfill_activity_share_previews as backfill_script

    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    created = client.post("/api/v2/activities", headers=admin_headers, json=_payload()).json()
    activity = db_session.get(Activity, created["id"])
    activity.share_preview_file = None
    db_session.commit()
    maker = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    monkeypatch.setattr(backfill_script, "SessionLocal", maker)
    assert backfill_script.backfill(apply=False) == (0, 0)
    assert "DRY-RUN" in capsys.readouterr().out
    db_session.expire_all()
    assert db_session.get(Activity, activity.id).share_preview_file is None
    assert backfill_script.backfill(apply=True) == (1, 0)
    db_session.expire_all()
    assert db_session.get(Activity, activity.id).share_preview_file == Path(created["share_preview_image_url"]).name
    assert backfill_script.backfill(apply=True) == (1, 0)  # safe retry


def test_cross_year_time_and_long_venue_fit_inside_card(tmp_path, sample_activity):
    from PIL import ImageChops

    sample_activity.location_name = "\u9f99\u57ce\u8fd0\u52a8\u4e2d\u5fc3" * 24
    sample_activity.start_time = datetime(2026, 12, 31, 19, 30)
    sample_activity.end_time = datetime(2027, 1, 1, 1, 0)
    sample_activity.activity_cover_id = "aleksey-rico-001"
    source = get_activity_cover_source_path(sample_activity.activity_cover_id)
    actual = tmp_path / "long.png"
    preview._render_share_preview(actual, sample_activity, source)
    sample_activity.location_name = ""
    without_venue = tmp_path / "without-venue.png"
    preview._render_share_preview(without_venue, sample_activity, source)
    with Image.open(actual) as full, Image.open(without_venue) as empty:
        changed = ImageChops.difference(full, empty).getbbox()
        assert changed is not None
        # Only the venue label differs; the full cross-year time remains in-bounds.
        assert changed[0] >= preview.INFO_PADDING_X
        assert changed[2] < 550 - preview.INFO_PADDING_X
    time_width = ImageDraw.Draw(Image.new("RGB", (550, 440))).textlength(
        preview._time_text(sample_activity), font=preview._font(20)
    )
    assert time_width < 550 - 2 * preview.INFO_PADDING_X - 2 * (preview.ICON_SIZE + preview.ICON_GAP)





def test_corrupt_cached_file_is_rebuilt_before_commit(sample_activity, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    sample_activity.activity_cover_id = "aleksey-rico-001"
    _, file_name = preview._source_and_name(sample_activity)
    (tmp_path / file_name).write_bytes(b"truncated PNG")
    name, created = preview.prepare_activity_share_preview(sample_activity)
    assert name == file_name and created
    with Image.open(tmp_path / name) as image:
        image.verify()


def test_v1_location_edit_replaces_card_reference(client, db_session, admin_headers, monkeypatch, tmp_path):
    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    payload = _payload()
    payload.pop("activity_cover_id")
    activity_id = client.post("/api/v1/activities", headers=admin_headers, json=payload).json()["id"]
    old_url = client.get(f"/api/v1/activities/{activity_id}/share-preview").json()["image_url"]
    response = client.patch(
        f"/api/v1/activities/{activity_id}", headers=admin_headers,
        json={"location_address": "different street"},
    )
    assert response.status_code == 200, response.text
    new_url = client.get(f"/api/v1/activities/{activity_id}/share-preview").json()["image_url"]
    assert new_url != old_url
    assert (tmp_path / Path(new_url).name).is_file()
    assert (tmp_path / Path(old_url).name).is_file()


def test_failed_commit_discards_new_card(client, db_session, admin_headers, monkeypatch, tmp_path):
    from sqlalchemy import select

    monkeypatch.setattr(preview, "SHARE_PREVIEW_DIR", tmp_path)
    original_commit = db_session.commit
    def fail_after_render():
        if db_session.scalars(select(Activity.share_preview_file)).first():
            raise RuntimeError("database commit failed")
        original_commit()
    monkeypatch.setattr(db_session, "commit", fail_after_render)
    with pytest.raises(RuntimeError, match="database commit failed"):
        client.post("/api/v2/activities", headers=admin_headers, json=_payload())
    assert db_session.scalars(select(Activity)).all() == []
    assert list(tmp_path.glob("activity-*.png")) == []


def test_middle_gif_frame_composites_transparent_area(tmp_path):
    source = tmp_path / "partial.gif"
    base = Image.new("RGBA", (20, 20), "red")
    middle = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    ImageDraw.Draw(middle).rectangle((5, 5, 14, 14), fill="green")
    end = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    ImageDraw.Draw(end).rectangle((0, 0, 3, 3), fill="blue")
    base.save(source, save_all=True, append_images=[middle, end],
              duration=[100, 300, 100], disposal=[1, 1, 1], loop=0, optimize=False)
    selected = preview._middle_frame(source)
    assert selected.getpixel((0, 10)) == (255, 0, 0, 255)
    assert selected.getpixel((10, 10)) == (0, 128, 0, 255)

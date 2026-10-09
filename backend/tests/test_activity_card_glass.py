from pathlib import Path

from PIL import Image
import pytest

from app.api.v2 import activities as activities_api
from app.services import activity_card_glass_service as glass_service


def _sample_image() -> Image.Image:
    image = Image.new("RGB", (120, 160), (235, 82, 82))
    for x in range(60, 120):
        for y in range(160):
            image.putpixel((x, y), (44, 116, 210))
    return image


def test_card_glass_output_keeps_source_size_and_has_no_alpha() -> None:
    source = _sample_image()

    rendered = glass_service._render_blurred_image(source)

    assert rendered.size == source.size
    assert rendered.mode == "RGB"
    assert rendered.getpixel((0, 0)) != (0, 0, 0)
    assert rendered.getpixel((119, 159)) != (0, 0, 0)


def test_card_glass_radius_tracks_the_twelve_pixel_prototype_blur() -> None:
    reference_width = 469.23 * 420 / 750

    assert glass_service.CARD_GLASS_BLUR_RADIUS_RATIO * reference_width == pytest.approx(6.5)


def test_card_glass_cache_reuses_rendered_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0

    def load_source(_: str) -> Image.Image:
        nonlocal calls
        calls += 1
        return _sample_image()

    monkeypatch.setattr(glass_service, "CARD_GLASS_CACHE_DIR", tmp_path / "card-glass")
    monkeypatch.setattr(glass_service, "_load_source_image", load_source)

    monkeypatch.setattr(glass_service, "get_activity_cover_glass_source_path", lambda _: None)
    monkeypatch.setattr(glass_service, "get_activity_cover_source_path", lambda _: tmp_path / "source.png")
    first = glass_service.get_or_create_activity_cover_card_glass("aleksey-rico-001")
    second = glass_service.get_or_create_activity_cover_card_glass("aleksey-rico-001")

    assert first == second
    assert first.is_file()
    assert first.stat().st_size > 0
    assert calls == 1
    with Image.open(first) as image:
        assert image.size == (120, 160)
        assert image.mode == "RGB"


def test_card_glass_rejects_unknown_cover() -> None:
    with pytest.raises(glass_service.ActivityCardGlassNotFoundError):
        glass_service.get_or_create_activity_cover_card_glass("missing-cover")


def test_card_glass_route_returns_png(client, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    image_path = tmp_path / "glass.png"
    _sample_image().save(image_path, format="PNG")
    monkeypatch.setattr(
        activities_api,
        "get_or_create_activity_cover_card_glass",
        lambda cover_id: image_path,
    )

    response = client.get(
        "/api/v2/activity-covers/aleksey-rico-001/glass-image?v=2"
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "public, max-age=2592000, immutable"
    assert response.content == image_path.read_bytes()


def test_card_glass_route_returns_404_for_unknown_cover(client, monkeypatch: pytest.MonkeyPatch) -> None:
    def raise_not_found(cover_id: str) -> Path:
        raise glass_service.ActivityCardGlassNotFoundError("activity cover not found")

    monkeypatch.setattr(activities_api, "get_or_create_activity_cover_card_glass", raise_not_found)

    response = client.get(
        "/api/v2/activity-covers/missing-cover/glass-image?v=2"
    )

    assert response.status_code == 404
    assert response.json()["message"] == "activity cover not found"

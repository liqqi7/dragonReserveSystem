from __future__ import annotations

"""Server-side share preview generation for activities."""

from dataclasses import dataclass
from datetime import datetime
from hashlib import md5
from io import BytesIO
import logging
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.core.config import get_settings
from app.models import Activity, ActivityParticipant
from app.services.activity_type_style_service import get_activity_style


settings = get_settings()
logger = logging.getLogger(__name__)

SHARE_PREVIEW_LAYOUT_VERSION = "v16"
SHARE_PREVIEW_WIDTH = 550
SHARE_PREVIEW_HEIGHT = 440
SHARE_PREVIEW_INFO_HEIGHT = 62
SHARE_PREVIEW_INFO_TOP = SHARE_PREVIEW_HEIGHT - SHARE_PREVIEW_INFO_HEIGHT
SHARE_PREVIEW_PADDING_X = 32
SHARE_PREVIEW_ICON_SIZE = 24
SHARE_PREVIEW_META_VISUAL_TOP = 398
SHARE_PREVIEW_ICON_GAP = 12
SHARE_PREVIEW_SECTION_GAP = 32
SHARE_PREVIEW_FONT_SIZE = 24
SHARE_PREVIEW_AVATAR_LAYOUT = (
    {"top": 12, "left": 72, "size": 216},
    {"top": 112, "left": 322, "size": 168},
    {"top": 240, "left": 210, "size": 128},
)
SHARE_PREVIEW_BG_COLOR = (17, 24, 39, 255)
SHARE_PREVIEW_TEXT_COLOR = (255, 255, 255, 224)
SHARE_PREVIEW_GRADIENT_START = 0.20
SHARE_PREVIEW_GRADIENT_END = 0.40
SHARE_PREVIEW_BLUR_RADIUS = 10
SHARE_PREVIEW_REMOTE_IMAGE_TIMEOUT = 10.0
SHARE_PREVIEW_REMOTE_AVATAR_TIMEOUT = 2.5

MEDIA_ROOT = Path(settings.media_root).resolve()
SHARE_PREVIEW_DIR = MEDIA_ROOT / "share-previews"
REPO_ROOT = Path(__file__).resolve().parents[3]
APP_ROOT = Path(__file__).resolve().parents[1]
LOCATION_ICON_PATH = REPO_ROOT / "miniprogram" / "images" / "icon-location.png"
PEOPLE_ICON_PATH = REPO_ROOT / "miniprogram" / "images" / "icon-people.png"
BUNDLED_SHARE_FONT_PATH = APP_ROOT / "assets" / "fonts" / "NotoSansCJK-Regular.ttc"


@dataclass
class SharePreviewResult:
    status: str
    image_url: Optional[str] = None


def get_or_create_activity_share_preview(activity: Activity) -> SharePreviewResult:
    """Return a share preview image for an activity."""

    style = get_activity_style(activity.activity_type, activity.activity_style_key)
    if not style:
        return SharePreviewResult(status="failed")

    bg_video_url = str(style.get("bg_video_url", "") or "").strip()
    background_url = str(style.get("large_card_bg_image_url", "") or "").strip()
    if bg_video_url or not background_url:
        return SharePreviewResult(status="failed")

    cache_key = _build_cache_key(activity, style)
    SHARE_PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"activity-{activity.id}-{cache_key}.png"
    target_path = SHARE_PREVIEW_DIR / file_name

    if bool(settings.debug) or not target_path.exists():
        _render_share_preview(target_path, activity, style)

    image_url = f"{settings.media_url_prefix}/share-previews/{file_name}"
    return SharePreviewResult(status="ready", image_url=image_url)


def _build_cache_key(activity: Activity, style: dict[str, object]) -> str:
    participants = _participant_snapshots(activity)
    fingerprint = ",".join(
        f"{participant.id}:{participant.user_id}:{participant.nickname_snapshot}:{participant.avatar_url_snapshot}"
        for participant in participants
    )
    raw = "|".join([
        SHARE_PREVIEW_LAYOUT_VERSION,
        str(activity.id),
        str(activity.updated_at or ""),
        str(activity.activity_type or ""),
        str(activity.activity_style_key or ""),
        str(style.get("large_card_bg_image_url", "") or ""),
        str(activity.location_name or ""),
        str(activity.max_participants if activity.max_participants is not None else ""),
        fingerprint,
    ])
    return md5(raw.encode("utf-8")).hexdigest()


def _render_share_preview(target_path: Path, activity: Activity, style: dict[str, object]) -> None:
    background = _load_background_image(style)
    canvas = Image.new("RGBA", (SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT), SHARE_PREVIEW_BG_COLOR)
    background_layout = _compute_cover_layout(background.width, background.height)
    resized_background = background.resize((background_layout[2], background_layout[3]), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized_background, (background_layout[0], background_layout[1]))

    _draw_blurred_info_backdrop(canvas)
    _draw_gradient_overlay(canvas)

    if bool(style.get("show_avatar_cluster", False)):
        _draw_avatar_cluster(canvas, _select_share_avatars(activity))

    _draw_meta_row(canvas, activity)

    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(target_path, format="PNG", optimize=True)


def _load_background_image(style: dict[str, object]) -> Image.Image:
    source = str(style.get("large_card_bg_image_url", "") or "").strip()
    if not source:
        raise ValueError("share preview background missing")
    return _load_image(source)


def _compute_cover_layout(image_width: int, image_height: int) -> tuple[int, int, int, int]:
    scale = max(SHARE_PREVIEW_WIDTH / image_width, SHARE_PREVIEW_HEIGHT / image_height)
    draw_width = round(image_width * scale)
    draw_height = round(image_height * scale)
    draw_x = round((SHARE_PREVIEW_WIDTH - draw_width) / 2)
    draw_y = round((SHARE_PREVIEW_HEIGHT - draw_height) / 2)
    return draw_x, draw_y, draw_width, draw_height


def _draw_blurred_info_backdrop(canvas: Image.Image) -> None:
    strip = canvas.crop((0, SHARE_PREVIEW_INFO_TOP, SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT))
    strip = strip.filter(ImageFilter.GaussianBlur(radius=SHARE_PREVIEW_BLUR_RADIUS))
    canvas.alpha_composite(strip, (0, SHARE_PREVIEW_INFO_TOP))


def _draw_gradient_overlay(canvas: Image.Image) -> None:
    overlay = Image.new("RGBA", (SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_INFO_HEIGHT), (0, 0, 0, 0))
    pixels = overlay.load()
    for y in range(SHARE_PREVIEW_INFO_HEIGHT):
        ratio = y / max(SHARE_PREVIEW_INFO_HEIGHT - 1, 1)
        alpha = round((SHARE_PREVIEW_GRADIENT_START + (SHARE_PREVIEW_GRADIENT_END - SHARE_PREVIEW_GRADIENT_START) * ratio) * 255)
        for x in range(SHARE_PREVIEW_WIDTH):
            pixels[x, y] = (0, 0, 0, alpha)
    canvas.alpha_composite(overlay, (0, SHARE_PREVIEW_INFO_TOP))


def _draw_avatar_cluster(canvas: Image.Image, avatars: list[Image.Image]) -> None:
    for index, avatar in enumerate(avatars[: len(SHARE_PREVIEW_AVATAR_LAYOUT)]):
        layout = SHARE_PREVIEW_AVATAR_LAYOUT[index]
        size = int(layout["size"])
        left = int(layout["left"])
        top = int(layout["top"])
        avatar_resized = avatar.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, size, size), fill=255)
        canvas.paste(avatar_resized, (left, top), mask)


def _draw_meta_row(canvas: Image.Image, activity: Activity) -> None:
    draw = ImageDraw.Draw(canvas)
    font = _load_font(SHARE_PREVIEW_FONT_SIZE)
    icon_location = _load_local_icon(LOCATION_ICON_PATH)
    icon_people = _load_local_icon(PEOPLE_ICON_PATH)

    participant_text = _get_participant_text(activity)
    people_text_width = _measure_text(draw, participant_text, font)
    people_section_width = SHARE_PREVIEW_ICON_SIZE + SHARE_PREVIEW_ICON_GAP + min(people_text_width, 72)
    location_max_width = max(
        0,
        SHARE_PREVIEW_WIDTH - SHARE_PREVIEW_PADDING_X * 2 - people_section_width - SHARE_PREVIEW_SECTION_GAP - SHARE_PREVIEW_ICON_SIZE - SHARE_PREVIEW_ICON_GAP,
    )
    location_text = _truncate_text(draw, activity.location_name or "", location_max_width, font)

    cursor_x = SHARE_PREVIEW_PADDING_X

    if location_text:
        if icon_location is not None:
            location_icon_resized = icon_location.resize((SHARE_PREVIEW_ICON_SIZE, SHARE_PREVIEW_ICON_SIZE), Image.Resampling.LANCZOS)
            canvas.alpha_composite(location_icon_resized, (cursor_x, SHARE_PREVIEW_META_VISUAL_TOP))
        cursor_x += SHARE_PREVIEW_ICON_SIZE + SHARE_PREVIEW_ICON_GAP
        _draw_text(draw, cursor_x, SHARE_PREVIEW_META_VISUAL_TOP, location_text, font)
        cursor_x += min(_measure_text(draw, location_text, font), location_max_width) + SHARE_PREVIEW_SECTION_GAP

    if icon_people is not None:
        people_icon_resized = icon_people.resize((SHARE_PREVIEW_ICON_SIZE, SHARE_PREVIEW_ICON_SIZE), Image.Resampling.LANCZOS)
        canvas.alpha_composite(people_icon_resized, (cursor_x, SHARE_PREVIEW_META_VISUAL_TOP))
    cursor_x += SHARE_PREVIEW_ICON_SIZE + SHARE_PREVIEW_ICON_GAP
    _draw_text(draw, cursor_x, SHARE_PREVIEW_META_VISUAL_TOP, participant_text, font)


def _draw_text(draw: ImageDraw.ImageDraw, x: int, visual_top_y: int, text: str, font: ImageFont.ImageFont) -> None:
    bbox = draw.textbbox((x, 0), text, font=font)
    draw_y = int(visual_top_y - bbox[1])
    draw.text((x, draw_y), text, font=font, fill=SHARE_PREVIEW_TEXT_COLOR)


def _measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    if not text:
        return 0
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def _truncate_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, font: ImageFont.ImageFont) -> str:
    value = str(text or "")
    if not value:
        return ""
    if _measure_text(draw, value, font) <= max_width:
        return value
    trimmed = value
    while trimmed and _measure_text(draw, f"{trimmed}...", font) > max_width:
        trimmed = trimmed[:-1]
    return f"{trimmed}..." if trimmed else ""


def _get_participant_text(activity: Activity) -> str:
    count = len(_participant_snapshots(activity))
    if activity.max_participants is not None:
        return f"{count}/{activity.max_participants} 人"
    if count > 0:
        return f"{count} 人"
    return "0 人"


def _select_share_avatars(activity: Activity) -> list[Image.Image]:
    """最近报名的 3 人（按 created_at），绘制顺序为 TL=最新；头像仅使用库内 avatar_url_snapshot。"""

    snapshots = _participant_snapshots(activity)
    if not snapshots:
        return []
    selected = list(reversed(snapshots[-3:]))
    images: list[Image.Image] = []
    for participant in selected:
        url = str(participant.avatar_url_snapshot or "").strip()
        if not url:
            continue
        try:
            images.append(_load_image(url, timeout=SHARE_PREVIEW_REMOTE_AVATAR_TIMEOUT))
        except Exception as exc:
            logger.warning(
                "activity_share_preview_avatar_skipped activity_id=%s participant_id=%s summary=%s",
                activity.id,
                participant.id,
                str(exc) or exc.__class__.__name__,
            )
    return images


def _participant_snapshots(activity: Activity) -> list[ActivityParticipant]:
    participants = list(activity.participants or [])
    return sorted(
        participants,
        key=lambda participant: (
            participant.created_at or datetime.min,
            participant.id,
        ),
    )


def _load_local_icon(path: Path) -> Image.Image | None:
    if not path.exists():
        return None
    return Image.open(path).convert("RGBA")


def _load_image(source: str, timeout: float = SHARE_PREVIEW_REMOTE_IMAGE_TIMEOUT) -> Image.Image:
    local_path = _resolve_local_media_path(source)
    if local_path and local_path.exists():
        return Image.open(local_path).convert("RGBA")

    response = httpx.get(
        source,
        timeout=httpx.Timeout(timeout, connect=min(timeout, 2.0)),
        follow_redirects=True,
        headers={"User-Agent": "dragonReserveSystem-share-preview/1.0"},
    )
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGBA")


def _resolve_local_media_path(source: str) -> Optional[Path]:
    value = str(source or "").strip()
    if not value:
        return None
    parsed = urlparse(value)
    candidate_path = parsed.path or value
    media_prefix = settings.media_url_prefix.rstrip("/")
    if candidate_path.startswith(media_prefix + "/"):
        relative_path = candidate_path[len(media_prefix) + 1 :]
        return MEDIA_ROOT / relative_path
    if not parsed.scheme and not value.startswith("http"):
        if value.startswith("/"):
            value = value[1:]
        return REPO_ROOT / value
    return None


def _load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        str(BUNDLED_SHARE_FONT_PATH),
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJKSC-Regular.otf",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/arphic/ukai.ttc",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyh.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()

from __future__ import annotations

"""Generate immutable share cards before an activity write is committed."""

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from hashlib import sha256
from io import BytesIO
import logging
import os
from pathlib import Path
import re
import tempfile
from zoneinfo import ZoneInfo

import cairosvg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.core.config import get_settings
from app.core.exceptions import SharePreviewGenerationError
from app.models import Activity
from app.services.activity_cover_service import get_activity_cover_source_path


logger = logging.getLogger(__name__)
settings = get_settings()
SHARE_PREVIEW_LAYOUT_VERSION = "v18"
SHARE_PREVIEW_WIDTH = 550
SHARE_PREVIEW_HEIGHT = 440
INFO_TOP = 384
INFO_HEIGHT = SHARE_PREVIEW_HEIGHT - INFO_TOP
INFO_PADDING_X = 24
ICON_SIZE = 22
ICON_GAP = 10
SECTION_GAP = 24
MEDIA_ROOT = Path(settings.media_root).resolve()
SHARE_PREVIEW_DIR = MEDIA_ROOT / "share-previews"
ASSET_ROOT = Path(__file__).resolve().parents[1] / "assets"
FONT_PATH = ASSET_ROOT / "fonts" / "NotoSansCJK-Regular.ttc"
SHARE_ICON_ROOT = ASSET_ROOT / "share-icons"
APP_TIME_ZONE = ZoneInfo("Asia/Shanghai")
_FILE_NAME = re.compile(r"activity-(\d+)-[0-9a-f]{24}\.png\Z")


@dataclass(frozen=True)
class SharePreviewResult:
    status: str
    image_url: str | None = None


def share_preview_path(file_name: str) -> Path:
    if not _FILE_NAME.fullmatch(file_name):
        raise ValueError("Invalid share preview file name")
    return SHARE_PREVIEW_DIR / file_name


def read_activity_share_preview(activity: Activity) -> SharePreviewResult:
    """Pure read: never creates an image when a preview is absent."""
    file_name = activity.share_preview_file
    if not file_name or not _FILE_NAME.fullmatch(file_name) or not share_preview_path(file_name).is_file():
        logger.warning("share_preview_missing activity_id=%s file=%s", activity.id, file_name)
        return SharePreviewResult("failed")
    return SharePreviewResult("ready", f"{settings.media_url_prefix}/share-previews/{file_name}")


def _wall_time(value: datetime) -> datetime:
    return value.astimezone(APP_TIME_ZONE).replace(tzinfo=None) if value.tzinfo else value


def _source_and_name(activity: Activity) -> tuple[Path, str]:
    source = get_activity_cover_source_path(activity.activity_cover_id)
    if source is None:
        raise ValueError(f"Missing cover asset for activity {activity.id}: {activity.activity_cover_id}")
    stat = source.stat()
    raw = "|".join((
        SHARE_PREVIEW_LAYOUT_VERSION,
        str(activity.id),
        str(activity.activity_cover_id),
        str(source), str(stat.st_size), str(stat.st_mtime_ns),
        str(activity.location_name or ""), str(activity.location_address or ""),
        _wall_time(activity.start_time).isoformat(), _wall_time(activity.end_time).isoformat(),
    ))
    return source, f"activity-{activity.id}-{sha256(raw.encode('utf-8')).hexdigest()[:24]}.png"


def prepare_activity_share_preview(activity: Activity) -> tuple[str, bool]:
    """Prepare complete file, then let the caller commit its database reference.

    Returns (file name, newly created). On transaction failure callers discard only
    a newly created file; the previous referenced file is never touched.
    """
    if activity.id is None:
        raise ValueError("An activity ID is required before rendering")
    try:
        source, file_name = _source_and_name(activity)
    except (OSError, ValueError) as exc:
        logger.exception("share_preview_source_failed activity_id=%s", activity.id)
        raise SharePreviewGenerationError() from exc
    target = share_preview_path(file_name)
    if target.is_file():
        try:
            with Image.open(target) as existing:
                if existing.format == "PNG" and existing.size == (SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT):
                    existing.verify()
                    return file_name, False
        except (OSError, ValueError):
            pass  # Regenerate a truncated or invalid old file before publishing its URL.
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=f".{file_name}.", suffix=".tmp", dir=target.parent)
        os.close(fd)
    except OSError as exc:
        logger.exception("share_preview_storage_failed activity_id=%s", activity.id)
        raise SharePreviewGenerationError() from exc
    try:
        _render_share_preview(Path(temporary), activity, source)
        with Image.open(temporary) as checked:
            if checked.size != (SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT) or checked.format != "PNG":
                raise ValueError("Invalid rendered share card")
            checked.verify()
        os.replace(temporary, target)
    except Exception as exc:
        logger.exception("share_preview_render_failed activity_id=%s", activity.id)
        raise SharePreviewGenerationError() from exc
    finally:
        Path(temporary).unlink(missing_ok=True)
    return file_name, True


def discard_prepared_preview(file_name: str, created: bool) -> None:
    if created:
        share_preview_path(file_name).unlink(missing_ok=True)


def _middle_frame(source: Path) -> Image.Image:
    with Image.open(source) as image:
        count = getattr(image, "n_frames", 1)
        if count == 1:
            return image.convert("RGBA")
        durations = []
        for index in range(count):
            image.seek(index)
            durations.append(max(1, int(image.info.get("duration") or 100)))
        midpoint = sum(durations) / 2
        elapsed = 0
        for index, duration in enumerate(durations):
            elapsed += duration
            if elapsed > midpoint:
                image.seek(index)  # Pillow applies GIF disposal when seeking composited frames.
                return image.convert("RGBA")
        image.seek(count - 1)
        return image.convert("RGBA")


def _cover_layout(width: int, height: int) -> tuple[int, int, int, int]:
    scale = max(SHARE_PREVIEW_WIDTH / width, SHARE_PREVIEW_HEIGHT / height)
    draw_width, draw_height = round(width * scale), round(height * scale)
    return ((SHARE_PREVIEW_WIDTH - draw_width) // 2,
            (SHARE_PREVIEW_HEIGHT - draw_height) // 2, draw_width, draw_height)


@lru_cache(maxsize=2)
def _icon(name: str) -> Image.Image:
    if name not in {"map-pin", "clock-3"}:
        raise ValueError("Unknown share icon")
    png = cairosvg.svg2png(url=str(SHARE_ICON_ROOT / f"{name}.svg"),
                           output_width=ICON_SIZE * 3, output_height=ICON_SIZE * 3)
    with Image.open(BytesIO(png)) as image:
        return image.convert("RGBA").resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)


def _time_text(activity: Activity) -> str:
    start, end = _wall_time(activity.start_time), _wall_time(activity.end_time)
    if start.date() == end.date():
        suffix = end.strftime("%H:%M")
    elif start.year == end.year:
        suffix = end.strftime("%m/%d %H:%M")
    else:
        suffix = end.strftime("%Y/%m/%d %H:%M")
    return f"{start:%Y/%m/%d %H:%M}-{suffix}"


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def _fit_text(draw: ImageDraw.ImageDraw, text: str, limit: int, font: ImageFont.FreeTypeFont) -> str:
    if draw.textlength(text, font=font) <= limit:
        return text
    ellipsis = "…"
    while text and draw.textlength(text + ellipsis, font=font) > limit:
        text = text[:-1]
    return text + ellipsis if text else ""


def _render_share_preview(target: Path, activity: Activity, source: Path) -> None:
    background = _middle_frame(source)
    x, y, width, height = _cover_layout(background.width, background.height)
    background = background.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT), (17, 24, 39, 255))
    canvas.alpha_composite(background, (x, y))
    strip = canvas.crop((0, INFO_TOP, SHARE_PREVIEW_WIDTH, SHARE_PREVIEW_HEIGHT))
    canvas.alpha_composite(strip.filter(ImageFilter.GaussianBlur(radius=20)), (0, INFO_TOP))
    gradient = Image.new("RGBA", (SHARE_PREVIEW_WIDTH, INFO_HEIGHT))
    pixels = gradient.load()
    for row in range(INFO_HEIGHT):
        alpha = round((0.20 + 0.10 * row / max(1, INFO_HEIGHT - 1)) * 255)
        for col in range(SHARE_PREVIEW_WIDTH):
            pixels[col, row] = (0, 0, 0, alpha)
    canvas.alpha_composite(gradient, (0, INFO_TOP))

    draw = ImageDraw.Draw(canvas)
    time_text = _time_text(activity)
    time_font = _font(20)
    location_font = _font(22)
    # Keep date/time legible first, reserving remaining room for the venue.
    available = SHARE_PREVIEW_WIDTH - 2 * INFO_PADDING_X - 2 * (ICON_SIZE + ICON_GAP) - SECTION_GAP
    while draw.textlength(time_text, font=time_font) > available - 40 and time_font.size > 16:
        time_font = _font(time_font.size - 1)
    time_width = draw.textlength(time_text, font=time_font)
    location_width = max(0, int(available - time_width))
    location_text = _fit_text(draw, str(activity.location_name or ""), location_width, location_font)
    location_used = draw.textlength(location_text, font=location_font)
    row_top = INFO_TOP + 12
    cursor = INFO_PADDING_X
    for name, text, font in (("map-pin", location_text, location_font),
                             ("clock-3", time_text, time_font)):
        canvas.alpha_composite(_icon(name), (round(cursor), row_top + 5))
        cursor += ICON_SIZE + ICON_GAP
        bbox = draw.textbbox((0, 0), text, font=font)
        draw.text((round(cursor), row_top + (INFO_HEIGHT - 24 - (bbox[3] - bbox[1])) / 2 - bbox[1]),
                  text, font=font, fill="#FFFFFF")
        cursor += (location_used if name == "map-pin" else time_width) + SECTION_GAP
    canvas.convert("RGB").save(target, format="PNG", optimize=True)

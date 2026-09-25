#!/usr/bin/env python3
"""Import one activity-cover image or GIF from a meiye.art role-model page.

Usage:
  python tools/import_meiye_activity_cover.py URL --category 外出

The script discovers the original image and designer from the page, applies the
500 KB compression gate, creates deployable derivatives, and appends catalog.json.
Use --credit-name/--id only when overriding discovered metadata is intentional.
"""
from __future__ import annotations

import argparse
import html
import io
import json
import re
import ssl
import sys
import urllib.request
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "backend/app/assets/activity-covers/catalog.json"
ASSET_ROOT = CATALOG_PATH.parent
THRESHOLD = 500 * 1024
CATEGORIES = {"派对", "运动", "外出", "游戏", "电影", "生日", "吃饭", "杂项"}
USER_AGENT = "dragon-reserve-activity-cover-importer/1.0"


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=30, context=context) as response:
        return response.read()


def extract_page_metadata(page: str) -> tuple[str, str, str, str]:
    normalized = html.unescape(page).replace(r'\"', '"')
    designer = re.search(r'"designer":\{"id":"[^"]+","slug":"([^"]+)","name":"((?:\\.|[^"\\])*)"', normalized)
    if not designer:
        raise RuntimeError("未能从页面读取 designer 信息，请使用 --credit-name 和 --id 重试。")
    slug, name = designer.groups()
    name = bytes(name, "utf-8").decode("unicode_escape") if "\\u" in name else name
    candidates = []
    for match in re.finditer(r"https://image\.meiye\.art/pic_[^\"'\\\s<]+", normalized):
        candidate = match.group(0).split("?", 1)[0]
        if candidate not in candidates:
            candidates.append(candidate)
    if not candidates:
        raise RuntimeError("未能从页面读取图片地址。")
    avatar_match = re.search(r'"designer":\{"id":"[^"]+","slug":"[^"]+","name":"(?:\\.|[^"\\])*","avatar":"([^"]+)"', normalized)
    avatar_url = html.unescape(avatar_match.group(1)) if avatar_match else ""
    return candidates[0], slug, name, avatar_url


def base_artist_slug(slug: str) -> str:
    return re.sub(r"-[a-z0-9]{5,8}$", "", slug).lower()


def next_id(catalog: dict[str, Any], slug: str) -> str:
    prefix = base_artist_slug(slug)
    ids = [a["id"] for artist in catalog["artists"] for a in artist["artworks"]]
    number = 1
    while f"{prefix}-{number:03d}" in ids:
        number += 1
    return f"{prefix}-{number:03d}"


def save_jpeg(image: Image.Image, destination: Path, max_size: tuple[int, int], quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image = image.copy()
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    image.convert("RGB").save(destination, "JPEG", quality=quality, optimize=True, progressive=True)


def save_author_avatar(raw: bytes, destination: Path) -> None:
    """Persist the original author avatar as a small local JPEG for the catalog."""
    with Image.open(io.BytesIO(raw)) as avatar:
        save_jpeg(ImageOps.exif_transpose(avatar).convert("RGB"), destination, (256, 256), 88)


def compress_if_needed(raw: bytes, image: Image.Image) -> tuple[bytes, str]:
    if len(raw) <= THRESHOLD:
        return raw, "原文件（≤500 KB，不压缩）"
    output = io.BytesIO()
    if image.format == "GIF" and getattr(image, "n_frames", 1) > 1:
        frames = []
        durations = []
        for index in range(image.n_frames):
            image.seek(index)
            frames.append(image.convert("RGBA"))
            durations.append(image.info.get("duration", 80))
        frames[0].save(output, format="GIF", save_all=True, append_images=frames[1:], duration=durations, loop=image.info.get("loop", 0), optimize=True, disposal=2)
    else:
        image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True, progressive=True)
    candidate = output.getvalue()
    return (candidate, "压缩候选采用" if len(candidate) < len(raw) else "压缩候选未变小，保留原文件") if len(candidate) < len(raw) else (raw, "压缩候选未变小，保留原文件")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--category", required=True, choices=sorted(CATEGORIES))
    parser.add_argument("--credit-name")
    parser.add_argument("--id")
    args = parser.parse_args()
    page = fetch(args.url).decode("utf-8", errors="replace")
    discovered_url, discovered_slug, discovered_name, discovered_avatar_url = extract_page_metadata(page)
    credit_name = args.credit_name or discovered_name
    raw = fetch(discovered_url)
    avatar_payload = fetch(discovered_avatar_url) if discovered_avatar_url else None
    with Image.open(io.BytesIO(raw)) as opened:
        source_format = opened.format
        frames = getattr(opened, "n_frames", 1)
        is_animated_gif = source_format == "GIF" and frames > 1
        image = ImageOps.exif_transpose(opened)
        width, height = image.size
        media_type = "animated_gif" if is_animated_gif else "image"
        payload, compression = compress_if_needed(raw, opened)
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        cover_id = args.id or next_id(catalog, discovered_slug)
        if any(cover_id == artwork["id"] for artist in catalog["artists"] for artwork in artist["artworks"]):
            raise RuntimeError(f"封面 ID 已存在：{cover_id}；为避免重复写入已中止。")
        category_root = ASSET_ROOT / "categories" / args.category
        category_root.joinpath("images").mkdir(parents=True, exist_ok=True)
        category_root.joinpath("thumbs").mkdir(parents=True, exist_ok=True)
        extension = ".gif" if media_type == "animated_gif" and payload[:6] in (b"GIF87a", b"GIF89a") else ".jpg"
        image_path = category_root / "images" / f"{cover_id}{extension}"
        image_path.write_bytes(payload)
        frame = image.convert("RGB")
        save_jpeg(frame, category_root / "thumbs" / f"{cover_id}.jpg", (360, 360), 82)
    artist = next((a for a in catalog["artists"] if a["slug"] == base_artist_slug(discovered_slug)), None)
    if artist is None:
        artist = {"slug": base_artist_slug(discovered_slug), "display_name": discovered_name, "avatar_path": f"{base_artist_slug(discovered_slug)}/avatar.jpg", "avatar_source_url": discovered_avatar_url, "artworks": []}
        catalog["artists"].append(artist)
    else:
        artist["display_name"] = discovered_name or artist.get("display_name", "")
        if discovered_avatar_url:
            artist["avatar_source_url"] = discovered_avatar_url
    if avatar_payload and discovered_avatar_url:
        save_author_avatar(avatar_payload, ASSET_ROOT / artist["avatar_path"])
    artwork = {"id": cover_id, "width": width, "height": height, "thumbnail_path": str(image_path.relative_to(ASSET_ROOT).parent.parent / "thumbs" / f"{cover_id}.jpg"), "image_path": str(image_path.relative_to(ASSET_ROOT)), "credit_name": credit_name, "source_url": args.url, "source_image_url": discovered_url, "media_type": media_type, "categories": [args.category]}
    artist["artworks"].append(artwork)
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"id": cover_id, "category": args.category, "credit_name": credit_name, "source_url": args.url, "source_image_url": discovered_url, "avatar_source_url": discovered_avatar_url, "format": source_format, "width": width, "height": height, "frames": frames, "source_bytes": len(raw), "stored_bytes": len(payload), "compression": compression}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


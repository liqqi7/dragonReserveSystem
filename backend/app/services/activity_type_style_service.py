from __future__ import annotations

"""Activity type style config service."""

from copy import deepcopy
from typing import Optional

# Centralized type-style config.
# Future type additions only need backend changes here.
DEFAULT_ACTIVITY_TYPE_STYLES: list[dict[str, object]] = [
    {
        "key": "badminton",
        "display_name": "羽毛球",
        "default_style_key": "badminton-default",
        "styles": [
            {
                "style_key": "badminton-default",
                "style_name": "纯静态图（无头像）",
                "badge_label": "Badminton",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
                "bg_video_url": None,
            },
        ],
    },
    {
        "key": "boardgame",
        "display_name": "桌游",
        "default_style_key": "boardgame-default",
        "styles": [
            {
                "style_key": "boardgame-default",
                "style_name": "纯静态图（无头像）",
                "badge_label": "Boardgame",
                "show_badge": True,
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
                "bg_video_url": None,
            },
        ],
    },
    {
        "key": "other",
        "display_name": "其它",
        "default_style_key": "other-video",
        "styles": [
            {
                "style_key": "other-video",
                "style_name": "默认视频",
                "badge_label": "",
                "show_badge": False,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "",
                "small_card_bg_image_url": "",
                "bg_video_url": "https://dragon.liqqihome.top/media/videos/card-bg-other.mp4",
            },
        ],
    },
    {
        "key": "eating",
        "display_name": "吃饭",
        "default_style_key": "image-clean",
        "styles": [
            {
                "style_key": "image-clean",
                "style_name": "静态图无头像",
                "badge_label": "Eating",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/eating-image-clean-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/eating-image-clean-sm.png",
                "bg_video_url": None,
            },
        ],
    },
    {
        "key": "outing",
        "display_name": "\u5916\u51fa",
        "default_style_key": "outing-tram",
        "styles": [
            {
                "style_key": "outing-tram",
                "style_name": "\u9759\u6001\u56fe\u65e0\u5934\u50cf",
                "badge_label": "Outing",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/outing-tram-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/outing-tram-sm.png",
                "bg_video_url": None,
            },
            {
                "style_key": "outing-cycling",
                "style_name": "\u9759\u6001\u56fe\u65e0\u5934\u50cf2",
                "badge_label": "Outing",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/outing-cycling-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/outing-cycling-sm.png",
                "bg_video_url": None,
            }
        ],
    },
    {
        "key": "movie",
        "display_name": "电影",
        "default_style_key": "image-clean",
        "styles": [
            {
                "style_key": "image-clean",
                "style_name": "纯静态图",
                "badge_label": "Movie",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-clean-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-clean-sm.png",
                "bg_video_url": None,
            },
            {
                "style_key": "image-clean-2",
                "style_name": "纯静态图2",
                "badge_label": "Movie",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-clean-2-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-clean-2-sm.png",
                "bg_video_url": None,
            },
            {
                "style_key": "image-clean-3",
                "style_name": "Static image 3",
                "badge_label": "Movie",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-spiderverse-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/movie-image-spiderverse-sm.png",
                "bg_video_url": None,
            }
        ],
    },
]


ACTIVITY_TYPE_ALIASES = {
    "badminton": "badminton",
    "羽毛球": "badminton",
    "boardgame": "boardgame",
    "board game": "boardgame",
    "桌游": "boardgame",
    "other": "other",
    "其它": "other",
    "其他": "other",
    "eating": "eating",
    "吃饭": "eating",
    "outing": "outing",
    "\u5916\u51fa": "outing",
    "movie": "movie",
    "电影": "movie",
}


def normalize_activity_type_key(value: Optional[str]) -> str:
    """Normalize supported activity type aliases to canonical backend keys."""

    normalized = str(value or "").strip().lower()
    if not normalized:
        return ""
    return ACTIVITY_TYPE_ALIASES.get(normalized, normalized)


def _is_style_assets_ready(style: dict[str, object]) -> bool:
    """Return whether style has enough assets to be selectable."""

    large_image_url = str(style.get("large_card_bg_image_url", "") or "").strip()
    small_image_url = str(style.get("small_card_bg_image_url", "") or "").strip()
    bg_video_url = str(style.get("bg_video_url", "") or "").strip()
    if bg_video_url:
        return True
    return bool(large_image_url and small_image_url)


def _available_styles(item: dict[str, object]) -> list[dict[str, object]]:
    styles = item.get("styles") or []
    return [s for s in styles if isinstance(s, dict) and _is_style_assets_ready(s)]


def list_available_style_keys_in_order(activity_type: str) -> list[str]:
    """Return selectable style_key values for a type, in DEFAULT_ACTIVITY_TYPE_STYLES declaration order."""

    type_key = normalize_activity_type_key(activity_type)
    if not type_key:
        return []
    for item in DEFAULT_ACTIVITY_TYPE_STYLES:
        if str(item.get("key", "")).strip() != type_key:
            continue
        out: list[str] = []
        for style in _available_styles(item):
            sk = str(style.get("style_key", "")).strip()
            if sk:
                out.append(sk)
        return out
    return []


def list_activity_type_styles() -> list[dict[str, object]]:
    """Return deep-copied style config for API responses."""

    data = deepcopy(DEFAULT_ACTIVITY_TYPE_STYLES)
    for item in data:
        if isinstance(item, dict):
            item["styles"] = _available_styles(item)
    return data


def get_activity_style(activity_type: str, activity_style_key: Optional[str]) -> dict[str, object] | None:
    """Return the normalized style config for a given activity."""

    type_key = normalize_activity_type_key(activity_type)
    if not type_key:
        return None

    normalized_style_key = normalize_activity_style_key(type_key, activity_style_key)
    for item in DEFAULT_ACTIVITY_TYPE_STYLES:
        if str(item.get("key", "")).strip() != type_key:
            continue
        for style in _available_styles(item):
            style_key = str(style.get("style_key", "")).strip()
            if style_key == normalized_style_key:
                return deepcopy(style)
    return None


def get_allowed_activity_types() -> set[str]:
    """Return all allowed activity type keys."""

    return {
        str(item.get("key", "")).strip()
        for item in DEFAULT_ACTIVITY_TYPE_STYLES
        if str(item.get("key", "")).strip()
    }


def normalize_activity_style_key(activity_type: str, activity_style_key: Optional[str]) -> Optional[str]:
    """Validate and normalize style key for an activity type.

    - If style key is empty: fallback to default style key of this type.
    - If style key is provided but invalid for this type: raise ValueError.
    """

    type_key = normalize_activity_type_key(activity_type)
    if not type_key:
        raise ValueError("activity_type is required")

    for item in DEFAULT_ACTIVITY_TYPE_STYLES:
        key = str(item.get("key", "")).strip()
        if key != type_key:
            continue

        styles = _available_styles(item)
        style_keys = {str(s.get("style_key", "")).strip() for s in styles if str(s.get("style_key", "")).strip()}
        default_style_key = str(item.get("default_style_key", "")).strip()

        normalized = str(activity_style_key or "").strip()
        if not normalized:
            return default_style_key or (next(iter(style_keys), None))
        if normalized not in style_keys:
            raise ValueError(f"activity_style_key is invalid for activity_type={type_key}")
        return normalized

    raise ValueError(f"unknown activity_type={type_key}")


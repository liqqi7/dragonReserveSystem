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
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
                "bg_video_url": None,
            },
            {
                "style_key": "image-clean",
                "style_name": "纯静态图",
                "badge_label": "Badminton",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "",
                "small_card_bg_image_url": "",
                "bg_video_url": None,
            }
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
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
                "bg_video_url": None,
            },
            {
                "style_key": "image-clean",
                "style_name": "纯静态图",
                "badge_label": "Boardgame",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "",
                "small_card_bg_image_url": "",
                "bg_video_url": None,
            }
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
            {
                "style_key": "image-clean",
                "style_name": "纯静态图",
                "badge_label": "Other",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "",
                "small_card_bg_image_url": "",
                "bg_video_url": None,
            }
        ],
    },
    {
        "key": "eating",
        "display_name": "吃饭",
        "default_style_key": "image-clean",
        "styles": [
            {
                "style_key": "eating-default",
                "style_name": "默认暖色",
                "badge_label": "Eating",
                "show_badge": True,
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
                "bg_video_url": None,
            },
            {
                "style_key": "image-clean",
                "style_name": "静态图无头像",
                "badge_label": "Eating",
                "show_badge": True,
                "show_avatar_cluster": False,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/eating-image-clean-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/eating-image-clean-sm.png",
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
                "style_key": "movie-default",
                "style_name": "默认深色",
                "badge_label": "Movie",
                "show_badge": True,
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
                "bg_video_url": None,
            },
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
            }
        ],
    },
]


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


def _style_mode(style: dict[str, object]) -> str:
    bg_video_url = str(style.get("bg_video_url", "") or "").strip()
    has_images = bool(
        str(style.get("large_card_bg_image_url", "") or "").strip()
        and str(style.get("small_card_bg_image_url", "") or "").strip()
    )
    show_avatar_cluster = bool(style.get("show_avatar_cluster", False))
    if bg_video_url:
        return "video"
    if has_images and show_avatar_cluster:
        return "image-avatar"
    if has_images:
        return "image-only"
    return "unknown"


def list_selectable_styles_by_rule(activity_type: str) -> list[dict[str, object]]:
    """Return selectable styles in rule priority order for type.

    Rules:
    - boardgame / badminton / eating: prefer image+avatar styles
    - movie: prefer image-only styles
    - other: prefer video styles
    If preferred bucket is empty, fallback to all available styles.
    """

    type_key = str(activity_type or "").strip()
    if not type_key:
        return []

    for item in DEFAULT_ACTIVITY_TYPE_STYLES:
        if str(item.get("key", "")).strip() != type_key:
            continue

        styles = _available_styles(item)
        if not styles:
            return []

        preferred_mode_by_type = {
            "other": "video",
            "movie": "image-only",
        }
        preferred_mode = preferred_mode_by_type.get(type_key, "image-avatar")
        preferred = [s for s in styles if _style_mode(s) == preferred_mode]
        return preferred or styles

    return []


def list_activity_type_styles() -> list[dict[str, object]]:
    """Return deep-copied style config for API responses."""

    data = deepcopy(DEFAULT_ACTIVITY_TYPE_STYLES)
    for item in data:
        if isinstance(item, dict):
            item["styles"] = _available_styles(item)
    return data


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

    type_key = str(activity_type or "").strip()
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


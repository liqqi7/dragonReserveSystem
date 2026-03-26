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
                "style_name": "默认粉黄",
                "badge_label": "Badminton",
                "show_badge": True,
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
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
                "style_name": "默认蓝色",
                "badge_label": "Boardgame",
                "show_badge": True,
                "show_avatar_cluster": True,
                "large_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
                "small_card_bg_image_url": "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
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
                "bg_video_url": "https://dragon.liqqihome.top/media/media/card-bg-other.mp4",
            }
        ],
    },
]


def list_activity_type_styles() -> list[dict[str, object]]:
    """Return deep-copied style config for API responses."""

    return deepcopy(DEFAULT_ACTIVITY_TYPE_STYLES)


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

        styles = item.get("styles") or []
        style_keys = {str(s.get("style_key", "")).strip() for s in styles if str(s.get("style_key", "")).strip()}
        default_style_key = str(item.get("default_style_key", "")).strip()

        normalized = str(activity_style_key or "").strip()
        if not normalized:
            return default_style_key or (next(iter(style_keys), None))
        if normalized not in style_keys:
            raise ValueError(f"activity_style_key is invalid for activity_type={type_key}")
        return normalized

    raise ValueError(f"unknown activity_type={type_key}")


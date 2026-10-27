#!/usr/bin/env python3
"""拉取 BGG 综合排行榜前 50 名的可控客观数据集。

详情接口只请求 stats、versions 和 videos，不请求评论、评分明细、市场列表、
论坛或用户收藏。每批最多 20 个 ID，批次间隔 6 秒。
"""

from __future__ import annotations

import csv
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TOP_50 = [
    (1, 224517, "Brass: Birmingham"),
    (2, 342942, "Ark Nova"),
    (3, 161936, "Pandemic Legacy: Season 1"),
    (4, 174430, "Gloomhaven"),
    (5, 397598, "Dune: Imperium – Uprising"),
    (6, 316554, "Dune: Imperium"),
    (7, 233078, "Twilight Imperium: Fourth Edition"),
    (8, 115746, "War of the Ring: Second Edition"),
    (9, 167791, "Terraforming Mars"),
    (10, 187645, "Star Wars: Rebellion"),
    (11, 162886, "Spirit Island"),
    (12, 291457, "Gloomhaven: Jaws of the Lion"),
    (13, 220308, "Gaia Project"),
    (14, 418059, "SETI: Search for Extraterrestrial Intelligence"),
    (15, 338960, "Slay the Spire: The Board Game"),
    (16, 12333, "Twilight Struggle"),
    (17, 84876, "The Castles of Burgundy"),
    (18, 182028, "Through the Ages: A New Story of Civilization"),
    (19, 421006, "The Lord of the Rings: Duel for Middle-earth"),
    (20, 295770, "Frosthaven"),
    (21, 193738, "Great Western Trail"),
    (22, 28720, "Brass: Lancashire"),
    (23, 246900, "Eclipse: Second Dawn for the Galaxy"),
    (24, 173346, "7 Wonders Duel"),
    (25, 167355, "Nemesis"),
    (26, 169786, "Scythe"),
    (27, 177736, "A Feast for Odin"),
    (28, 266507, "Clank! Legacy: Acquisitions Incorporated"),
    (29, 124361, "Concordia"),
    (30, 312484, "Lost Ruins of Arnak"),
    (31, 341169, "Great Western Trail: Second Edition"),
    (32, 373106, "Sky Team"),
    (33, 205637, "Arkham Horror: The Card Game"),
    (34, 237182, "Root"),
    (35, 164928, "Orléans"),
    (36, 120677, "Terra Mystica"),
    (37, 192135, "Too Many Bones"),
    (38, 266192, "Wingspan"),
    (39, 96848, "Mage Knight Board Game"),
    (40, 251247, "Barrage"),
    (41, 321608, "Hegemony: Lead Your Class to Victory"),
    (42, 284378, "Kanban EV"),
    (43, 183394, "Viticulture Essential Edition"),
    (44, 324856, "The Crew: Mission Deep Sea"),
    (45, 521, "Crokinole"),
    (46, 199792, "Everdell"),
    (47, 366013, "Heat: Pedal to the Metal"),
    (48, 365717, "Clank!: Catacombs"),
    (49, 285774, "Marvel Champions: The Card Game"),
    (50, 390092, "Ticket to Ride Legacy: Legends of the West"),
]

BATCH_SIZE = 20
BATCH_DELAY_SECONDS = 6
IMAGE_DELAY_SECONDS = 1
USER_AGENT = "DragonReserveSystem/1.0 (BGG dataset research)"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def request_bytes(url: str, token: str | None = None, retries: int = 5) -> bytes:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/xml,image/*,*/*"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers=headers), timeout=120
            ) as response:
                if response.status == 202:
                    raise urllib.error.HTTPError(
                        url, 202, "BGG queued request", response.headers, None
                    )
                return response.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in {202, 429, 500, 502, 503, 504} or attempt == retries - 1:
                raise
            time.sleep(10 * (attempt + 1))
        except urllib.error.URLError:
            if attempt == retries - 1:
                raise
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Request failed after retries: {url}")


def xml_to_object(element: ET.Element) -> dict[str, Any]:
    result: dict[str, Any] = {"tag": element.tag}
    if element.attrib:
        result["attributes"] = dict(element.attrib)
    text = (element.text or "").strip()
    if text:
        result["text"] = text
    children = [xml_to_object(child) for child in element]
    if children:
        result["children"] = children
    return result


def value_of(parent: ET.Element, tag: str) -> Any:
    node = parent.find(tag)
    if node is None:
        return None
    value = node.attrib.get("value")
    if value is None:
        value = (node.text or "").strip() or None
    if isinstance(value, str):
        if re.fullmatch(r"-?\d+", value):
            return int(value)
        if re.fullmatch(r"-?\d+\.\d+", value):
            return float(value)
    return value


def normalize_poll(poll: ET.Element) -> dict[str, Any]:
    return {
        "name": poll.attrib.get("name"),
        "title": poll.attrib.get("title"),
        "total_votes": int(poll.attrib.get("totalvotes", "0")),
        "results": [
            {
                "attributes": dict(results.attrib),
                "options": [dict(result.attrib) for result in results.findall("result")],
            }
            for results in poll.findall("results")
        ],
    }


def normalize_game(item: ET.Element, rank: int, expected_name: str) -> dict[str, Any]:
    names = [dict(node.attrib) for node in item.findall("name")]
    primary_name = next(
        (node.get("value") for node in names if node.get("type") == "primary"),
        expected_name,
    )
    links: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for link in item.findall("link"):
        link_type = link.attrib.get("type", "unknown")
        links[link_type].append(
            {
                "id": int(link.attrib["id"]) if link.attrib.get("id", "").isdigit() else link.attrib.get("id"),
                "name": link.attrib.get("value"),
                "inbound": link.attrib.get("inbound") == "true" if "inbound" in link.attrib else None,
            }
        )

    ratings = item.find("statistics/ratings")
    ranks: list[dict[str, Any]] = []
    if ratings is not None:
        for rank_node in ratings.findall("ranks/rank"):
            rank_data = dict(rank_node.attrib)
            for key in ("id",):
                if rank_data.get(key, "").isdigit():
                    rank_data[key] = int(rank_data[key])
            for key in ("value",):
                if rank_data.get(key, "").isdigit():
                    rank_data[key] = int(rank_data[key])
            for key in ("bayesaverage",):
                try:
                    rank_data[key] = float(rank_data[key])
                except (KeyError, ValueError):
                    pass
            ranks.append(rank_data)

    stats = None
    if ratings is not None:
        stats = {
            "users_rated": value_of(ratings, "usersrated"),
            "average_rating": value_of(ratings, "average"),
            "bayes_average": value_of(ratings, "bayesaverage"),
            "stddev": value_of(ratings, "stddev"),
            "median": value_of(ratings, "median"),
            "owned": value_of(ratings, "owned"),
            "trading": value_of(ratings, "trading"),
            "wanting": value_of(ratings, "wanting"),
            "wishing": value_of(ratings, "wishing"),
            "num_comments": value_of(ratings, "numcomments"),
            "num_weights": value_of(ratings, "numweights"),
            "average_weight": value_of(ratings, "averageweight"),
            "ranks": ranks,
        }

    versions = item.findall("versions/item")
    videos = item.findall("videos/video")
    image_url = (item.findtext("image") or "").strip() or None
    thumbnail_url = (item.findtext("thumbnail") or "").strip() or None
    if image_url and image_url.startswith("//"):
        image_url = "https:" + image_url
    if thumbnail_url and thumbnail_url.startswith("//"):
        thumbnail_url = "https:" + thumbnail_url

    return {
        "bgg_rank_at_capture": rank,
        "bgg_id": int(item.attrib["id"]),
        "type": item.attrib.get("type"),
        "bgg_url": f"https://boardgamegeek.com/boardgame/{item.attrib['id']}",
        "names": {
            "primary": primary_name,
            "alternate": [
                node.get("value") for node in names if node.get("type") != "primary"
            ],
            "all": names,
        },
        "description": html.unescape(item.findtext("description") or ""),
        "year_published": value_of(item, "yearpublished"),
        "players": {
            "min": value_of(item, "minplayers"),
            "max": value_of(item, "maxplayers"),
        },
        "playing_time_minutes": {
            "nominal": value_of(item, "playingtime"),
            "min": value_of(item, "minplaytime"),
            "max": value_of(item, "maxplaytime"),
        },
        "minimum_age": value_of(item, "minage"),
        "images": {
            "image_url": image_url,
            "thumbnail_url": thumbnail_url,
            "local_cover": f"covers/{rank:02d}-{item.attrib['id']}.jpg" if image_url else None,
        },
        "polls": [normalize_poll(poll) for poll in item.findall("poll")],
        "links": dict(links),
        "statistics": stats,
        "versions_count": len(versions),
        "versions": [xml_to_object(version) for version in versions],
        "videos_count": len(videos),
        "videos": [dict(video.attrib) for video in videos],
    }


def write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def jpeg_download_url(image_url: str) -> str:
    """保留 XML 中的原始图片 URL，仅让 Geekdo CDN 为本地封面输出 JPEG。"""
    return re.sub(r"filters:format\([^)]+\)", "filters:format(jpeg)", image_url)


def fetch_dataset(output_dir: Path, env_path: Path) -> None:
    env = load_env(env_path)
    token = os.environ.get("BGG_API_TOKEN") or env.get("BGG_API_TOKEN")
    base_url = (
        os.environ.get("BGG_API_BASE_URL")
        or env.get("BGG_API_BASE_URL")
        or "https://boardgamegeek.com/xmlapi2"
    ).rstrip("/")
    if not token:
        raise RuntimeError(f"BGG_API_TOKEN is missing from environment or {env_path}")

    raw_dir = output_dir / "raw"
    cover_dir = output_dir / "covers"
    raw_dir.mkdir(parents=True, exist_ok=True)
    cover_dir.mkdir(parents=True, exist_ok=True)
    capture_time = datetime.now(timezone.utc).isoformat()

    items_by_id: dict[int, ET.Element] = {}
    generic_items: list[dict[str, Any]] = []
    for batch_index in range(0, len(TOP_50), BATCH_SIZE):
        batch = TOP_50[batch_index : batch_index + BATCH_SIZE]
        ids = ",".join(str(game_id) for _, game_id, _ in batch)
        query = urllib.parse.urlencode(
            {
                "id": ids,
                "type": "boardgame",
                "stats": "1",
                "versions": "1",
                "videos": "1",
            },
            safe=",",
        )
        url = f"{base_url}/thing?{query}"
        data = request_bytes(url, token=token)
        batch_number = batch_index // BATCH_SIZE + 1
        (raw_dir / f"thing-batch-{batch_number}.xml").write_bytes(data)
        root = ET.fromstring(data)
        for item in root.findall("item"):
            game_id = int(item.attrib["id"])
            items_by_id[game_id] = item
            generic_items.append(xml_to_object(item))
        print(f"Fetched batch {batch_number}: {len(root.findall('item'))} games", flush=True)
        if batch_index + BATCH_SIZE < len(TOP_50):
            time.sleep(BATCH_DELAY_SECONDS)

    missing_ids = [game_id for _, game_id, _ in TOP_50 if game_id not in items_by_id]
    if missing_ids:
        raise RuntimeError(f"BGG response missing IDs: {missing_ids}")

    normalized_games = [
        normalize_game(items_by_id[game_id], rank, expected_name)
        for rank, game_id, expected_name in TOP_50
    ]
    write_json(output_dir / "games.normalized.json", normalized_games)
    write_json(
        output_dir / "games.full.json",
        {
            "captured_at_utc": capture_time,
            "source": "BGG XML API2 thing",
            "items": generic_items,
        },
    )

    with (output_dir / "games.summary.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "rank",
                "bgg_id",
                "name",
                "year_published",
                "min_players",
                "max_players",
                "min_playtime_minutes",
                "max_playtime_minutes",
                "minimum_age",
                "average_rating",
                "bayes_average",
                "users_rated",
                "average_weight",
                "versions_count",
                "videos_count",
                "image_url",
                "bgg_url",
            ],
        )
        writer.writeheader()
        for game in normalized_games:
            stats = game["statistics"] or {}
            writer.writerow(
                {
                    "rank": game["bgg_rank_at_capture"],
                    "bgg_id": game["bgg_id"],
                    "name": game["names"]["primary"],
                    "year_published": game["year_published"],
                    "min_players": game["players"]["min"],
                    "max_players": game["players"]["max"],
                    "min_playtime_minutes": game["playing_time_minutes"]["min"],
                    "max_playtime_minutes": game["playing_time_minutes"]["max"],
                    "minimum_age": game["minimum_age"],
                    "average_rating": stats.get("average_rating"),
                    "bayes_average": stats.get("bayes_average"),
                    "users_rated": stats.get("users_rated"),
                    "average_weight": stats.get("average_weight"),
                    "versions_count": game["versions_count"],
                    "videos_count": game["videos_count"],
                    "image_url": game["images"]["image_url"],
                    "bgg_url": game["bgg_url"],
                }
            )

    for index, game in enumerate(normalized_games):
        image_url = game["images"]["image_url"]
        if not image_url:
            continue
        destination = output_dir / game["images"]["local_cover"]
        try:
            image_data = request_bytes(jpeg_download_url(image_url), retries=3)
            destination.write_bytes(image_data)
        except Exception as exc:  # 封面失败不阻断结构化数据交付
            print(f"Cover failed for BGG {game['bgg_id']}: {exc}", file=sys.stderr)
        if index < len(normalized_games) - 1:
            time.sleep(IMAGE_DELAY_SECONDS)

    metadata = {
        "captured_at_utc": capture_time,
        "ranking": {
            "name": "BGG Board Game Rank",
            "source_url": "https://boardgamegeek.com/browse/boardgame",
            "range": "1-50",
        },
        "details": {
            "source": "BGG XML API2 /thing",
            "parameters": ["type=boardgame", "stats=1", "versions=1", "videos=1"],
            "batch_size": BATCH_SIZE,
            "batch_delay_seconds": BATCH_DELAY_SECONDS,
        },
        "included": [
            "基础属性和所有名称",
            "主封面和缩略图 URL",
            "玩家人数、时长、年龄和 BGG 投票建议",
            "简介",
            "分类、机制、家族、设计师、美术、出版商和关联桌游",
            "评分、排名、评分人数、收藏状态统计和重度",
            "所有版本元数据",
            "视频元数据",
            "50 张主封面本地文件",
        ],
        "excluded_for_size_or_volatility": [
            "comments",
            "ratingcomments",
            "marketplace",
            "forums and threads",
            "user collections",
            "play logs",
        ],
        "counts": {
            "expected_games": len(TOP_50),
            "fetched_games": len(normalized_games),
            "downloaded_covers": sum(
                1
                for game in normalized_games
                if game["images"]["local_cover"]
                and (output_dir / game["images"]["local_cover"]).exists()
            ),
            "versions": sum(game["versions_count"] for game in normalized_games),
            "videos": sum(game["videos_count"] for game in normalized_games),
        },
    }
    write_json(output_dir / "dataset-metadata.json", metadata)

    readme = f"""# BGG 综合排行榜前 50 名数据集

- 抓取时间（UTC）：`{capture_time}`
- 排行榜：[BGG Board Game Rank](https://boardgamegeek.com/browse/boardgame)
- 范围：当时排名 1–50
- 详情来源：BGG XML API2 `thing`
- 详情请求：`stats=1` + `versions=1` + `videos=1`

## 文件

- `games.summary.csv`：便于浏览和导入表格的摘要。
- `games.normalized.json`：按产品使用场景整理的完整结构化数据。
- `games.full.json`：尽量保真地将 XML 节点转为 JSON，便于查找遗漏字段。
- `raw/thing-batch-*.xml`：BGG 原始响应，每批最多 20 款。
- `covers/`：50 款桌游的主封面。
- `dataset-metadata.json`：抓取范围、排除项和数量自检。

## 数量边界

保留了基础信息、简介、封面、投票建议、分类/机制/人员/出版商/关联项、
评分与排名统计、版本和视频元数据。为了保证总量可控，未请求评论、逐条评分、
市场售卖列表、论坛、用户收藏及游玩记录。

## 使用提示

这份数据适合内部产品研究和原型参考。上线页面需按 BGG 条款展示可点击的
`Powered by BGG`。排名和评分会随时间变化，使用时请保留抓取时间。
"""
    (output_dir / "README.md").write_text(readme, encoding="utf-8")


def main() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    project_dir = backend_dir.parent
    default_output = project_dir / "research" / "bgg-top-50-2026-08-30"
    output_dir = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else default_output
    output_dir.mkdir(parents=True, exist_ok=True)
    fetch_dataset(output_dir, backend_dir / ".env")
    print(f"Dataset written to: {output_dir}", flush=True)


if __name__ == "__main__":
    main()

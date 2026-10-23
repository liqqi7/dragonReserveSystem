#!/usr/bin/env python3
"""W1 新增桌游页后端验证（临时脚本）。"""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def load_env_file(p):
    for raw in Path(p).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env_file(str(Path(__file__).resolve().parents[1] / ".env.test"))

from sqlalchemy import select
from app.api.v1.boardgame_search import merge_expansions
from app.core.database import SessionLocal
from app.models import User
from app.models.boardgame import BoardGame, ExpansionLink, PreviewItem
from app.services import boardgame_intake as intake

# 1) 搜索合并单测
items = [
    {"bgg_id": 1, "game_type": "boardgame", "name": "Nucleum"},
    {"bgg_id": 2, "game_type": "boardgameexpansion", "name": "Nucleum: Australia"},
    {"bgg_id": 3, "game_type": "boardgameexpansion", "name": "Nucleum: Court of Progress"},
    {"bgg_id": 4, "game_type": "boardgameexpansion", "name": "Nucleum: Patrons Set"},
    {"bgg_id": 5, "game_type": "boardgame", "name": "Brass: Birmingham"},
    {"bgg_id": 6, "game_type": "boardgameexpansion", "name": "Splendor: The Sun Never Sets"},
]
merged = merge_expansions([dict(i) for i in items])
base = next(i for i in merged if i["bgg_id"] == 1)
assert base.get("expansion_count") == 3, base
assert all(merged[i].get("expansion_of_bgg_id") == 1 for i in (1, 2, 3)), merged
assert merged[5].get("expansion_of_bgg_id") is None, merged[5]  # 无基础在场的扩不合并
assert merged[4].get("expansion_of_bgg_id") is None, merged[4]  # 名称含冒号的基础不误伤
print("1) merge_expansions OK: Nucleum 含 3 扩被折叠，Splendor 扩无基础在场保留，Brass 基础不误伤")

with SessionLocal() as db:
    actor = db.get(User, 1)

    # 2) candidate 返回 expansion_links（用缓存的 Nucleum 预览）
    item = db.scalar(select(PreviewItem).where(PreviewItem.bgg_id == 396790, PreviewItem.state == "ready")
                     .order_by(PreviewItem.id.desc()).limit(1))
    assert item, "缺少 Nucleum 预览项"
    cand = intake.candidate(db, item, actor)
    links = cand["expansion_links"]
    in_lib = [l for l in links if l["in_library"]]
    already = [l for l in links if l["already_linked"]]
    print(f"2) candidate expansion_links OK: 共 {len(links)} 条（在库 {len(in_lib)}，已关联 {len(already)}）")
    assert len(links) >= 3 and len(in_lib) == 3 and len(already) == 3, (len(links), len(in_lib), len(already))
    for l in links[:3]:
        print("   -", l["bgg_id"], l["name"], "| in_library:", l["in_library"], "| already_linked:", l["already_linked"])

    # 3) only_bgg_ids 过滤（非 promo 扩 189 Australia / bgg 408223；删除先 commit 再重建，避免同会话同主键 delete/add 冲突）
    game = db.get(BoardGame, 180)
    if db.get(ExpansionLink, (180, 189)) is None:  # 幂等起步：上次中断遗留则先补回
        intake.link_expansions_from_thing(db, game, item, actor, only_bgg_ids=[408223])
        db.commit()
    intake.link_expansions_from_thing(db, game, item, actor, only_bgg_ids=[])
    assert len(db.scalars(select(ExpansionLink).where(ExpansionLink.base_game_id == 180)).all()) == 5, "空选择不应改动既有关联"
    db.delete(db.get(ExpansionLink, (180, 189)))
    db.commit()
    intake.link_expansions_from_thing(db, game, item, actor, only_bgg_ids=[425063])
    db.flush()
    assert db.get(ExpansionLink, (180, 189)) is None, "未选 189 不应重建"
    intake.link_expansions_from_thing(db, game, item, actor, only_bgg_ids=[408223])
    db.flush()
    assert db.get(ExpansionLink, (180, 189)), "选中 189 应重建"
    db.commit()
    total = len(db.scalars(select(ExpansionLink.expansion_game_id).where(ExpansionLink.base_game_id == 180)).all())
    print(f"3) only_bgg_ids 过滤 OK（已还原，当前关联数 {total}）")
    assert total == 5, total
print("W1 后端验证全部通过")

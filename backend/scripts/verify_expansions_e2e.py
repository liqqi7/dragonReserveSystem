#!/usr/bin/env python3
"""W0-5 扩展能力端到端验证（临时脚本，验证后可删）。"""
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

from datetime import date
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.exceptions import AppError
from app.models import User
from app.models.boardgame import ExpansionLink, Play
from app.schemas.boardgame import ExpansionLinksPut
from app.schemas.boardgame_plays import PlayCreate, PlayPlayerIn, PlayUpdate
from app.services import boardgame_catalog as catalog, boardgame_plays as plays

with SessionLocal() as db:
    actor = db.get(User, 1)

    before = sorted(r[0] for r in db.execute(select(ExpansionLink.expansion_game_id).where(ExpansionLink.base_game_id == 180)))
    items = catalog.set_expansions(db, 180, actor, ExpansionLinksPut(expansion_game_ids=[189], reason="测试修改扩"))
    assert [i["id"] for i in items if i["linked"]] == [189], items  # 全集版返回，以 linked 为准
    db.commit()
    catalog.set_expansions(db, 180, actor, ExpansionLinksPut(expansion_game_ids=before, reason="还原"))
    db.commit()
    restored = sorted(r[0] for r in db.execute(select(ExpansionLink.expansion_game_id).where(ExpansionLink.base_game_id == 180)))
    assert restored == before, (restored, before)  # 返回视图会过滤 promo，还原以落库为准
    print("1) set_expansions 修改+还原 OK ->", before)

    payload = PlayCreate(game_id=180, played_on=date(2026, 10, 19),
                         players=[PlayPlayerIn(user_id=1, score=88), PlayPlayerIn(user_id=3, score=66)],
                         expansion_game_ids=[189, 199])
    play = plays.create_play(db, actor, payload)
    db.commit()
    detail = plays.play_detail(db, play, actor)
    exps = detail["expansions"]
    assert [e["name"] for e in exps] == ["Nucleum: Australia", "Nucleum: Court of Progress"], exps
    assert exps[0]["chinese_name"].startswith("核子"), exps
    print("2) 创建带扩对局 OK ->", [(e["name"], e["chinese_name"]) for e in exps])

    plays.update_play(db, play, actor, PlayUpdate(expected_revision=play.revision, expansion_game_ids=[199]))
    db.commit()
    detail = plays.play_detail(db, play, actor)
    assert [e["game_id"] for e in detail["expansions"]] == [199], detail["expansions"]
    print("3) 修改对局扩 OK ->", [e["name"] for e in detail["expansions"]])

    try:
        catalog.validate_expansion_ids(db, 180, [96])
        print("4) 负例失败：未拦截")
    except AppError as exc:
        print("4) 负例拦截 OK ->", exc.code, exc.message)

    try:
        catalog.validate_expansion_ids(db, 180, [180])
        print("5) 负例失败：未拦截")
    except AppError as exc:
        print("5) 负例拦截 OK ->", exc.code, exc.message)

    plays.delete_play(db, play, actor)
    db.commit()
    print("6) 测试对局已归档清理")

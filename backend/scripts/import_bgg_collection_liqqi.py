#!/usr/bin/env python3
"""导入 BGG 用户收藏（own=1）到本地桌游库：目录建档 + 拥有副本。

在 backend/ 目录下运行:
  .venv/bin/python scripts/import_bgg_collection_liqqi.py [--username liqqi] [--user-id N]

报告写入 storage-private/import-bgg-collection-report.json
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path
from uuid import UUID

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def load_env_file(path) -> None:
    p = Path(path)
    if not p.is_file():
        return
    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(BACKEND / ".env.test")
os.environ.setdefault("APP_ENV", "test")

REPORT_PATH = BACKEND / "storage-private" / "import-bgg-collection-report.json"
report = {
    "username": None, "actor": None, "candidates": [], "preflight": {},
    "collection_ids": 0, "preview_jobs": [], "created": [], "reused": [],
    "inventory_created": 0, "skipped_owned": [], "failed": [], "errors": [],
}


def save_report() -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


def is_test_user(u) -> bool:
    return (u.username or "").startswith("test_user_") or (u.wechat_openid or "").startswith("test_openid_")


def pick_actor(users, user_id):
    if user_id:
        return next((u for u in users if u.id == user_id), None)
    admins = [u for u in users if u.role == "admin"]
    real_admins = [u for u in admins if not is_test_user(u)]
    if real_admins:
        return real_admins[0]
    if admins:
        return admins[0]
    members = [u for u in users if u.role == "user" and not is_test_user(u)]
    return members[0] if members else None


def fetch_collection_ids(settings, sources, bgg_client, username):
    url = settings.bgg_api_base_url.rstrip("/") + "/collection"
    headers = {"Authorization": f"Bearer {settings.bgg_api_token}", "Accept": "application/xml"}
    status, content = 0, b""
    for attempt in range(1, 9):
        try:
            with bgg_client(None) as client:
                resp = client.get(url, params={"username": username, "own": 1}, headers=headers)
            status, content = resp.status_code, resp.content
        except Exception as exc:
            report["errors"].append(f"collection 请求异常(第{attempt}次): {exc.__class__.__name__}")
            time.sleep(5)
            continue
        if status == 202:
            time.sleep(5)
            continue
        break
    if status != 200:
        report["errors"].append(f"BGG collection 拉取失败: HTTP {status}")
        return None
    root = sources.xml_root(content)
    return sorted({int(n.get("objectid")) for n in root.findall("item") if (n.get("objectid") or "").isdigit()})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", default="liqqi")
    parser.add_argument("--user-id", type=int, default=None)
    args = parser.parse_args()
    report["username"] = args.username

    from sqlalchemy import select
    from app.core.config import get_settings
    from app.core.database import SessionLocal
    from app.core.exceptions import AppError
    from app.models import User
    from app.models.boardgame import PreviewJob, PreviewItem, BoardGame, Inventory
    from app.services import boardgame_intake as intake
    from app.services import boardgame_preview as previews
    from app.services import boardgame_sources as sources
    from app.services.boardgame_http import client as bgg_client
    from app.services.boardgame_worker import run_once
    from app.schemas.boardgame_intake import IntakeConfirm, IntakeInventory

    settings = get_settings()
    report["preflight"] = {
        "boardgame_enabled": settings.boardgame_enabled,
        "boardgame_preview_worker_enabled": settings.boardgame_preview_worker_enabled,
        "bgg_enabled": settings.bgg_enabled,
        "bgg_api_token_set": bool(settings.bgg_api_token),
    }
    missing = [k for k, v in report["preflight"].items() if not v]
    if missing:
        report["errors"].append(
            "配置缺失: " + ", ".join(missing) +
            "。请在 backend/.env.test 开启 BOARDGAME_ENABLED / BOARDGAME_PREVIEW_WORKER_ENABLED / BGG_ENABLED 并配置 BGG_API_TOKEN 后重跑。")
        save_report()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 3

    with SessionLocal() as db:
        users = list(db.scalars(select(User).order_by(User.id)))
    report["candidates"] = [{"id": u.id, "nickname": u.nickname, "username": u.username, "role": u.role} for u in users[:20]]
    actor = pick_actor(users, args.user_id)
    if actor is None:
        report["errors"].append("数据库中没有可用用户（member/admin）。请先在小程序里登录一次，或用 --user-id 指定。")
        save_report()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 2
    if args.user_id and actor.id != args.user_id:
        report["errors"].append(f"找不到 user_id={args.user_id}")
        save_report()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 2
    report["actor"] = {"id": actor.id, "nickname": actor.nickname, "role": actor.role}

    ids = fetch_collection_ids(settings, sources, bgg_client, args.username)
    if ids is None:
        save_report()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 4
    report["collection_ids"] = len(ids)
    if not ids:
        report["errors"].append(f"BGG 账号 {args.username} 的 own=1 收藏为空（或账号不存在/设为私有）")
        save_report()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 5

    # intake 设计为每个预览任务只能确认一个游戏，因此每个 BGG id 单独建任务
    chunks = [[identity] for identity in ids]
    job_ids = []
    with SessionLocal() as db:
        for chunk in chunks:
            job = intake.new_preview(db, actor, chunk)
            job_ids.append(str(job.id))
        db.commit()
    report["preview_jobs"] = job_ids

    deadline = time.time() + 1800
    pending = set(job_ids)
    while pending and time.time() < deadline:
        run_once(SessionLocal)
        with SessionLocal() as db:
            for jid in list(pending):
                job = db.get(PreviewJob, jid)
                if job is None or job.state in ("ready", "failed"):
                    pending.discard(jid)
                else:
                    previews.expire_stalled(db, job)
            db.commit()
        if pending:
            time.sleep(1)
    for jid in pending:
        report["failed"].append({"preview_job": jid, "error": "处理超时（600 秒未完成）"})

    with SessionLocal() as db:
        for jid in job_ids:
            job = db.get(PreviewJob, jid)
            if job is None or job.state != "ready":
                report["failed"].append({"preview_job": jid, "error": f"预览未就绪: state={getattr(job, 'state', None)}, error={getattr(job, 'error_code', None)}"})
                continue
            items = list(db.scalars(select(PreviewItem).where(PreviewItem.job_id == jid, PreviewItem.source_kind == "thing")))
            for item in items:
                try:
                    game = db.scalar(select(BoardGame).where(BoardGame.bgg_id == item.bgg_id))
                    if game is not None:
                        owned = db.scalar(select(Inventory.id).where(
                            Inventory.game_id == game.id, Inventory.owner_user_id == actor.id,
                            Inventory.archived_at.is_(None)).limit(1))
                        if owned:
                            report["skipped_owned"].append({"bgg_id": item.bgg_id, "game_id": game.id, "name": game.name})
                            continue
                    form = IntakeConfirm(
                        source="bgg", preview_id=UUID(jid), item_id=item.id,
                        expected_revision=item.revision, version_unspecified=True,
                        inventory=IntakeInventory(owner_user_id=actor.id, status="available"))
                    known_name = game.name if game is not None else None
                    result_ids = intake.confirm(db, actor, form)
                    db.commit()
                    entry = {"bgg_id": item.bgg_id, "game_id": result_ids[0],
                             "inventory_ids": result_ids[1:], "name": known_name}
                    (report["reused"] if game is not None else report["created"]).append(entry)
                    report["inventory_created"] += len(result_ids) - 1
                except AppError as exc:
                    db.rollback()
                    report["failed"].append({"bgg_id": item.bgg_id, "error": getattr(exc, "code", str(exc))})
                except Exception as exc:
                    db.rollback()
                    report["failed"].append({"bgg_id": item.bgg_id, "error": f"{exc.__class__.__name__}: {exc}"})

    save_report()
    keys = ("username", "actor", "collection_ids", "created", "reused", "inventory_created", "skipped_owned", "failed", "errors")
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in report.items() if k in keys},
                     ensure_ascii=False, indent=2))
    print(f"\n完整报告: {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

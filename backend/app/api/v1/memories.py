"""Memory consumers: submission, browsing, manual review and cleanup."""

import base64
from datetime import datetime
import hashlib
import hmac
import json
import time
from typing import Literal

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models import User
from app.models.memory import Memory, MemoryMedia
from app.schemas.memory import MediaDeclaration, MemoryCleanupRequest, MemoryDraftRequest, MemoryMetadata, MemoryReviewRequest
from app.services import memory_media, memory_service as service

router = APIRouter(tags=["memories"])


@router.post("/memory-drafts", status_code=201)
def create(payload: MemoryDraftRequest, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    memory = service.create_draft(db, actor, payload)
    return receipt(db, memory)


def receipt(db, memory):
    return {"id": memory.id, "status": memory.status,
            "media": [{"id": item.id, "slot": item.sort, "state": item.state} for item in service.assets(db, memory.id)]}


@router.get("/memory-drafts/{memory_id}")
def draft(memory_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return receipt(db, service.owned_draft(db, memory_id, actor))


@router.post("/memory-drafts/{memory_id}/media/{slot}")
def upload(memory_id: int, slot: int = Path(..., ge=0, le=1000000), file: UploadFile = File(...), db: Session = Depends(get_db),
           actor: User = Depends(get_current_user)):
    item = service.upload(db, memory_id, slot, actor, file.file)
    return {"id": item.id, "slot": item.sort, "state": item.state}


@router.put("/memory-drafts/{memory_id}/media/{slot}")
def declare(memory_id: int, slot: int, payload: MediaDeclaration,
            db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    if not 0 <= slot <= 1000000:
        raise AppError("VALIDATION_ERROR", "上传位置无效", 422)
    item = service.declare_media(db, memory_id, slot, actor, payload)
    return {"id": item.id, "slot": item.sort, "state": item.state}


@router.delete("/memory-drafts/{memory_id}/media/{slot}")
def remove(memory_id: int, slot: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    if not 0 <= slot <= 1000000:
        raise AppError("VALIDATION_ERROR", "上传位置无效", 422)
    return service.remove_media(db, memory_id, slot, actor)


@router.post("/memory-drafts/{memory_id}/submit")
def submit(memory_id: int, payload: MemoryMetadata | None = None,
           db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return service.submit(db, memory_id, actor, payload)


@router.delete("/memory-drafts/{memory_id}")
def cancel(memory_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    memory = service.get_memory(db, memory_id)
    service.member(actor)
    return service.cleanup(db, memory_id, actor, memory.revision, cancel=True)


def list_page(db, status, limit, cursor, actor=None, individual=False):
    stmt = select(Memory).where(Memory.status == status)
    if actor and individual:
        matching = service.review_media_filter(status)
        stmt = select(Memory).where(select(MemoryMedia.id).where(
            MemoryMedia.memory_id == Memory.id, matching).exists())
    column = Memory.published_at if not actor else Memory.created_at
    if cursor:
        try:
            timestamp, identifier = json.loads(base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
            timestamp, identifier = datetime.fromisoformat(timestamp), int(identifier)
        except (ValueError, TypeError, OverflowError):
            raise AppError("MEMORY_CURSOR_INVALID", "分页标记无效，请刷新", 422)
        stmt = stmt.where(or_(column < timestamp, (column == timestamp) & (Memory.id < identifier)))
    rows = list(db.scalars(stmt.order_by(column.desc(), Memory.id.desc()).limit(limit + 1)))
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        date = last.published_at if not actor else last.created_at
        next_cursor = base64.urlsafe_b64encode(json.dumps([date.isoformat(), last.id]).encode()).decode().rstrip("=")
    result = {"items": [service.serialize(db, row, actor, summary=not individual) for row in rows[:limit]], "cursor": next_cursor}
    if actor and individual:
        matching_ids = set(db.scalars(select(MemoryMedia.id).join(Memory).where(
            MemoryMedia.memory_id.in_([row.id for row in rows[:limit]]), matching)))
        for item in result["items"]:
            item["media"] = [value for value in item["media"] if value["id"] in matching_ids]
            item["media_count"] = len(item["media"])
    if actor:
        if individual:
            result["status_counts"] = service.review_counts(db)
            result["pending_count"] = result["status_counts"]["pending"]
        else:
            result["pending_count"] = db.scalar(select(func.count()).select_from(Memory).where(Memory.status == "pending"))
    return result


@router.get("/memories")
def memories(limit: int = Query(20, ge=1, le=50), cursor: str | None = Query(None, max_length=512),
             individual: bool = False,
             db: Session = Depends(get_db)):
    return list_page(db, "published", limit, cursor, individual=individual)


@router.get("/memories/{memory_id}")
def detail(memory_id: int, db: Session = Depends(get_db)):
    memory = service.get_memory(db, memory_id)
    if memory.status != "published":
        raise NotFoundError("记忆不存在或已下线")
    return service.serialize(db, memory)


@router.get("/admin/memories")
def admin_memories(status: Literal["pending", "processing", "published", "rejected", "offline", "failed"] = "pending",
                   limit: int = Query(20, ge=1, le=50), cursor: str | None = Query(None, max_length=512),
                   individual: bool = False,
                   db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    return list_page(db, status, limit, cursor, actor, individual)


@router.get("/admin/memories/counts")
def admin_counts(db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    return {"status_counts": service.review_counts(db)}


@router.get("/admin/memories/{memory_id}")
def admin_detail(memory_id: int, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    return service.serialize(db, service.get_memory(db, memory_id), actor)


@router.post("/admin/memories/{memory_id}/review")
def review(memory_id: int, payload: MemoryReviewRequest, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    return service.review(db, memory_id, actor, payload)


@router.get("/admin/memories/{memory_id}/cleanup")
def cleanup_preview(memory_id: int, media_id: int | None = Query(None, gt=0),
                    db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    return service.cleanup_preview(db, memory_id, media_id)


@router.post("/admin/memories/{memory_id}/cleanup")
def cleanup(memory_id: int, payload: MemoryCleanupRequest, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    if not payload.confirmed:
        raise ConflictError("请先确认清理清单")
    return service.cleanup(db, memory_id, actor, payload.expected_revision, media_id=payload.media_id)


@router.get("/memory-media/{media_id}")
@router.head("/memory-media/{media_id}", include_in_schema=False)
def get_media(media_id: int, variant: Literal["display", "thumbnail"] = "display", actor: int = 0,
              expires: int = 0,
              signature: str = Query("", max_length=64), db: Session = Depends(get_db)):
    item = db.get(MemoryMedia, media_id)
    memory = db.get(Memory, item.memory_id) if item else None
    if not item or not memory or item.state != "ready":
        raise NotFoundError()
    public = memory.status == "published" and item.publication_status == "published"
    if not public:
        secret = get_settings().memory_media_signing_key
        message = f"{media_id}:{variant}:{actor}:{expires}"
        expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
        if len(secret) < 32 or not signature or not int(time.time()) <= expires <= int(time.time()) + 3600 or not hmac.compare_digest(signature, expected):
            raise NotFoundError()
        user = db.get(User, actor)
        if not user or user.role != "admin":
            raise NotFoundError()
    key = item.display_key if variant == "display" else item.thumbnail_key
    path = memory_media.private_path(service.storage_root(), key)
    if not path.is_file():
        raise NotFoundError()
    content_type = {".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png"}.get(path.suffix)
    return FileResponse(path, media_type=content_type, headers={"Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"})

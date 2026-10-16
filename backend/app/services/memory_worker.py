"""A separately invoked worker; never started by API imports or the boardgame worker."""

from datetime import timedelta
import logging
import shutil

from sqlalchemy import or_, select

from app.core.config import get_settings
from app.models.memory import Memory, MemoryMedia
from app.services import memory_media as media, memory_service as service
from app.utils.app_time import app_now

logger = logging.getLogger("dragon.reserve")


def process_one(db):
    now = app_now()
    item = db.scalar(select(MemoryMedia).join(Memory).where(Memory.status.in_(service.SUBMITTED_STATUSES),
        MemoryMedia.publication_status == "unreviewed",
        (MemoryMedia.state == "uploaded") | ((MemoryMedia.state == "working") & (MemoryMedia.lease_until < now)))
        .order_by(MemoryMedia.id).limit(1).with_for_update(skip_locked=True))
    if not item:
        db.rollback()
        active = select(MemoryMedia.id).where(MemoryMedia.memory_id == Memory.id,
            MemoryMedia.state.in_(["uploaded", "working"])).exists()
        unfinished_disposal = select(MemoryMedia.id).where(MemoryMedia.memory_id == Memory.id,
            MemoryMedia.state == "ready", MemoryMedia.original_key != "").exists()
        pending = db.scalar(select(Memory.id).where(Memory.status.in_(service.SUBMITTED_STATUSES), ~active,
                            or_(Memory.status == "processing", unfinished_disposal))
                            .order_by(Memory.id).limit(1))
        if pending:
            settle(db, pending)
        return False
    if item.attempts >= 3:
        item.state, item.lease_until = "failed", None
        db.commit()
        settle(db, item.memory_id)
        return True
    item.state, item.lease_until = "working", now + timedelta(minutes=5)
    item.attempts += 1
    db.commit()
    root = service.storage_root()
    source = media.private_path(root, item.original_key)
    output = media.private_path(root, f"{item.memory_id}/{item.id}/processed")
    try:
        if output.exists():
            shutil.rmtree(output)
        if item.kind == "image":
            processed = media.compress_image(source, output)
        else:
            settings = get_settings()
            processed = media.compress_video(source, output, settings.memory_ffmpeg, settings.memory_ffprobe)
        item.display_key = processed.display.relative_to(root).as_posix()
        item.thumbnail_key = processed.thumbnail.relative_to(root).as_posix()
        item.width, item.height, item.duration = processed.width, processed.height, processed.duration
        item.state, item.lease_until = "ready", None
        # Preserve the raw file until processed paths have durably committed.
        db.commit()
        source.unlink(missing_ok=True)
        item.original_key = ""
        actual = processed.total_bytes
        service.release(db, item.reserved_bytes - actual)
        item.reserved_bytes = actual
        db.commit()
    except Exception as exc:
        db.rollback()
        db.refresh(item)
        if item.state != "ready":
            if output.exists():
                shutil.rmtree(output)
            item.state = "uploaded" if item.attempts < 3 else "failed"
            item.lease_until = None
            db.commit()
        logger.warning("memory_processing_failed media_id=%s error_type=%s", item.id, type(exc).__name__)
    settle(db, item.memory_id)
    return True


def settle(db, memory_id):
    memory = service.get_memory(db, memory_id, True)
    if memory.status not in service.SUBMITTED_STATUSES:
        db.rollback()
        return
    items = service.assets(db, memory_id)
    for item in items:
        if item.state == "ready" and item.original_key:
            root = service.storage_root()
            display = media.private_path(root, item.display_key)
            thumbnail = media.private_path(root, item.thumbnail_key)
            if not display.is_file() or not thumbnail.is_file():
                item.state = "failed"
                continue
            # Recover a crash between durable processed paths and raw-file disposal.
            media.private_path(root, item.original_key).unlink(missing_ok=True)
            actual = display.stat().st_size + thumbnail.stat().st_size
            service.release(db, item.reserved_bytes - actual)
            item.reserved_bytes, item.original_key = actual, ""
    if all(item.state in {"ready", "failed", "cleaned"} for item in items):
        service.sync_review_status(memory, items)
        memory.revision += 1
    db.commit()

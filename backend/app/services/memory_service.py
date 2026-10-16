"""Private uploads and revision-checked, per-asset publishing."""

from datetime import datetime, timedelta
import hashlib
import hmac
from pathlib import Path
import shutil
import time
from uuid import uuid4

from sqlalchemy import and_, case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError, ConflictError, NotFoundError, PermissionDeniedError
from app.models import Activity, User
from app.models.memory import Memory, MemoryAuditLog, MemoryCapacity, MemoryMedia
from app.services import memory_media as media
from app.utils.app_time import app_now
from app.utils.media import resolve_media_root

SUBMITTED_STATUSES = ("processing", "pending", "published", "rejected", "offline", "failed")


def member(actor):
    if actor.role not in {"user", "admin"}:
        raise PermissionDeniedError("成员和管理员才可投稿")


def storage_root() -> Path:
    configured = Path(get_settings().memory_storage_root)
    root = (configured if configured.is_absolute() else Path(__file__).resolve().parents[2] / configured).resolve()
    public = resolve_media_root().resolve()
    if root.is_relative_to(public) or public.is_relative_to(root):
        raise AppError("MEMORY_STORAGE_INVALID", "记忆私有存储配置无效", 503)
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_memory(db, memory_id, lock=False):
    stmt = select(Memory).where(Memory.id == memory_id)
    if lock:
        if db.get_bind().dialect.name == "sqlite":
            # SQLite ignores FOR UPDATE; the laptop API still needs upload/delete serialization.
            db.execute(update(Memory).where(Memory.id == memory_id).values(revision=Memory.revision))
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    value = db.scalar(stmt)
    if not value:
        raise NotFoundError("记忆不存在或已不可用")
    return value


def assets(db, memory_id):
    return list(db.scalars(select(MemoryMedia).where(MemoryMedia.memory_id == memory_id,
        MemoryMedia.state != "removed").order_by(MemoryMedia.sort)))


def audit(db, memory, actor_id, action, ids=None):
    db.add(MemoryAuditLog(memory_id=memory.id, actor_id=actor_id, action=action,
                          media_ids=ids or [], revision=memory.revision))


def reserve(db, amount):
    settings = get_settings()
    free = shutil.disk_usage(storage_root()).free
    if settings.memory_capacity_bytes <= 0 or free - amount < settings.memory_min_free_bytes:
        raise AppError("MEMORY_CAPACITY", "存储空间不足，暂时无法接收投稿", 503)
    result = db.execute(update(MemoryCapacity).where(MemoryCapacity.id == 1,
        MemoryCapacity.reserved_bytes + amount <= settings.memory_capacity_bytes,
        MemoryCapacity.reserved_bytes + amount <= free - settings.memory_min_free_bytes)
        .values(reserved_bytes=MemoryCapacity.reserved_bytes + amount))
    if result.rowcount != 1:
        raise AppError("MEMORY_CAPACITY", "记忆容量未配置或已满，请联系管理员", 503)


def release(db, amount):
    result = db.execute(update(MemoryCapacity).where(MemoryCapacity.id == 1,
        MemoryCapacity.reserved_bytes >= amount).values(reserved_bytes=MemoryCapacity.reserved_bytes - amount))
    if result.rowcount != 1:
        raise AppError("MEMORY_CAPACITY_MISMATCH", "容量账本异常，已暂停操作", 503)


def create_draft(db: Session, actor: User, payload):
    member(actor)
    if len(get_settings().memory_media_signing_key) < 32:
        raise AppError("MEMORY_SIGNING_UNCONFIGURED", "记忆预览密钥尚未配置", 503)
    previous = db.scalar(select(Memory).where(Memory.user_id == actor.id,
        Memory.client_submission_id == payload.client_submission_id))
    if previous:
        if previous.status in {"cancelled", "cleaned"}:
            raise ConflictError("本次投稿已取消或清理，请重新创建")
        existing = assets(db, previous.id)
        signature = [(item.kind, item.declared_bytes) for item in existing]
        if payload.media and (signature != [(item.kind, item.size) for item in payload.media] or (
            previous.caption, previous.location_name, previous.activity_id
        ) != (payload.caption, payload.location_name, payload.activity_id)):
            raise ConflictError("本次投稿内容已变化，请重新创建")
        if previous.status == "draft" and previous.expires_at <= app_now():
            raise ConflictError("上传会话已过期，请重新创建")
        return previous
    activity = db.get(Activity, payload.activity_id) if payload.activity_id else None
    if payload.activity_id and not activity:
        raise NotFoundError("关联活动不存在")
    if any(item.kind == "video" for item in payload.media):
        from shutil import which
        if not which(get_settings().memory_ffmpeg) or not which(get_settings().memory_ffprobe):
            raise AppError("MEMORY_PROCESSOR_UNAVAILABLE", "视频处理工具尚未配置", 503)
    reservations = [item.size + (25 * 1024**2 if item.kind == "video" else media.IMAGE_OUTPUT_MAX_BYTES)
                    for item in payload.media]
    reserve(db, sum(reservations))
    memory = Memory(user_id=actor.id, client_submission_id=payload.client_submission_id,
        caption=payload.caption, location_name=payload.location_name, activity_id=payload.activity_id,
        activity_name=(activity.name[:128] if activity else ""), author_nickname=actor.nickname,
        expires_at=app_now() + timedelta(hours=24))
    db.add(memory)
    try:
        db.flush()
        for slot, (item, reserved) in enumerate(zip(payload.media, reservations)):
            db.add(MemoryMedia(memory_id=memory.id, sort=slot, kind=item.kind,
                               declared_bytes=item.size, reserved_bytes=reserved))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("投稿已创建，请重试获取回执") from exc
    return memory


def owned_draft(db, memory_id, actor, lock=False):
    member(actor)
    memory = get_memory(db, memory_id, lock)
    if memory.user_id != actor.id:
        raise NotFoundError()
    if memory.status != "draft" or memory.expires_at <= app_now():
        raise ConflictError("投稿已提交或上传会话已过期")
    return memory


def declare_media(db, memory_id, slot, actor, payload):
    memory = owned_draft(db, memory_id, actor, True)
    item = db.scalar(select(MemoryMedia).where(MemoryMedia.memory_id == memory.id, MemoryMedia.sort == slot))
    if item:
        if item.state == "removed" or (item.kind, item.declared_bytes) != (payload.kind, payload.size):
            raise ConflictError("该上传位置已删除或内容已变化，请重新添加")
    else:
        if len(assets(db, memory.id)) >= 10:
            raise ConflictError("每条记忆最多添加 10 个文件")
        if payload.kind == "video":
            from shutil import which
            if not which(get_settings().memory_ffmpeg) or not which(get_settings().memory_ffprobe):
                raise AppError("MEMORY_PROCESSOR_UNAVAILABLE", "视频处理工具尚未配置", 503)
        amount = payload.size + (25 * 1024**2 if payload.kind == "video" else media.IMAGE_OUTPUT_MAX_BYTES)
        reserve(db, amount)
        item = MemoryMedia(memory_id=memory.id, sort=slot, kind=payload.kind,
                           declared_bytes=payload.size, reserved_bytes=amount)
        db.add(item)
    memory.expires_at = app_now() + timedelta(hours=24)
    db.commit()
    return item


def remove_media(db, memory_id, slot, actor):
    memory = owned_draft(db, memory_id, actor, True)
    item = db.scalar(select(MemoryMedia).where(MemoryMedia.memory_id == memory.id, MemoryMedia.sort == slot))
    # Tombstones prevent a delayed declaration/upload from resurrecting a deleted tile.
    if not item:
        item = MemoryMedia(memory_id=memory.id, sort=slot, kind="image", declared_bytes=0, reserved_bytes=0)
        db.add(item)
    directory = media.private_path(storage_root(), f"{memory.id}/{item.id}") if item.id else None
    if directory and directory.exists():
        shutil.rmtree(directory)
    if item.reserved_bytes:
        release(db, item.reserved_bytes)
    item.reserved_bytes = 0
    item.original_key = item.display_key = item.thumbnail_key = ""
    item.state, item.publication_status = "removed", "excluded"
    memory.expires_at = app_now() + timedelta(hours=24)
    db.commit()
    return {"slot": slot, "state": "removed"}


def upload(db, memory_id, slot, actor, source):
    memory = owned_draft(db, memory_id, actor, True)
    item = db.scalar(select(MemoryMedia).where(MemoryMedia.memory_id == memory.id, MemoryMedia.sort == slot))
    if not item or item.state == "removed":
        raise NotFoundError("上传槽位不存在")
    root = storage_root()
    key = f"{memory.id}/{item.id}/original-{uuid4().hex}.bin"
    path = media.private_path(root, key)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        count = 0
        with path.open("xb") as destination:
            while chunk := source.read(256 * 1024):
                count += len(chunk)
                if count > item.declared_bytes:
                    media.reject("原文件大小与上传声明不符", 413)
                destination.write(chunk)
        media.validate_original(path, item.kind)
        if count != item.declared_bytes:
            media.reject("原文件大小与上传声明不符")
        digest = media.file_digest(path)
        if item.original_key:
            if item.digest != digest:
                raise ConflictError("该位置已上传不同文件")
            path.unlink()
            db.rollback()
            return item
        if item.kind == "image":
            from PIL import Image, UnidentifiedImageError
            try:
                with Image.open(path) as image:
                    if image.format not in {"JPEG", "PNG"} or getattr(image, "n_frames", 1) != 1:
                        media.reject("目前支持静态 JPEG、PNG 图片")
                    if image.width * image.height > media.MAX_IMAGE_PIXELS:
                        media.reject("图片分辨率过大")
                    image.verify()
            except (OSError, UnidentifiedImageError, ValueError) as exc:
                media.reject("图片损坏或格式不支持")
        else:
            media.inspect_video(path, get_settings().memory_ffprobe)
        item.original_key, item.original_bytes, item.digest, item.state = key, count, digest, "uploaded"
        memory.expires_at = app_now() + timedelta(hours=24)
        db.commit()
        return item
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise


def submit(db, memory_id, actor, metadata=None):
    member(actor)
    memory = get_memory(db, memory_id, True)
    if memory.user_id != actor.id:
        raise NotFoundError()
    if memory.status != "draft":
        if memory.status in {"processing", "pending", "published", "rejected", "offline", "failed"}:
            return {"id": memory.id, "status": "received"}
        raise ConflictError("本次投稿已取消")
    if memory.expires_at <= app_now():
        raise ConflictError("上传会话已过期")
    items = assets(db, memory.id)
    if not items or any(item.state != "uploaded" for item in items):
        raise ConflictError("请完成全部文件上传")
    if metadata:
        activity = db.get(Activity, metadata.activity_id) if metadata.activity_id else None
        if metadata.activity_id and not activity:
            raise NotFoundError("关联活动不存在")
        memory.caption, memory.location_name, memory.activity_id = metadata.caption, metadata.location_name, metadata.activity_id
        memory.activity_name = activity.name[:128] if activity else ""
    memory.status = "processing"
    memory.revision += 1
    audit(db, memory, actor.id, "submit")
    db.commit()
    return {"id": memory.id, "status": "received"}


def expire_one_draft(db):
    memory = db.scalar(select(Memory).where(Memory.status == "draft", Memory.expires_at <= app_now())
                       .order_by(Memory.expires_at).limit(1).with_for_update(skip_locked=True)
                       .execution_options(populate_existing=True))
    if not memory:
        db.rollback()
        return False
    memory = get_memory(db, memory.id, True)
    if memory.status != "draft" or memory.expires_at > app_now():
        db.rollback()
        return False
    # Only unsubmitted sessions expire; submitted memories remain administrator-managed.
    cleanup(db, memory.id, None, memory.revision)
    return True


def signed_query(item_id, variant, actor_id, ttl=900):
    secret = get_settings().memory_media_signing_key
    if len(secret) < 32:
        raise AppError("MEMORY_SIGNING_UNCONFIGURED", "记忆预览密钥尚未配置", 503)
    expiry = int(time.time()) + ttl
    message = f"{item_id}:{variant}:{actor_id}:{expiry}"
    signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return f"actor={actor_id}&expires={expiry}&signature={signature}"


def media_url(item, variant, actor=None):
    base = get_settings().public_base_url.rstrip("/")
    path = f"{base}/api/v1/memory-media/{item.id}?variant={variant}"
    return path + "&" + signed_query(item.id, variant, actor.id) if actor else path


def serialize(db, memory, actor=None, summary=False):
    user = db.get(User, memory.user_id)
    activity = db.get(Activity, memory.activity_id) if memory.activity_id else None
    items = assets(db, memory.id)
    if not actor:
        items = [item for item in items if item.publication_status == "published" and item.state == "ready"]
    result = {"id": memory.id, "caption": memory.caption, "location_name": memory.location_name,
        "activity_name": memory.activity_name,
        "activity_start_time": activity.start_time.isoformat() if activity else None,
        "created_at": memory.created_at.isoformat(),
        "published_at": memory.published_at.isoformat() if memory.published_at else None,
        "author": {"nickname": memory.author_nickname, "avatar_url": user.avatar_url if user else ""},
        "media_count": len(items)}
    exposed = items[:1] if summary else items
    result["media"] = [{"id": item.id, "kind": item.kind, "width": item.width, "height": item.height,
        "duration": item.duration, "thumbnail_url": media_url(item, "thumbnail", actor) if item.state == "ready" and item.thumbnail_key else "",
        **({"url": media_url(item, "display", actor)} if item.state == "ready" and item.display_key and not summary else {}),
        **({"state": item.state, "publication_status": item.publication_status,
            "original_bytes": item.original_bytes} if actor else {})} for item in exposed]
    if actor:
        result.update(status=memory.status, revision=memory.revision,
                      author_changed=bool(user and user.nickname != memory.author_nickname),
                      total_original_bytes=sum(item.original_bytes for item in items),
                      total_duration=sum(item.duration for item in items),
                      image_count=sum(item.kind == "image" for item in items),
                      video_count=sum(item.kind == "video" for item in items))
    return result


def review_media_filter(status):
    active = MemoryMedia.state.notin_(["removed", "cleaned"])
    reviewable = Memory.status.in_(SUBMITTED_STATUSES)
    if status == "pending":
        condition = and_(reviewable, MemoryMedia.state == "ready", MemoryMedia.publication_status == "unreviewed")
    elif status == "published":
        condition = and_(Memory.status == "published", MemoryMedia.state == "ready", MemoryMedia.publication_status == "published")
    elif status == "rejected":
        condition = and_(reviewable, MemoryMedia.publication_status == "excluded")
    elif status == "offline":
        condition = and_(reviewable, MemoryMedia.publication_status == "offline")
    elif status == "failed":
        condition = and_(reviewable, MemoryMedia.state == "failed", MemoryMedia.publication_status == "unreviewed")
    elif status == "processing":
        condition = and_(reviewable, MemoryMedia.state.in_(["uploaded", "working"]),
                         MemoryMedia.publication_status == "unreviewed")
    else:
        condition = Memory.status == status
    return and_(active, condition)


def review_counts(db):
    columns = [func.count(case((review_media_filter(status), 1))).label(status)
               for status in SUBMITTED_STATUSES]
    result = db.execute(select(*columns).select_from(MemoryMedia).join(Memory)).mappings().one()
    return {status: int(result[status]) for status in SUBMITTED_STATUSES}


def require_processed_files(item):
    if not item.display_key or not item.thumbnail_key or not all(
        media.private_path(storage_root(), key).is_file() for key in (item.display_key, item.thumbnail_key)
    ):
        raise ConflictError("压缩文件已不可用，请删除后重新投稿")


def sync_review_status(memory, items):
    active = [item for item in items if item.state not in {"removed", "cleaned"}]
    if any(item.publication_status == "published" for item in active):
        memory.status = "published"
        if not memory.published_at:
            memory.published_at = app_now()
    elif any(item.publication_status == "unreviewed" and item.state in {"uploaded", "working"} for item in active):
        memory.status = "processing"
    elif any(item.publication_status == "unreviewed" and item.state == "ready" for item in active):
        memory.status = "pending"
    elif any(item.publication_status == "unreviewed" for item in active):
        memory.status = "failed"
    elif any(item.publication_status == "offline" for item in active):
        memory.status = "offline"
    else:
        memory.status = "rejected" if active else "cleaned"


def review_individual(memory, items, payload):
    selected = set(payload.selected_media_ids)
    chosen = [item for item in items if item.id in selected and item.state not in {"removed", "cleaned"}]
    if len(payload.selected_media_ids) != 1 or len(chosen) != 1 or memory.status not in SUBMITTED_STATUSES:
        raise ConflictError("请选择一份有效的审核内容")
    item = chosen[0]
    if payload.action == "publish":
        if item.state != "ready" or item.publication_status != "unreviewed":
            raise ConflictError("当前素材不能发布，请刷新")
        if not payload.manually_reviewed:
            raise ConflictError("请确认已完成人工审核，包括文字、图片及视频画面和声音")
        item.publication_status = "published"
    elif payload.action == "reject":
        if item.publication_status != "unreviewed" or item.state != "ready":
            raise ConflictError("当前素材不能拒绝，请刷新")
        item.publication_status = "excluded"
    elif payload.action == "offline":
        if item.publication_status != "published":
            raise ConflictError("当前素材未发布")
        item.publication_status = "offline"
    elif payload.action == "retry":
        if item.state != "failed" or item.publication_status != "unreviewed":
            raise ConflictError("只能重新压缩失败的素材，请刷新")
        if not item.original_key or not media.private_path(storage_root(), item.original_key).is_file():
            raise ConflictError("原件已不可用，无法重新压缩，请删除后重新投稿")
        item.state, item.attempts, item.lease_until = "uploaded", 0, None
    elif payload.action == "republish":
        if item.state != "ready" or item.publication_status != "offline":
            raise ConflictError("只能重新上架已下架的素材，请刷新")
        require_processed_files(item)
        item.publication_status = "published"
    elif payload.action == "reopen":
        if item.state != "ready" or item.publication_status != "excluded":
            raise ConflictError("只能将未通过且压缩完成的素材放回待审核")
        require_processed_files(item)
        item.publication_status = "unreviewed"
    sync_review_status(memory, items)


def review(db, memory_id, actor, payload):
    memory = get_memory(db, memory_id, True)
    if memory.revision != payload.expected_revision:
        raise ConflictError("审核内容已变化，请刷新")
    items = assets(db, memory.id)
    selected = set(payload.selected_media_ids)
    if payload.action in {"retry", "republish", "reopen"} and not payload.individual:
        raise ConflictError("请选择单个资源操作")
    if payload.individual:
        if not db.get(User, memory.user_id):
            raise ConflictError("投稿人资料已变化，请重新检查")
        review_individual(memory, items, payload)
    elif payload.action == "publish":
        if memory.status != "pending" or not selected or len(selected) != len(payload.selected_media_ids):
            raise ConflictError("请选择待审核投稿中的有效内容")
        chosen = [item for item in items if item.id in selected]
        user = db.get(User, memory.user_id)
        if len(chosen) != len(selected) or not user:
            raise ConflictError("素材或投稿人资料已变化，请重新检查")
        if not payload.manually_reviewed:
            raise ConflictError("请确认已完成人工审核，包括文字、图片及视频画面和声音")
        for item in chosen:
            if item.state != "ready":
                raise ConflictError("所选素材尚未处理完成，不能发布")
        for item in items:
            item.publication_status = "published" if item.id in selected else "excluded"
        memory.status, memory.published_at = "published", app_now()
    elif payload.action == "reject":
        if memory.status not in {"pending", "failed"}:
            raise ConflictError("当前状态不能拒绝")
        memory.status = "rejected"
        for item in items:
            item.publication_status = "excluded"
    else:
        if memory.status != "published":
            raise ConflictError("当前内容未发布")
        memory.status = "offline"
        for item in items:
            item.publication_status = "offline"
    memory.revision += 1
    audit(db, memory, actor.id, payload.action, list(selected))
    db.commit()
    return {"id": memory.id, "status": memory.status, "revision": memory.revision}


def cleanup_preview(db, memory_id, media_id=None):
    memory = get_memory(db, memory_id)
    if media_id is not None:
        item = next((item for item in assets(db, memory.id) if item.id == media_id), None)
        if not item:
            raise NotFoundError("素材不存在")
        allowed = item.state == "cleaned" or (
            memory.status in SUBMITTED_STATUSES and
            (item.publication_status in {"excluded", "offline"} or item.state == "failed")) or (
            memory.status == "draft" and memory.expires_at <= app_now())
        return {"id": memory.id, "media_id": item.id, "status": memory.status,
                "revision": memory.revision, "allowed": allowed, "bytes": item.reserved_bytes}
    allowed = memory.status in {"rejected", "offline", "failed", "cleaned", "cancelled"} or (
        memory.status == "draft" and memory.expires_at <= app_now())
    return {"id": memory.id, "status": memory.status, "revision": memory.revision, "allowed": allowed,
            "bytes": sum(item.reserved_bytes for item in assets(db, memory.id))}


def cleanup(db, memory_id, actor, revision, cancel=False, media_id=None):
    memory = get_memory(db, memory_id, True)
    if media_id is not None:
        preview = cleanup_preview(db, memory_id, media_id)
        item = next(item for item in assets(db, memory_id) if item.id == media_id)
        if item.state == "cleaned":
            return {"id": memory.id, "media_id": item.id, "status": memory.status, "revision": memory.revision}
        if memory.revision != revision or not preview["allowed"]:
            raise ConflictError("素材已变化或当前不能清理，请刷新后确认")
        directory = media.private_path(storage_root(), f"{memory.id}/{item.id}")
        if directory.exists():
            shutil.rmtree(directory)
        release(db, item.reserved_bytes)
        item.reserved_bytes = 0
        item.original_key = item.display_key = item.thumbnail_key = ""
        item.state, item.publication_status = "cleaned", "excluded"
        remaining = assets(db, memory.id)
        if memory.status != "draft" or all(value.state == "cleaned" for value in remaining):
            sync_review_status(memory, remaining)
        memory.revision += 1
        audit(db, memory, actor.id, "cleanup", [item.id])
        db.commit()
        return {"id": memory.id, "media_id": item.id, "status": memory.status, "revision": memory.revision}
    terminal = "cancelled" if cancel else "cleaned"
    if memory.status == terminal and (not cancel or memory.user_id == actor.id):
        return {"id": memory.id, "status": memory.status, "revision": memory.revision}
    if memory.revision != revision:
        raise ConflictError("内容已变化，请刷新后确认")
    if cancel:
        if memory.user_id != actor.id or memory.status not in {"draft", "cancelled"}:
            raise ConflictError("只能取消本人未提交的草稿")
    elif not cleanup_preview(db, memory.id)["allowed"]:
        raise ConflictError("只能清理不通过、下线、失败或过期的投稿")
    items = assets(db, memory.id)
    root = storage_root()
    # A failed deletion leaves reservations intact. Repeating a confirmed cleanup is safe.
    for item in items:
        directory = media.private_path(root, f"{memory.id}/{item.id}")
        if directory.exists():
            shutil.rmtree(directory)
        release(db, item.reserved_bytes)
        item.reserved_bytes = 0
        item.original_key = item.display_key = item.thumbnail_key = ""
        item.state = "cleaned"
        item.publication_status = "excluded"
    memory.status = "cancelled" if cancel else "cleaned"
    memory.revision += 1
    audit(db, memory, actor.id if actor else None, "cancel" if cancel else "cleanup", [item.id for item in items])
    db.commit()
    return {"id": memory.id, "status": memory.status, "revision": memory.revision}

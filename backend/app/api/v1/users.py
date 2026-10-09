"""User routes."""

from pathlib import Path
from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import ValidationAppError
from app.core.logging import logger
from app.models import User
from app.schemas.user import AvatarUploadResponse, CurrentUserResponse, UpdateCurrentUserRequest, UpdateRoleRequest
from app.services.user_service import clear_user_role, update_current_user, update_user_role_by_invite_code


router = APIRouter(prefix="/users", tags=["users"])
settings = get_settings()
ALLOWED_AVATAR_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
_INVITE_WINDOW_SECONDS = 3600
_INVITE_USER_LIMIT = 5
_INVITE_IP_LIMIT = 20
_invite_attempts: dict[str, deque[float]] = defaultdict(deque)
_invite_attempts_lock = Lock()


def _check_invite_rate_limit(user_id: int, client_ip: str) -> None:
    now = monotonic()
    keys = (f"user:{user_id}", f"ip:{client_ip}")
    limits = (_INVITE_USER_LIMIT, _INVITE_IP_LIMIT)
    with _invite_attempts_lock:
        # Purge expired buckets as well as timestamps to bound process memory.
        for key in list(_invite_attempts):
            attempts = _invite_attempts[key]
            while attempts and now - attempts[0] >= _INVITE_WINDOW_SECONDS:
                attempts.popleft()
            if not attempts:
                del _invite_attempts[key]
        for key, limit in zip(keys, limits):
            attempts = _invite_attempts[key]
            if len(attempts) >= limit:
                raise HTTPException(status_code=429, detail="Too many invite attempts; try again later")
        for key in keys:
            _invite_attempts[key].append(now)


@router.get("/me", response_model=CurrentUserResponse, summary="Get current user")
def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Return the current authenticated user."""

    return CurrentUserResponse.model_validate(current_user, from_attributes=True)


@router.patch("/me", response_model=CurrentUserResponse, summary="Update current user")
def patch_me(
    payload: UpdateCurrentUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    """Update editable fields for the current user."""

    user = update_current_user(db, current_user, payload)
    return CurrentUserResponse.model_validate(user, from_attributes=True)


@router.post("/me/avatar", response_model=AvatarUploadResponse, summary="Upload current user avatar")
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> AvatarUploadResponse:
    """Store an uploaded avatar and return a permanent URL."""

    try:
        if file.content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
            raise ValidationAppError("Avatar must be a JPEG, PNG, WebP, or GIF image")

        content = await file.read()
        if not content:
            raise ValidationAppError("Uploaded avatar is empty")
        if len(content) > MAX_AVATAR_BYTES:
            raise ValidationAppError("Avatar must be 2 MB or smaller")

        avatars_dir = Path(settings.media_root).resolve() / "avatars"
        avatars_dir.mkdir(parents=True, exist_ok=True)

        extension = CONTENT_TYPE_EXTENSIONS[file.content_type]
        filename = f"{uuid4().hex}{extension}"
        file_path = avatars_dir / filename
        file_path.write_bytes(content)

        relative_url = f"{settings.media_url_prefix.rstrip('/')}/avatars/{filename}"
        base_url = settings.public_base_url.rstrip("/") if settings.public_base_url else str(request.base_url).rstrip("/")
        return AvatarUploadResponse(avatar_url=f"{base_url}{relative_url}")
    finally:
        await file.close()


@router.post("/me/role", response_model=CurrentUserResponse, summary="Update current user role")
def post_my_role(
    request: Request,
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    """Update role from invite code."""

    client_ip = request.client.host if request.client else "unknown"
    try:
        _check_invite_rate_limit(current_user.id, client_ip)
        user = update_user_role_by_invite_code(db, current_user, payload.invite_code)
    except (HTTPException, ValidationAppError) as exc:
        outcome = "limited" if isinstance(exc, HTTPException) else "invalid"
        logger.warning("role_invite_request user_id=%s ip=%s outcome=%s", current_user.id, client_ip, outcome)
        raise
    # Keep this as a metadata-only audit record; never log the submitted code.
    logger.info("role_invite_request user_id=%s ip=%s outcome=accepted role=%s", current_user.id, client_ip, user.role)
    return CurrentUserResponse.model_validate(user, from_attributes=True)


@router.delete("/me/role", response_model=CurrentUserResponse, summary="Reset current user role")
def delete_my_role(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    """Reset role to guest."""

    user = clear_user_role(db, current_user)
    return CurrentUserResponse.model_validate(user, from_attributes=True)

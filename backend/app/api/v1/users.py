"""User routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.user import CurrentUserResponse, UpdateCurrentUserRequest, UpdateRoleRequest
from app.services.user_service import clear_user_role, update_current_user, update_user_role_by_invite_code


router = APIRouter(prefix="/users", tags=["users"])


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


@router.post("/me/role", response_model=CurrentUserResponse, summary="Update current user role")
def post_my_role(
    payload: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    """Update role from invite code."""

    user = update_user_role_by_invite_code(db, current_user, payload.invite_code)
    return CurrentUserResponse.model_validate(user, from_attributes=True)


@router.delete("/me/role", response_model=CurrentUserResponse, summary="Reset current user role")
def delete_my_role(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    """Reset role to guest."""

    user = clear_user_role(db, current_user)
    return CurrentUserResponse.model_validate(user, from_attributes=True)

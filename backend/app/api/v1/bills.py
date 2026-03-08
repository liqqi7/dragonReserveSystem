"""Bill routes."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.bill import BillCreateRequest, BillResponse, BillUpdateRequest
from app.services.bill_service import create_bill, delete_bill, get_bill_by_id, list_bills, update_bill


router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("", response_model=list[BillResponse], summary="List bills")
def get_bills(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[BillResponse]:
    """List all bills."""

    bills = list_bills(db)
    return [BillResponse.model_validate(bill) for bill in bills]


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED, summary="Create bill")
def post_bill(
    payload: BillCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BillResponse:
    """Create a bill."""

    bill = create_bill(db, payload)
    return BillResponse.model_validate(bill)


@router.patch("/{bill_id}", response_model=BillResponse, summary="Update bill")
def patch_bill(
    bill_id: int,
    payload: BillUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> BillResponse:
    """Update a bill."""

    bill = get_bill_by_id(db, bill_id)
    updated = update_bill(db, bill, payload)
    return BillResponse.model_validate(updated)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete bill")
def remove_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    """Delete a bill."""

    bill = get_bill_by_id(db, bill_id)
    delete_bill(db, bill)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

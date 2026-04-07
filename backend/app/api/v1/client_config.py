"""Client config routes."""

from fastapi import APIRouter, Depends

from app.api.deps import get_optional_current_user
from app.core.config import get_settings
from app.models import User
from app.schemas.client_config import ClientConfigResponse

router = APIRouter(prefix="/client-config", tags=["client-config"])
settings = get_settings()


@router.get("", response_model=ClientConfigResponse, summary="Get client config")
def get_client_config(_: User | None = Depends(get_optional_current_user)) -> ClientConfigResponse:
    """Return lightweight runtime config used by mini-program cache policy."""

    return ClientConfigResponse(cache_version=str(settings.client_cache_version or "1"))

from __future__ import annotations

"""Client configuration schemas."""

from pydantic import BaseModel


class ClientConfigResponse(BaseModel):
    """Versioned client cache config."""

    cache_version: str

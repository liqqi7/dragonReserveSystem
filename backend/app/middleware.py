"""Application middleware."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import ensure_trace_id, logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach trace id and log basic request metrics."""

    async def dispatch(self, request: Request, call_next):
        trace_id = ensure_trace_id(request)
        request.state.request_started_at = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - request.state.request_started_at) * 1000, 2)
        response.headers["X-Request-Id"] = trace_id
        logger.info(
            "request_completed method=%s path=%s status=%s duration_ms=%s trace_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            trace_id,
        )
        return response

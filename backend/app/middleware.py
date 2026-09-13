"""Application middleware."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import ensure_trace_id, logger


class BoardgameBodyLimitMiddleware:
    """Bound JSON and multipart requests before FastAPI parses or spools them."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get('path', '')
        guarded = path.startswith('/api/v1/boardgame') or path.startswith('/api/v1/activities/') and any(
            suffix in path for suffix in ('/boardgames', '/nominations', '/game-plans'))
        if scope['type'] != 'http' or not guarded or scope.get('method') not in ('POST', 'PUT', 'PATCH'):
            return await self.app(scope, receive, send)
        headers = dict(scope.get('headers', []))
        multipart = headers.get(b'content-type', b'').startswith(b'multipart/form-data')
        limit = 21 * 1024 * 1024 if multipart else 512 * 1024
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > limit:
                from starlette.responses import JSONResponse
                return await JSONResponse({'code': 'VALIDATION_ERROR', 'message': 'Request body too large',
                    'details': {'reason': 'body_too_large'}}, status_code=413)(scope, receive, send)
            if not message.get('more_body', False):
                break
        sent = False
        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()
        await self.app(scope, replay, send)


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

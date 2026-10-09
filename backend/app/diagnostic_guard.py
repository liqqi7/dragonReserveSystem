"""Bound diagnostic telemetry before parsing; never collect IPs or credentials."""
from __future__ import annotations

import time
from collections import deque

from starlette.responses import JSONResponse


class DiagnosticBodyGuard:
    """Apply per-endpoint in-process request limits and a hard body-size cap."""

    WINDOW_SECONDS = 60
    MAX_REQUESTS_PER_WINDOW = 30
    MAX_BODY_BYTES = 128 * 1024

    def __init__(self, app):
        self.app = app
        self.accepted: dict[str, deque[float]] = {
            "authenticated": deque(),
            "anonymous": deque(),
        }

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        path = scope.get('path', '')
        if path.endswith('/diagnostics/anonymous-client-logs/batch'):
            bucket = 'anonymous'
        elif path.endswith('/diagnostics/client-logs') or path.endswith('/diagnostics/client-logs/batch'):
            bucket = 'authenticated'
        else:
            return await self.app(scope, receive, send)

        now = time.monotonic()
        accepted = self.accepted[bucket]
        while accepted and accepted[0] < now - self.WINDOW_SECONDS:
            accepted.popleft()
        if len(accepted) >= self.MAX_REQUESTS_PER_WINDOW:
            return await JSONResponse({'detail': 'Diagnostic rate limit'}, status_code=429)(scope, receive, send)

        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > self.MAX_BODY_BYTES:
                return await JSONResponse({'detail': 'Diagnostic body too large'}, status_code=413)(scope, receive, send)
            if not message.get('more_body', False):
                break

        accepted.append(now)
        sent = False

        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()

        await self.app(scope, replay, send)

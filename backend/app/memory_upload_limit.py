"""Bound multipart request bytes before Starlette spools uploads to disk."""

from fastapi.responses import JSONResponse
from starlette.formparsers import MultiPartException

from app.services.memory_media import VIDEO_MAX_BYTES


class MemoryUploadLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if scope["type"] != "http" or "/memory-drafts/" not in path or "/media/" not in path:
            return await self.app(scope, receive, send)
        limit = VIDEO_MAX_BYTES + 128 * 1024
        headers = dict(scope.get("headers", []))
        response = JSONResponse({"code": "MEMORY_MEDIA_INVALID", "message": "图片和视频每个文件最多 20MB，上传请求不能过大"}, status_code=413)
        try:
            if int(headers.get(b"content-length", b"0")) > limit:
                return await response(scope, receive, send)
        except ValueError:
            return await response(scope, receive, send)
        total = 0
        exceeded = False
        async def bounded_receive():
            nonlocal total, exceeded
            message = await receive()
            total += len(message.get("body", b""))
            if total > limit:
                exceeded = True
                # Starlette closes multipart spool files only for MultiPartException.
                raise MultiPartException("原文件或上传请求过大")
            return message
        async def bounded_send(message):
            # Request.form translates multipart failures to 400; retain the size-limit status.
            if exceeded and message["type"] == "http.response.start" and message["status"] == 400:
                message = {**message, "status": 413}
            await send(message)
        await self.app(scope, bounded_receive, bounded_send)

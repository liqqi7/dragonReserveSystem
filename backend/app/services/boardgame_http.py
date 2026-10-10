"""BGG-only transport configuration; never changes other outbound services."""
import httpx
from app.core.config import get_settings


def request_options(transport=None):
    # Injected transports remain deterministic for worker tests.
    options = {"trust_env": False}
    if transport is not None:
        options["transport"] = transport
    elif proxy := get_settings().bgg_http_proxy.strip():
        options["proxy"] = proxy
    return options


def client(transport=None):
    return httpx.Client(timeout=get_settings().bgg_timeout_seconds,
                        follow_redirects=False, **request_options(transport))

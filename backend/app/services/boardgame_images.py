"""Optional public BGG game photographs, separate from catalog and intake reads."""
from collections import OrderedDict
from threading import Lock
from time import monotonic
from urllib.parse import urlparse
import httpx
from app.core.config import get_settings
from app.services.boardgame_common import fail

_cache = OrderedDict()
_lock = Lock()


def image_url(value):
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    return value if parsed.scheme == 'https' and parsed.hostname == 'cf.geekdo-images.com' else None


def images(bgg_id):
    if not bgg_id:
        return {'items': []}
    if not get_settings().bgg_enabled:
        fail('source_disabled', 503)
    # One bounded optional request at a time. Never occupies the Thing worker lock.
    if not _lock.acquire(timeout=0.1):
        fail('bgg_busy', 503)
    try:
        cached = _cache.get(bgg_id)
        if cached and cached[0] > monotonic():
            _cache.move_to_end(bgg_id)
            return cached[1]
        try:
            response = httpx.get('https://api.geekdo.com/api/images', params={
                'ajax':1, 'gallery':'game', 'nosession':1, 'objectid':bgg_id,
                'objecttype':'thing', 'pageid':1, 'showcount':12, 'size':'medium', 'sort':'hot'},
                timeout=6, follow_redirects=False)
            response.raise_for_status()
            if len(response.content) > 1_000_000:
                raise ValueError('Oversized gallery')
            data = response.json()
            rows = data.get('images')
            if not isinstance(rows, list):
                raise ValueError('Invalid gallery')
            items = []
            for row in rows[:12]:
                if not isinstance(row, dict) or not (url := image_url(row.get('imageurl'))):
                    continue
                items.append({'id':str(row.get('imageid', '')), 'url':url,
                    'full_url':image_url(row.get('imageurl_lg')) or url})
            result = {'items':items}
            _cache[bgg_id] = (monotonic()+3600, result)
            while len(_cache) > 256:
                _cache.popitem(last=False)
            return result
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            if cached:
                return cached[1]
            fail('upstream_unavailable', 503)
    finally:
        _lock.release()

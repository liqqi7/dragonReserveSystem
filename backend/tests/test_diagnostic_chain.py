import asyncio
import json
import logging
from app.image_transfer_diagnostics import ImageTransferDiagnostics


def test_image_asgi_full_body_correlation_for_static_and_glass(caplog):
    async def run(path):
        async def app(scope, receive, send):
            await send({'type':'http.response.start', 'status':200, 'headers':[]})
            await send({'type':'http.response.body', 'body':b'abc', 'more_body':True})
            await send({'type':'http.response.body', 'body':b'de', 'more_body':False})
        async def send(message): pass
        async def receive(): return {'type':'http.disconnect'}
        await ImageTransferDiagnostics(app)({'type':'http', 'path':path, 'headers':[(b'x-request-id',b'hm-integration-2')]}, receive, send)
    with caplog.at_level(logging.INFO):
        asyncio.run(run('/activity-cover-assets/a.jpg'))
        asyncio.run(run('/api/v2/activity-covers/a/glass-image'))
    records = [json.loads(r.message.split('image_transfer ',1)[1]) for r in caplog.records if r.message.startswith('image_transfer ')]
    assert {r['route'] for r in records} == {'static_cover','glass_image'}
    assert all(r['request_id'] == 'hm-integration-2' and r['bytes_sent_to_asgi'] == 5 and r['asgi_body_finished'] for r in records)
    assert all(r['client_receipt'] == 'unobservable' for r in records)


def test_actual_image_routes_echo_and_log_the_same_request_id(client, caplog):
    with caplog.at_level(logging.INFO):
        for index, path in enumerate([
            '/activity-cover-assets/aleksey-rico/images/aleksey-rico-001.jpg',
            '/api/v2/activity-covers/aleksey-rico-001/glass-image?v=2',
        ]):
            request_id = f'hm-route-test-{index}'
            response = client.get(path, headers={'X-Request-Id':request_id})
            assert response.status_code == 200
            assert response.headers['X-Request-Id'] == request_id
            records = [json.loads(r.message.split('image_transfer ', 1)[1]) for r in caplog.records
                       if r.message.startswith('image_transfer ')]
            record = next(r for r in records if r['request_id'] == request_id)
            assert record['bytes_sent_to_asgi'] == len(response.content)
            assert record['asgi_body_finished'] is True

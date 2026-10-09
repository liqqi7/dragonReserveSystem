import asyncio
import json
import logging
from app.image_transfer_diagnostics import ImageTransferDiagnostics
from app.diagnostic_guard import DiagnosticBodyGuard
from app.services.diagnostic_service import sanitize_diagnostic


def test_anonymous_bounded_and_existing_auth_preserved(client):
    event = {'event': 'home_media_attempt', 'payload': {'attempt': 2}}
    response = client.post('/api/v1/diagnostics/anonymous-client-logs/batch', json={'events': [event]})
    assert response.status_code == 200 and response.json()['stored']
    assert client.post('/api/v1/diagnostics/client-logs/batch', json={'events': [event]}).status_code == 401
    assert client.post('/api/v1/diagnostics/anonymous-client-logs/batch', json={'events': [event] * 9}).status_code == 422
    assert client.post('/api/v1/diagnostics/anonymous-client-logs/batch', json={'events': [{'event': 'arbitrary'}]}).status_code == 422
    assert client.post('/api/v1/diagnostics/anonymous-client-logs/batch', content=b'x' * (128 * 1024 + 1)).status_code == 413
    event['payload']['large'] = 'x' * 33000
    assert client.post('/api/v1/diagnostics/anonymous-client-logs/batch', json={'events': [event]}).status_code == 422


def test_anonymous_rate_limit_is_bounded_without_ip_storage():
    async def run():
        calls = []
        async def app(scope, receive, send):
            calls.append(await receive())
        guard = DiagnosticBodyGuard(app)
        async def receive():
            return {'type': 'http.request', 'body': b'{}'}
        output = []
        async def send(message): output.append(message)
        scope = {'type':'http', 'path':'/api/v1/diagnostics/anonymous-client-logs/batch'}
        for _ in range(31): await guard(scope, receive, send)
        assert len(calls) == 30
        assert output[0]['status'] == 429
        assert len(guard.accepted['anonymous']) == 30
    asyncio.run(run())


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


def test_server_redacts_secrets_and_bounds_nested_values():
    result = sanitize_diagnostic({'payload': {'token':'secret','url':'https://test/a?signature=secret', 'profile':{'queueEnd':3}, 'values': list(range(100))}})
    assert 'secret' not in json.dumps(result)
    assert result['payload']['profile']['queueEnd'] == 3
    assert len(result['payload']['values']) == 64


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


def test_authenticated_diagnostic_guard_has_independent_limit_and_body_cap():
    async def run():
        calls = []
        async def app(scope, receive, send):
            calls.append(scope['path'])
            await send({'type': 'http.response.start', 'status': 200, 'headers': []})
            await send({'type': 'http.response.body', 'body': b'ok'})
        guard = DiagnosticBodyGuard(app)
        async def invoke(path, body=b'{}'):
            sent = []
            consumed = False
            async def receive():
                nonlocal consumed
                if consumed:
                    return {'type': 'http.disconnect'}
                consumed = True
                return {'type': 'http.request', 'body': body, 'more_body': False}
            async def send(message):
                sent.append(message)
            await guard({'type': 'http', 'path': path}, receive, send)
            return next((m['status'] for m in sent if m['type'] == 'http.response.start'), None)

        auth_path = '/api/v1/diagnostics/client-logs/batch'
        anon_path = '/api/v1/diagnostics/anonymous-client-logs/batch'
        assert await invoke(auth_path, b'x' * (128 * 1024 + 1)) == 413
        for _ in range(30):
            assert await invoke(auth_path) == 200
        assert await invoke(auth_path) == 429
        assert await invoke(anon_path) == 200
        assert len(calls) == 31
        assert len(guard.accepted['authenticated']) == 30
        assert len(guard.accepted['anonymous']) == 1

    asyncio.run(run())

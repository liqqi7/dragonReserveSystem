"""Actual Page controllers call FastAPI through a local-only test bridge.

No native UI automation, no external servers or actual member/export data.
"""
import json
import os
from uuid import uuid4
import httpx
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from app.core.config import get_settings
from tests.test_boardgame_import import fixture, prepared_history, worker
from app.models.boardgame import Inventory, Play, PlaySource
from sqlalchemy import select


def test_native_page_controller_contracts(client, db_session, user_headers, normal_user, second_user, admin_user, admin_headers, signed_up_activity, monkeypatch, tmp_path):
    settings = get_settings()
    monkeypatch.setattr(settings, 'boardgame_enabled', True)
    monkeypatch.setattr(settings, 'boardgame_import_worker_enabled', True)
    monkeypatch.setattr(settings, 'boardgame_import_root', str(tmp_path/'private'))
    monkeypatch.setattr(settings, 'bgg_enabled', False)
    normal_user.avatar_url = second_user.avatar_url = '/images/default-avatar.svg'
    db_session.commit()
    job, _, _ = prepared_history(client, db_session, user_headers, fixture())
    monkeypatch.setattr(settings, 'bgg_enabled', True)
    monkeypatch.setattr(settings, 'bgg_api_token', 'synthetic-test-token')
    monkeypatch.setattr(settings, 'bgg_min_interval_seconds', 0)
    segment_job = client.post('/api/v1/boardgame-imports', headers={**user_headers, 'Idempotency-Key': str(uuid4())},
        json={'kind':'bgg_plays', 'username':'synthetic-multi'}).json()
    xml = b'<plays total="1"><play id="91" date="2026-01-02" quantity="2" length="70"><item objectid="9991" name="Test"/><players><player name="Synthetic Source Person" score="9"/></players></play></plays>'
    worker(db_session, httpx.MockTransport(lambda request: httpx.Response(200, content=xml)))
    bridge_lock = threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass
        def request(self):
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else None
            headers = dict(admin_headers if self.headers.get('Authorization') == 'Bearer synthetic-admin-bridge' else user_headers)
            if self.headers.get('Idempotency-Key'):
                headers['Idempotency-Key'] = self.headers['Idempotency-Key']
            headers['Content-Type'] = 'application/json'
            with bridge_lock:
                response = client.request(self.command, self.path, content=raw, headers=headers)
                # The test dependency shares one Session across requests. Match
                # production's per-request Session close so a GET cannot retain
                # a MySQL repeatable-read snapshot across the worker's commit.
                db_session.rollback()
            self.send_response(response.status_code)
            self.send_header('Content-Type','application/json')
            self.end_headers()
            self.wfile.write(response.content)
        do_GET = do_POST = do_PATCH = do_PUT = do_DELETE = request
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        script = Path(__file__).resolve().parents[2] / 'miniprogram/tests/integration/boardgameApiFlow.cjs'
        run = subprocess.run(['node', str(script)], input=json.dumps(dict(base=f'http://127.0.0.1:{server.server_port}',
            userId=normal_user.id, secondUserId=second_user.id, activityId=signed_up_activity.id, jobId=job['id'],adminUserId=admin_user.id,segmentJobId=segment_job['id'],layoutDir=os.environ.get('BOARDGAME_LAYOUT_REVIEW_DIR'))),
            capture_output=True, text=True, timeout=90)
        assert run.returncode == 0, run.stdout + run.stderr
        result = json.loads(run.stdout)
        assert result['controllerPages'] == 11 and result['requests'] > 40
        worker(db_session)
        worker(db_session)
        copies = list(db_session.scalars(select(Inventory).where(Inventory.entry_source == 'bgstats')))
        assert len(copies) == 2 and all(b.purchase_price == 0 and b.purchase_currency == 'CNY' for b in copies)
        assert all(b.purchased_on.isoformat() == '2026-01-02' for b in copies)
        sources = list(db_session.scalars(select(PlaySource).where(PlaySource.provider == 'bgg').order_by(PlaySource.segment_index)))
        assert len(sources) == 2
        segments = [db_session.get(Play, source.play_id) for source in sources]
        assert [play.duration_minutes for play in segments] == [20, 50]
        assert all(play.publication_status == 'held' for play in segments)
        assert sources[0].mapping_snapshot['players'][0]['person_id'] == sources[1].mapping_snapshot['players'][0]['person_id']
    finally:
        server.shutdown(); server.server_close(); thread.join(2)

"""Run the actual entry Page controller, HTTP routes, worker and database together."""
import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from sqlalchemy import select
from app.models.boardgame import BoardGame, Inventory
from tests.test_boardgame_intake import feature, bgg_http, worker


def test_entry_controller_to_worker_and_database(client, db_session, user_headers, normal_user, bgg_http):
    bridge_lock = threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def request(self):
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else None
            headers = {**user_headers, 'Content-Type':'application/json'}
            if self.headers.get('Idempotency-Key'):
                headers['Idempotency-Key'] = self.headers['Idempotency-Key']
            with bridge_lock:
                if self.command == 'GET' and '/boardgame-intake-previews/' in self.path:
                    # Run the real leased worker against synthetic BGG XML only.
                    db_session.rollback()
                    worker(db_session, bgg_http)
                response = client.request(self.command, self.path, content=body, headers=headers)
                db_session.rollback()
            self.send_response(response.status_code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(response.content)
        do_GET = do_POST = request

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        script = Path(__file__).resolve().parents[2] / 'miniprogram/tests/integration/boardgameEntryApiFlow.cjs'
        run = subprocess.run(['node', str(script)], input=json.dumps(dict(
            base=f'http://127.0.0.1:{server.server_port}', userId=normal_user.id)),
            capture_output=True, text=True, timeout=60)
        assert run.returncode == 0, run.stdout + run.stderr
        assert json.loads(run.stdout)['requests'] >= 12
        assert len(list(db_session.scalars(select(BoardGame)))) == 2
        copies = list(db_session.scalars(select(Inventory)))
        assert len(copies) == 3
        selected = [box for box in copies if box.bgg_version_snapshot]
        assert len(selected) == 2
        assert all(box.bgg_version_id == 701101 and box.purchase_price == 0 for box in selected)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)

"""Opt-in real BGG integration; synthetic account and public games in an ephemeral database.

Run with the backend venv. BGG credentials are read in process from the existing settings.
BG Stats files and public BGG account history are parsed in memory only, never applied.
No external writes, deployment, project configuration changes, or persistent business DB.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def emit(stage, **values):
    print(json.dumps({'stage':stage, **values}, ensure_ascii=False), flush=True)


def audit_bgstats(path):
    from app.services import boardgame_sources as sources
    raw = path.read_bytes()
    rows = sources.bgstats_items(raw, {'source_namespace':'readonly-live-audit', 'source_timezone':'Asia/Shanghai'})
    plays = [row['payload']['normalized'] for row in rows if row['source_kind'] == 'bgstats_play']
    players = [player for play in plays for player in play['players']]
    assert rows[0]['payload']['raw'] == sources.bounded_json(raw)
    emit('bgstats_readonly', bytes=len(raw), kinds=dict(Counter(row['source_kind'] for row in rows)),
         issues=dict(Counter(issue for row in rows for issue in row['payload']['issues'])),
         plays_with_issues=sum(bool(row['payload']['issues']) for row in rows if row['source_kind'] == 'bgstats_play'),
         player_rows=len(players), anonymous_appearances=sum(player['is_anonymous'] for player in players),
         known_scores=sum(player['score'] is not None for player in players),
         zero_scores=sum(player['score'] is not None and float(player['score']) == 0 for player in players),
         unknown_scores=sum(player['score'] is None for player in players),
         scoresheets=sum(bool(play['scoresheet']) for play in plays),
         expansion_uses=sum(len(play['expansions']) for play in plays),
         source_valid_results=sum(play['source_result_valid'] for play in plays),
         archive_roundtrip=True, database_writes=0)


def audit_bgg_account(username, engine):
    from app.services import boardgame_worker as worker, boardgame_sources as sources
    from app.core.config import get_settings
    for kind, extra in [('bgg_collection', {'subtype':'boardgame'}),
                        ('bgg_collection', {'subtype':'boardgameexpansion'}), ('bgg_plays', {'page':1})]:
        params = {'username':username, 'source_namespace':'readonly-live-audit', **extra}
        deadline = time.monotonic() + 90
        while True:
            with worker.bgg_lock(engine) as acquired:
                assert acquired, 'Unexpected concurrent BGG fetch'
                status, raw, delay = worker.fetch_http(kind, params)
            if status == 200:
                break
            emit('bgg_account_wait', kind=kind, status=status)
            if status not in (202, 429) and status < 500:
                raise RuntimeError('BGG account request rejected')
            pause = max(get_settings().bgg_min_interval_seconds, delay, 5)
            if time.monotonic() + pause > deadline:
                raise RuntimeError('BGG account read timed out')
            time.sleep(pause)
        rows, total = sources.bgg_items(raw, kind, params)
        emit('bgg_account_readonly', kind=kind, **extra, http_status=status, reported_total=total,
             kinds=dict(Counter(row['source_kind'] for row in rows)),
             issues=dict(Counter(issue for row in rows for issue in row['payload']['issues'])), database_writes=0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--query', default='Ark Nova')
    parser.add_argument('--bgstats-export', type=Path)
    parser.add_argument('--bgg-username', help='Read-only public collection and first page of plays')
    args = parser.parse_args()
    # Override before importing ANY app modules. Never consult the configured business DB.
    with tempfile.TemporaryDirectory(prefix='dragon-boardgame-live-') as directory:
        os.environ.update(DATABASE_URL='sqlite:///' + directory + '/live.db',
            MEDIA_ROOT=directory + '/media', BOARDGAME_IMPORT_ROOT=directory + '/private',
            JWT_SECRET_KEY=secrets.token_urlsafe(32), WECHAT_APP_ID='', WECHAT_APP_SECRET='',
            TEST_REQUEST_LOG_FILE='', APP_DEBUG='false')
        logging.disable(logging.CRITICAL)
        sys.path.insert(0, str(ROOT / 'backend'))
        from app.core.config import get_settings
        settings = get_settings()
        origin = urlsplit(settings.bgg_api_base_url)
        if origin.scheme != 'https' or origin.netloc != 'boardgamegeek.com' or origin.path.rstrip('/') != '/xmlapi2':
            raise RuntimeError('Live verification requires the official HTTPS BGG XML API origin')
        if not settings.bgg_api_token:
            raise RuntimeError('BGG token is not configured')
        settings.boardgame_enabled = settings.bgg_enabled = settings.boardgame_import_worker_enabled = True
        settings.bgg_min_interval_seconds = max(5, settings.bgg_min_interval_seconds)
        if args.bgstats_export:
            audit_bgstats(args.bgstats_export)
        import httpx
        import uvicorn
        from sqlalchemy import event, func, select
        from app.main import app
        from app.core.database import Base, engine, SessionLocal
        from app.core.security import get_password_hash
        from app.models import User
        from app.models.boardgame import BoardGame, Inventory, Play
        from app.services import boardgame_sources as sources, boardgame_worker as worker

        @event.listens_for(engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')

        Base.metadata.create_all(engine)
        password = secrets.token_urlsafe(20)
        with SessionLocal() as db:
            user = User(username='live-verification', nickname='Synthetic live tester', role='user',
                        avatar_url='', password_hash=get_password_hash(password))
            db.add(user)
            db.commit()
            user_id = user.id
        stop = threading.Event()
        failures = []

        def work():
            try:
                while not stop.is_set():
                    if not worker.run_once(SessionLocal):
                        stop.wait(0.25)
            except Exception as exc:
                failures.append(type(exc).__name__)

        server = uvicorn.Server(uvicorn.Config(app, log_level='critical', access_log=False, log_config=None))
        sock = socket.socket()
        sock.bind(('127.0.0.1', 0))
        base = 'http://127.0.0.1:' + str(sock.getsockname()[1])
        server_thread = threading.Thread(target=server.run, kwargs={'sockets':[sock]}, daemon=True)
        worker_thread = threading.Thread(target=work, daemon=True)
        child = None
        try:
            server_thread.start()
            deadline = time.monotonic() + 10
            while not server.started and time.monotonic() < deadline:
                time.sleep(0.05)
            assert server.started, 'Temporary HTTP server failed to start'
            worker_thread.start()
            with httpx.Client(base_url=base, timeout=15, trust_env=False) as client:
                response = client.post('/api/v1/auth/login', json={'username':'live-verification', 'password':password})
                assert response.status_code == 200, 'Synthetic account login failed'
                token = response.json()['access_token']
                assert client.get('/api/v1/boardgames').status_code == 401, 'Missing login must be rejected'
            emit('live_server_ready', timestamp=datetime.now(timezone.utc).isoformat(), database='temporary SQLite',
                 bgg_transport='real HTTPS', frontend='actual page controller and request.js')
            child = subprocess.Popen(['node', str(ROOT / 'miniprogram/tests/integration/boardgameEntryLiveFlow.cjs')],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=ROOT)
            child.stdin.write(json.dumps({'base':base, 'token':token, 'userId':user_id, 'query':args.query}))
            child.stdin.close()
            result = None
            for line in child.stdout:
                data = json.loads(line)
                print(json.dumps(data, ensure_ascii=False), flush=True)
                if data.get('stage') == 'live_controller_complete':
                    result = data
            child.wait(timeout=5)
            assert child.returncode == 0 and result, 'Live page flow failed'
            assert not failures, 'Worker failed: ' + ','.join(failures)
            stop.set()
            worker_thread.join(timeout=50)
            assert not worker_thread.is_alive(), 'Worker did not stop'
            with SessionLocal() as db:
                game = db.get(BoardGame, result['game_id'])
                xml = sources.xml_root(game.bgg_raw_xml.encode())
                reconstructed = sources.xml_tree(xml)
                expected = game.bgg_payload['raw']
                # ElementTree drops whitespace AFTER a standalone document root,
                # although tostring preserved that original inter-item tail.
                tail = expected.get('tail')
                if reconstructed['tail'] is None and tail and not tail.strip():
                    assert game.bgg_raw_xml.endswith(tail)
                    reconstructed['tail'] = tail
                assert expected == reconstructed, 'Raw XML/JSON snapshot mismatch'
                assert game.bgg_request_params == {'id':result['bgg_id'], 'stats':1, 'versions':1}
                assert len(xml.findall('versions/item')) == result['total_versions']
                assert db.scalar(select(func.count()).select_from(Inventory)) == 1
                assert db.scalar(select(func.count()).select_from(Play)) == 0
                emit('database_readback', raw_xml_json_equal=True, selected_edition_saved=True,
                     games=db.scalar(select(func.count()).select_from(BoardGame)), inventory=1, plays=0)
            for url in dict.fromkeys(result['cover_urls']):
                parsed = urlsplit(url)
                assert parsed.scheme == 'https' and parsed.netloc in ('cf.geekdo-images.com', 'cf.geekdo.com')
                with httpx.Client(timeout=30, follow_redirects=False) as client:
                    with client.stream('GET', url) as response:
                        content_type = response.headers.get('Content-Type', '')
                        assert response.status_code == 200 and content_type.startswith('image/'), 'Cover request failed'
                        size = sum(len(chunk) for chunk in response.iter_bytes())
                        assert size > 0, 'Cover response is empty'
                        emit('cover_https', host=parsed.hostname, status=response.status_code, content_type=content_type, bytes=size)
            if args.bgg_username:
                audit_bgg_account(args.bgg_username, engine)
            emit('live_verification', state='passed', real_user_history_written=False)
        finally:
            if child is not None and child.poll() is None:
                child.terminate()
                child.wait(timeout=5)
            stop.set()
            if worker_thread.ident is not None:
                worker_thread.join(timeout=50)
            server.should_exit = True
            if server_thread.ident is not None:
                server_thread.join(timeout=10)
            sock.close()
            engine.dispose()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # No traceback/HTTP headers/configuration dumps: only sanitized stage and exception class.
        import traceback
        frames = traceback.extract_tb(error.__traceback__)
        location = frames[-1] if frames else None
        emit('live_verification', state='failed', error=type(error).__name__,
             file=Path(location.filename).name if location else None, line=location.lineno if location else None)
        raise SystemExit(1)

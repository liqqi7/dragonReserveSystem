#!/usr/bin/env python3
"""Run full Alembic upgrades and board game checks in a disposable local MySQL.

Explicit executables, --no-defaults, private Unix socket, no TCP or production config.
"""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.parse import urlencode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mysqld', type=Path, required=True)
    parser.add_argument('--mysql', type=Path, required=True)
    args = parser.parse_args()
    backend = Path(__file__).resolve().parents[1]
    for executable in (args.mysqld, args.mysql):
        if not executable.is_absolute() or not executable.is_file():
            parser.error('Executable paths must be absolute existing files')
    with tempfile.TemporaryDirectory(prefix='dragon-bg-migration-', dir='/tmp') as directory:
        root = Path(directory)
        data, socket, log = root / 'data', root / 'mysql.sock', root / 'mysql.log'
        subprocess.run([str(args.mysqld), '--no-defaults', '--initialize-insecure', f'--datadir={data}',
                        f'--log-error={log}'], check=True, capture_output=True, timeout=60)
        server = subprocess.Popen([str(args.mysqld), '--no-defaults', f'--datadir={data}', f'--socket={socket}',
            f'--pid-file={root / "mysql.pid"}', f'--log-error={log}', '--skip-networking', '--mysqlx=OFF', '--skip-log-bin'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        client = [str(args.mysql), '--no-defaults', '--protocol=SOCKET', f'--socket={socket}', '--user=root', '--batch']
        try:
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                if server.poll() is not None:
                    raise RuntimeError('Disposable MySQL exited during startup')
                if subprocess.run(client, input='SELECT 1;', text=True, capture_output=True, timeout=2).returncode == 0:
                    break
                time.sleep(0.1)
            else:
                raise RuntimeError('Disposable MySQL startup timed out')
            subprocess.run(client, input='CREATE DATABASE boardgame_migration CHARACTER SET utf8mb4;',
                           text=True, capture_output=True, check=True, timeout=10)
            url = 'mysql+pymysql://root@localhost/boardgame_migration?' + urlencode({'unix_socket': str(socket), 'charset': 'utf8mb4'})
            env = os.environ.copy()
            env.update(DATABASE_URL=url, MEDIA_ROOT=str(root / 'media'), BOARDGAME_IMPORT_ROOT=str(root / 'private'),
                BGG_API_TOKEN='', WECHAT_APP_ID='', WECHAT_APP_SECRET='', JWT_SECRET_KEY='synthetic-local-test-key',
                USER_INVITE_CODE='dragon', ADMIN_INVITE_CODE='manage', BOARDGAME_TEST_DATABASE_URL=url)
            python = str(backend / '.venv/bin/python')
            subprocess.run([python, '-m', 'alembic', 'upgrade', '20260810_0012'], cwd=backend, env=env, check=True, timeout=60)
            subprocess.run(client, input="USE boardgame_migration; INSERT INTO users(username,nickname,avatar_url,role) VALUES('fixture','测试成员','','user');",
                           text=True, capture_output=True, check=True, timeout=10)
            subprocess.run([python, '-m', 'alembic', 'upgrade', 'head'], cwd=backend, env=env, check=True, timeout=60)
            verification = subprocess.run(client, input='USE boardgame_migration; SELECT user_id,display_name FROM boardgame_people; SELECT version_num FROM alembic_version;',
                                          text=True, capture_output=True, check=True, timeout=10)
            assert '测试成员' in verification.stdout and '20260913_0015' in verification.stdout
            print('PASS: full Alembic upgrade from base, existing member backfill', flush=True)
            subprocess.run([python, '-m', 'alembic', 'downgrade', '20260810_0012'], cwd=backend, env=env, check=True, timeout=60)
            subprocess.run([python, '-m', 'alembic', 'upgrade', 'head'], cwd=backend, env=env, check=True, timeout=60)
            print('PASS: empty-feature downgrade and re-upgrade', flush=True)
            seed_edition = """
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models import User
from app.schemas.boardgame import GameCreate, InventoryCreate
from app.services.boardgame_catalog import create_game, create_inventory
with Session(engine) as db:
    actor = db.query(User).filter_by(username='fixture').one()
    game = create_game(db, actor, GameCreate(name='Synthetic migration guard'))
    box = create_inventory(db, actor, InventoryCreate(game_id=game.id, owner_user_id=actor.id))[0]
    box.bgg_version_id = 123
    box.bgg_version_snapshot = {'bgg_version_id':123, 'name':'Synthetic edition'}
    db.commit()
"""
            subprocess.run([python, '-c', seed_edition], cwd=backend, env=env, check=True, timeout=15)
            blocked = subprocess.run([python, '-m', 'alembic', 'downgrade', '20260913_0014'],
                                     cwd=backend, env=env, capture_output=True, text=True, timeout=30)
            assert blocked.returncode != 0 and 'Selected editions exist' in blocked.stderr
            retained = subprocess.run(client, input='USE boardgame_migration; SELECT version_num FROM alembic_version; SELECT bgg_version_snapshot FROM boardgame_inventory;',
                                      text=True, capture_output=True, check=True, timeout=10)
            assert '20260913_0015' in retained.stdout and 'Synthetic edition' in retained.stdout
            print('PASS: populated edition rollback is blocked and preserves data', flush=True)
            subprocess.run([python, '-m', 'pytest', '-q', 'tests/test_boardgame_api.py', 'tests/test_boardgame_import.py',
                'tests/test_boardgame_collection.py', 'tests/test_boardgame_calculation.py',
                'tests/test_boardgame_detail_stats.py',
                'tests/test_boardgame_frontend_contract.py',
                'tests/test_boardgame_intake.py', 'tests/test_boardgame_intake_frontend.py',
                'tests/test_boardgame_sync.py', 'tests/test_boardgame_management.py',
                '--disable-warnings', '--tb=short', '--show-capture=no'], cwd=backend, env=env, check=True, timeout=180)
            print('PASS: HTTP board game and source-worker tests on disposable MySQL', flush=True)
        finally:
            server.terminate()
            try:
                server.wait(timeout=15)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
    print('Disposable MySQL stopped and removed; production was not connected.')


if __name__ == '__main__':
    main()

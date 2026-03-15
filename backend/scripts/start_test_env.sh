#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.test}"
VENV_PYTHON="${VENV_PYTHON:-$ROOT_DIR/.venv/bin/python}"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-8001}"
APP_RELOAD="${APP_RELOAD:-1}"

dotenv_get() {
  python3 - "$1" "$ENV_FILE" <<'PY'
from pathlib import Path
import sys

key = sys.argv[1]
env_file = Path(sys.argv[2])

if not env_file.exists():
    sys.exit(0)

value = ""
for raw_line in env_file.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    current_key, current_value = line.split("=", 1)
    if current_key.strip() == key:
        value = current_value.strip()
print(value)
PY
}

port_is_open() {
  python3 - "$1" "$2" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

sock = socket.socket()
sock.settimeout(0.5)
try:
    sock.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local max_attempts="${3:-20}"
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if port_is_open "$host" "$port"; then
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done

  return 1
}

cleanup() {
  if [ -n "${APP_PID:-}" ] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill "$APP_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "${TUNNEL_PID:-}" ] && kill -0 "$TUNNEL_PID" >/dev/null 2>&1; then
    echo "Stopping SSH tunnel (pid=$TUNNEL_PID)"
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  fi
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Missing Python runtime: $VENV_PYTHON" >&2
  exit 1
fi

MYSQL_HOST="${MYSQL_HOST:-$(dotenv_get MYSQL_HOST)}"
MYSQL_PORT="${MYSQL_PORT:-$(dotenv_get MYSQL_PORT)}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3307}"

SSH_TEST_DB_HOST="${SSH_TEST_DB_HOST:-$(dotenv_get SSH_TEST_DB_HOST)}"
SSH_TEST_DB_USER="${SSH_TEST_DB_USER:-$(dotenv_get SSH_TEST_DB_USER)}"
SSH_TEST_DB_REMOTE_HOST="${SSH_TEST_DB_REMOTE_HOST:-$(dotenv_get SSH_TEST_DB_REMOTE_HOST)}"
SSH_TEST_DB_REMOTE_PORT="${SSH_TEST_DB_REMOTE_PORT:-$(dotenv_get SSH_TEST_DB_REMOTE_PORT)}"
SSH_TEST_DB_LOCAL_HOST="${SSH_TEST_DB_LOCAL_HOST:-$(dotenv_get SSH_TEST_DB_LOCAL_HOST)}"
SSH_TEST_DB_LOCAL_PORT="${SSH_TEST_DB_LOCAL_PORT:-$(dotenv_get SSH_TEST_DB_LOCAL_PORT)}"
SSH_TEST_DB_IDENTITY_FILE="${SSH_TEST_DB_IDENTITY_FILE:-$(dotenv_get SSH_TEST_DB_IDENTITY_FILE)}"

SSH_TEST_DB_HOST="${SSH_TEST_DB_HOST:-124.156.228.148}"
SSH_TEST_DB_USER="${SSH_TEST_DB_USER:-ubuntu}"
SSH_TEST_DB_REMOTE_HOST="${SSH_TEST_DB_REMOTE_HOST:-127.0.0.1}"
SSH_TEST_DB_REMOTE_PORT="${SSH_TEST_DB_REMOTE_PORT:-3306}"
SSH_TEST_DB_LOCAL_HOST="${SSH_TEST_DB_LOCAL_HOST:-$MYSQL_HOST}"
SSH_TEST_DB_LOCAL_PORT="${SSH_TEST_DB_LOCAL_PORT:-$MYSQL_PORT}"

if port_is_open "$SSH_TEST_DB_LOCAL_HOST" "$SSH_TEST_DB_LOCAL_PORT"; then
  echo "Reusing existing DB tunnel on ${SSH_TEST_DB_LOCAL_HOST}:${SSH_TEST_DB_LOCAL_PORT}"
else
  echo "Starting SSH tunnel: ${SSH_TEST_DB_LOCAL_HOST}:${SSH_TEST_DB_LOCAL_PORT} -> ${SSH_TEST_DB_REMOTE_HOST}:${SSH_TEST_DB_REMOTE_PORT} via ${SSH_TEST_DB_USER}@${SSH_TEST_DB_HOST}"
  SSH_ARGS=(
    -o ExitOnForwardFailure=yes
    -o ServerAliveInterval=30
    -o ServerAliveCountMax=3
    -N
    -L "${SSH_TEST_DB_LOCAL_HOST}:${SSH_TEST_DB_LOCAL_PORT}:${SSH_TEST_DB_REMOTE_HOST}:${SSH_TEST_DB_REMOTE_PORT}"
  )

  if [ -n "$SSH_TEST_DB_IDENTITY_FILE" ]; then
    SSH_ARGS+=(-i "$SSH_TEST_DB_IDENTITY_FILE")
  fi

  ssh "${SSH_ARGS[@]}" "${SSH_TEST_DB_USER}@${SSH_TEST_DB_HOST}" &
  TUNNEL_PID=$!
  trap cleanup EXIT INT TERM

  if ! wait_for_port "$SSH_TEST_DB_LOCAL_HOST" "$SSH_TEST_DB_LOCAL_PORT"; then
    echo "SSH tunnel did not become ready on ${SSH_TEST_DB_LOCAL_HOST}:${SSH_TEST_DB_LOCAL_PORT}" >&2
    exit 1
  fi
fi

echo "Starting backend on http://${APP_HOST}:${APP_PORT} using ${ENV_FILE}"
cd "$ROOT_DIR"
UVICORN_ARGS=(
  -m uvicorn
  app.main:app
  --host "$APP_HOST"
  --port "$APP_PORT"
  --env-file "$ENV_FILE"
)

if [ "$APP_RELOAD" = "1" ]; then
  UVICORN_ARGS+=(--reload)
fi

"$VENV_PYTHON" "${UVICORN_ARGS[@]}" &
APP_PID=$!
wait "$APP_PID"

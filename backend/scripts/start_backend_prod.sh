#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
VENV_PYTHON="${VENV_PYTHON:-$ROOT_DIR/.venv/bin/python}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-8000}"
APP_RELOAD="${APP_RELOAD:-0}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Missing Python runtime: $VENV_PYTHON" >&2
  exit 1
fi

echo "Starting backend (prod-like) on http://${APP_HOST}:${APP_PORT} using ${ENV_FILE}"
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

"$VENV_PYTHON" "${UVICORN_ARGS[@]}"


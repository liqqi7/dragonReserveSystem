#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PYTHON="${VENV_PYTHON:-$ROOT_DIR/.venv/bin/python}"
ARGS=(--env-file "${ENV_FILE:-$ROOT_DIR/.env.test}"
      --app-host "${APP_HOST:-127.0.0.1}" --app-port "${APP_PORT:-8001}")
if [ -n "${MINI_PROGRAM_HOST:-}" ]; then ARGS+=(--mini-program-host "$MINI_PROGRAM_HOST"); fi
if [ "${APP_RELOAD:-0}" = 1 ]; then ARGS+=(--reload); fi
exec "$VENV_PYTHON" "$ROOT_DIR/scripts/test_environment.py" "${ARGS[@]}" "$@"

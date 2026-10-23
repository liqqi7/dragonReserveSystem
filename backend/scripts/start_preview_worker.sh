#!/usr/bin/env bash
# 启动 BGG 预览 worker（处理录入预览任务）——幂等：已在跑则跳过
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
LOG="storage-private/test/preview-worker.manual.log"
mkdir -p storage-private/test
if pgrep -f "run_boardgame_preview_worker.py" >/dev/null 2>&1; then
  echo "preview worker 已在运行（跳过）"
  exit 0
fi
nohup .venv/bin/python -B scripts/run_boardgame_preview_worker.py >> "$LOG" 2>&1 &
echo "preview worker 已启动 (PID $!)，日志 $LOG"

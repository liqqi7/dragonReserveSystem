#!/usr/bin/env bash
# 重启预览 worker：杀掉旧进程，由 launchd KeepAlive 自动拉起（或手动补拉）
set -euo pipefail
pkill -f "run_boardgame_preview_worker.py" 2>/dev/null && echo "旧 worker 已停止" || echo "无运行中的 worker"
sleep 12
if pgrep -f "run_boardgame_preview_worker.py" >/dev/null 2>&1; then
  echo "worker 已由 launchd 重启 (PID $(pgrep -f 'run_boardgame_preview_worker.py' | head -1))"
else
  echo "launchd 未拉起，手动启动..."
  bash "$(dirname "${BASH_SOURCE[0]}")/start_preview_worker.sh"
fi

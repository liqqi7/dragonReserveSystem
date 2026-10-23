#!/usr/bin/env bash
# DragonReserve 后端服务一键管理（macOS / Uvicorn / 默认 127.0.0.1:8002）
# 用法: bash devctl.sh {start|stop|restart|status|logs [行数]}
# 兼容 macOS 自带 bash 3.2：不使用数组追加，统一 C 语言环境避免本地化字节问题
set -euo pipefail
export LC_ALL=C LANG=C
PROJECT_DIR="${DRAGONRESERVE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PORT="${DRAGONRESERVE_PORT:-8002}"
HOST="${DRAGONRESERVE_HOST:-127.0.0.1}"
APP_MODULE="${DRAGONRESERVE_APP:-app.main:app}"
ENV_FILE="${DRAGONRESERVE_ENV_FILE:-.env.test}"
RELOAD="${DRAGONRESERVE_RELOAD:-1}"
PYTHON="$PROJECT_DIR/.venv/bin/python"
LOG_DIR="$PROJECT_DIR/storage-private/dev"
LOG_FILE="$LOG_DIR/api.devctl.log"
TRACE_FILE="$PROJECT_DIR/storage-private/devctl-trace.log"
PID_DIR="$PROJECT_DIR/run"
PID_FILE="$PID_DIR/backend-$PORT.pid"
mkdir -p "$LOG_DIR" "$PID_DIR"

log() {
  printf '[devctl] %s\n' "$*"
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" >> "$TRACE_FILE" 2>/dev/null || true
}
port_pids() { lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true; }
port_in_use() { [ -n "$(port_pids)" ]; }

start() {
  log "start: 检查端口 $PORT"
  if port_in_use; then log "端口 $PORT 已在监听，服务已在运行（幂等跳过）。"; status; return 0; fi
  log "start: 检查解释器 $PYTHON"
  if [ ! -x "$PYTHON" ]; then log "未找到虚拟环境解释器 $PYTHON"; exit 1; fi
  set -- -B -m uvicorn "$APP_MODULE" --host "$HOST" --port "$PORT"
  if [ -f "$PROJECT_DIR/$ENV_FILE" ]; then set -- "$@" --env-file "$ENV_FILE"; fi
  if [ "$RELOAD" = "1" ]; then set -- "$@" --reload; fi
  log "start: 拉起 uvicorn $APP_MODULE @ $HOST:$PORT（env=$ENV_FILE reload=$RELOAD）"
  cd "$PROJECT_DIR"
  nohup "$PYTHON" "$@" >>"$LOG_FILE" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"
  log "start: 已发起进程 PID $(cat "$PID_FILE")，等待端口监听"
  local i
  for i in $(seq 1 30); do
    if port_in_use; then log "已启动 (PID $(cat "$PID_FILE"))，http://$HOST:$PORT"; return 0; fi
    if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      log "进程已退出，最近 20 行日志："; tail -n 20 "$LOG_FILE" || true; exit 1
    fi
    sleep 0.5
  done
  log "15 秒内端口未监听，最近日志："; tail -n 20 "$LOG_FILE" || true; exit 1
}

stop() {
  log "stop: 查找端口 $PORT 上的进程"
  local pids; pids="$(port_pids)"
  if [ -f "$PID_FILE" ]; then pids="$pids $(cat "$PID_FILE" 2>/dev/null || true)"; fi
  pids="$(echo $pids | tr ' ' '\n' | sort -u | tr '\n' ' ')"
  log "stop: 目标进程 [$pids]"
  if [ -n "${pids// /}" ]; then
    kill $pids 2>/dev/null || true
    local i
    for i in $(seq 1 10); do port_in_use || break; sleep 0.5; done
    if port_in_use; then kill -9 $(port_pids) 2>/dev/null || true; fi
    rm -f "$PID_FILE"; log "已停止（PID: $pids）"
  else
    log "服务未在运行。"
  fi
}

status() {
  if port_in_use; then
    log "运行中：$HOST:$PORT，PID $(port_pids | tr '\n' ' ')"
  else
    log "未运行（端口 $PORT 空闲）。"
  fi
}

log "=== 调用: $0 $* ==="
case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop || true; start ;;
  status) status ;;
  logs) tail -n "${2:-100}" "$LOG_FILE" ;;
  *) echo "用法: $0 {start|stop|restart|status|logs [行数]}"; exit 2 ;;
esac

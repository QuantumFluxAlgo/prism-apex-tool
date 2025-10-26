#!/usr/bin/env bash
set -euo pipefail

# Boot the dashboard Vite dev server on the canonical port (5173) and point it
# at a local API endpoint (default http://localhost:8000).

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

WEB_PORT="${WEB_PORT:-5173}"
API_URL="${API_URL:-http://localhost:8000}"
HOST_ADDR="${HOST_ADDR:-0.0.0.0}"
PID_FILE="${PID_FILE:-/tmp/dev_web.pid}"
LOG_FILE="${LOG_FILE:-/tmp/dev_web.log}"

log() { printf '\033[1;32m[dev-web]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[dev-web]\033[0m %s\n' "$*" >&2; }

command -v pnpm >/dev/null 2>&1 || { err "pnpm is required (corepack enable pnpm)"; exit 10; }

# If an old instance is still around, stop it first so we can reuse the port cleanly.
if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
    log "Existing dashboard dev process detected (pid=$old_pid). Stopping..."
    kill "$old_pid" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

log "Starting dashboard dev server on http://${HOST_ADDR}:${WEB_PORT} (API=${API_URL})..."
(
  cd apps/dashboard
  # Use nohup so callers can detach immediately; logs land in $LOG_FILE.
  nohup env \
    VITE_API_BASE="$API_URL" \
    HOST="$HOST_ADDR" \
    PORT="$WEB_PORT" \
    BROWSER=none \
    pnpm run dev -- --host "$HOST_ADDR" --port "$WEB_PORT" \
      >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
)

sleep 2
if [[ -s "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
  log "Dashboard dev server started (pid=$(cat "$PID_FILE")). Logs: tail -f $LOG_FILE"
else
  err "Dashboard failed to start. Inspect $LOG_FILE."
  exit 1
fi

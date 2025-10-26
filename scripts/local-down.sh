#!/usr/bin/env bash
set -euo pipefail

API_CONT="${API_CONT:-apex-api-dev}"
WEB_CONT="${WEB_CONT:-apex-web-dev-8000}"
WEB_PID_FILE="${WEB_PID_FILE:-/tmp/dev_web.pid}"

log() { printf '\033[1;35m[local-down]\033[0m %s\n' "$*"; }

log "===== LOCAL-DOWN ====="
log "-> Stopping dashboard container (if any)..."
docker rm -f "$WEB_CONT" >/dev/null 2>&1 || true

log "-> Stopping API container (if any)..."
docker rm -f "$API_CONT" >/dev/null 2>&1 || true

log "-> Killing native dev_api.sh (if running)..."
pkill -f "bash ./dev_api.sh" >/dev/null 2>&1 || true

log "-> Killing dashboard dev server (pnpm) if running..."
if [[ -f "$WEB_PID_FILE" ]]; then
  if kill -0 "$(cat "$WEB_PID_FILE")" >/dev/null 2>&1; then
    kill "$(cat "$WEB_PID_FILE")" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$WEB_PID_FILE"
fi
pkill -f "pnpm run dev -- --host" >/dev/null 2>&1 || true

log "[ok] Local dev stack stopped."

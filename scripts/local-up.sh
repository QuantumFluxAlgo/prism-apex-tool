#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
API_CONT="${API_CONT:-apex-api-dev}"
WEB_CONT="${WEB_CONT:-apex-web-dev-8000}"

log() { printf '\033[1;34m[local-up]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[local-up]\033[0m %s\n' "$*" >&2; }

log "===== LOCAL-UP (mock stack) ====="
log "API_PORT=$API_PORT  WEB_PORT=$WEB_PORT"

# --- API --------------------------------------------------------------------
if [[ -x ./dev_api.sh ]]; then
  log "-> Using ./dev_api.sh (native). Expect Fastify listening on :$API_PORT"
  nohup bash ./dev_api.sh >/tmp/dev_api.log 2>&1 &
  sleep 2
else
  if [[ -x scripts/dev-api-mock.sh ]]; then
    log "-> Using scripts/dev-api-mock.sh (Dockerized mock API)"
    API_PORT="$API_PORT" NAME="$API_CONT" bash scripts/dev-api-mock.sh >/tmp/dev_api.log 2>&1 &
    sleep 2
  else
    err "[x] No API script found (dev_api.sh or scripts/dev-api-mock.sh)"
    exit 2
  fi
fi

log "-> Waiting for API health on :$API_PORT (up to 60s)..."
API_OK=0
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${API_PORT}/health" >/dev/null 2>&1 || \
     curl -fsS "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then
    API_OK=1
    break
  fi
  sleep 1
done

if [[ "$API_OK" -eq 1 ]]; then
  log "[ok] API up"
else
  err "[!] API did not confirm health (check /tmp/dev_api.log)"
fi

# --- Dashboard --------------------------------------------------------------
if [[ -x scripts/dev-web-8000.sh ]]; then
  log "-> Starting dashboard dev server on :$WEB_PORT (VITE_API_BASE -> http://localhost:$API_PORT)"
  WEB_PORT="$WEB_PORT" API_URL="http://localhost:${API_PORT}" bash scripts/dev-web-8000.sh >/tmp/dev_web.log 2>&1 || true
else
  err "[x] Missing scripts/dev-web-8000.sh"
  exit 3
fi

log "-> Waiting for Dashboard on :$WEB_PORT (up to 40s)..."
WEB_OK=0
for _ in $(seq 1 40); do
  if curl -fsS "http://localhost:${WEB_PORT}" >/dev/null 2>&1; then
    WEB_OK=1
    break
  fi
  sleep 1
done

if [[ "$WEB_OK" -eq 1 ]]; then
  log "[ok] Dashboard up"
else
  err "[!] Dashboard not responding (check /tmp/dev_web.log)"
fi

log ""
log "===== LOCAL-UP OUTCOME ====="
log "api_url:       http://localhost:${API_PORT}"
log "dashboard_url: http://localhost:${WEB_PORT}"
if [[ "$API_OK" -eq 1 ]]; then
  API_STATE="up"
else
  API_STATE="unknown"
fi
if [[ "$WEB_OK" -eq 1 ]]; then
  WEB_STATE="up"
else
  WEB_STATE="down"
fi
log "api_health:    $API_STATE"
log "web_health:    $WEB_STATE"
log ""
log "logs:"
log "  tail -n 120 /tmp/dev_api.log"
log "  tail -n 120 /tmp/dev_web.log"
log ""
log "cleanup:"
log "  bash scripts/local-down.sh"

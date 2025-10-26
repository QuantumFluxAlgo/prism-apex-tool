#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

echo "===== RETRY SEED (no jq) ====="
echo "API_URL=$API_URL"

echo

probe_post() {
  local label="$1"
  local json="$2"
  echo "→ $label"
  echo "payload:"
  echo "$json" | head -c 400
  echo
  set +e
  local resp
  resp="$(curl -fsS -X POST "$API_URL/tickets/debug-replay" -H "Content-Type: application/json" -d "$json")"
  local code=$?
  set -e
  echo "http_code: $code"
  if [ $code -eq 0 ]; then
    echo "response:"
    echo "$resp" | head -c 400
    echo
  else
    echo "[x] request failed"
  fi
}

probe_get() {
  local path="$1"
  local label="$2"
  echo
  echo "→ $label ($path)"
  set +e
  local resp
  resp="$(curl -fsS "$API_URL$path")"
  local code=$?
  set -e
  echo "http_code: $code"
  if [ $code -eq 0 ]; then
    echo "$resp" | head -c 400
    echo
  else
    echo "[x] request failed"
  fi
  return $code
}

probe_get "/health" "API /health" || probe_get "/api/health" "API /api/health" || true

BARS_JSON=$(cat <<'JSON'
[
  {"t":"2025-10-01T14:30:00Z","o":4800.00,"h":4801.00,"l":4799.50,"c":4800.75,"v":1000},
  {"t":"2025-10-01T14:31:00Z","o":4800.75,"h":4802.25,"l":4800.25,"c":4801.50,"v":950},
  {"t":"2025-10-01T14:32:00Z","o":4801.50,"h":4802.75,"l":4800.75,"c":4802.25,"v":875},
  {"t":"2025-10-01T14:33:00Z","o":4802.25,"h":4803.00,"l":4801.00,"c":4802.75,"v":900}
]
JSON
)

payload_A=$(cat <<JSON
{ "symbol":"ESZ5","strategy":"APX-DDB-01","persist":true,"writeStore":true,"bars":$BARS_JSON }
JSON
)

payload_B=$(cat <<JSON
{ "symbol":"ESZ5","strategy":"APX-DDB-01","persist":true,"store":"mock","bars":$BARS_JSON }
JSON
)

payload_C=$(cat <<JSON
{ "symbol":"ESZ5","strategy":"APX-DDB-01","save":true,"persistTickets":true,"bars":$BARS_JSON }
JSON
)

payload_D=$(cat <<JSON
{ "symbol":"ESZ5","strategy":"VWAP-FT","persist":true,"writeStore":true,"bars":$BARS_JSON }
JSON
)

run_attempt() {
  local name="$1"
  local payload="$2"
  echo
  echo "===== ATTEMPT: $name ====="
  probe_post "$name" "$payload" || true
  probe_get "/tickets" "GET /tickets" || true
  echo "CSV head:"
  set +e
  curl -fsS "$API_URL/export/tickets.csv" | head -n 10 || echo "[!] CSV not available yet"
  set -e
}

run_attempt "persist=true, writeStore=true" "$payload_A"
run_attempt "persist to mock store" "$payload_B"
run_attempt "save=true, persistTickets=true" "$payload_C"
run_attempt "VWAP-FT strategy" "$payload_D"

echo
echo "===== OUTCOME REPORT ====="
echo "api_url: $API_URL"
echo "tickets_tip: inspect the GET output above for any rows"
echo "csv_tip: head output above will show headers if export succeeds"

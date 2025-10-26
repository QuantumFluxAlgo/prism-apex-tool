#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
WEB_URL="${WEB_URL:-http://localhost:5173}"

echo "===== LOCAL SMOKE ====="
echo "API_URL=$API_URL"
echo "WEB_URL=$WEB_URL"
echo

# 1) API health
echo "-> API /health"
set +e
API_HEALTH="$(curl -fsS "$API_URL/health" || curl -fsS "$API_URL/api/health")"
API_CODE=$?
set -e
if [ $API_CODE -eq 0 ]; then
  echo "[ok] API health OK: $API_HEALTH"
else
  echo "[x] API health failed"
fi

# 2) /tickets (mock mode should respond even if empty)
echo
echo "-> API /tickets (first 400 bytes)"
set +e
TICKETS="$(curl -fsS "$API_URL/tickets" | head -c 400)"
TICKETS_CODE=$?
set -e
if [ $TICKETS_CODE -eq 0 ]; then
  printf "[ok] /tickets OK: %s\n" "$TICKETS"
else
  echo "[x] /tickets failed"
fi

# 3) /export/tickets.csv (mock mode emits CSV headers)
echo
echo "-> API /export/tickets.csv (first 5 lines)"
set +e
CSV="$(curl -fsS "$API_URL/export/tickets.csv" | head -n 5)"
CSV_CODE=$?
set -e
if [ $CSV_CODE -eq 0 ]; then
  printf "[ok] CSV OK:\n%s\n" "$CSV"
else
  echo "[!] CSV not available (may be empty in fresh mock mode)"
fi

# 4) Dashboard root
echo
echo "-> WEB / (root HTML check)"
set +e
WEB_ROOT="$(curl -fsS "$WEB_URL" | head -n 1)"
WEB_CODE=$?
set -e
if [ $WEB_CODE -eq 0 ]; then
  echo "[ok] Dashboard responded: $(echo "$WEB_ROOT" | sed 's/[[:cntrl:]]//g')"
else
  echo "[x] Dashboard not responding"
fi

echo
echo "===== OUTCOME REPORT ====="
echo "api_health: $([ $API_CODE -eq 0 ] && echo up || echo down)"
echo "tickets_ok: $([ $TICKETS_CODE -eq 0 ] && echo yes || echo no)"
echo "csv_ok:     $([ $CSV_CODE -eq 0 ] && echo yes || echo no)"
echo "web_ok:     $([ $WEB_CODE -eq 0 ] && echo yes || echo no)"

echo
echo "next:"
echo " - If any [x] above: send this output; I will dig in."
echo " - If all [ok]: we can run clean-room tests or a DB-mode smoke next."

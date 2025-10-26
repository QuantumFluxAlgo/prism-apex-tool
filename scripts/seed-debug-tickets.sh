#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

echo "===== SEED TICKETS (mock mode) ====="
echo "API_URL=$API_URL"
command -v curl >/dev/null || { echo "[x] curl missing"; exit 1; }

# 1) quick health
echo "-> Health probe"
set +e
curl -fsS "$API_URL/health" >/dev/null 2>&1 || curl -fsS "$API_URL/api/health" >/dev/null 2>&1
HEALTH=$?
set -e
if [ $HEALTH -eq 0 ]; then
  echo "[ok] API is up"
else
  echo "[!] API did not confirm; proceeding anyway"
fi

# 2) seed a few bars through the debug-replay endpoint (APX-DDB-01)
payload='{
  "symbol": "ESZ5",
  "strategy": "APX-DDB-01",
  "bars": [
    {"t":"2025-10-01T14:30:00Z","o":4800.00,"h":4801.00,"l":4799.50,"c":4800.75,"v":1000},
    {"t":"2025-10-01T14:31:00Z","o":4800.75,"h":4802.25,"l":4800.25,"c":4801.50,"v":950},
    {"t":"2025-10-01T14:32:00Z","o":4801.50,"h":4802.75,"l":4800.75,"c":4802.25,"v":875},
    {"t":"2025-10-01T14:33:00Z","o":4802.25,"h":4803.00,"l":4801.00,"c":4802.75,"v":900}
  ]
}'

echo
echo "-> POST /tickets/debug-replay (seed)"
set +e
SEED_RESP="$(curl -fsS -X POST "$API_URL/tickets/debug-replay" -H "Content-Type: application/json" -d "$payload")"
SEED_CODE=$?
set -e
if [ $SEED_CODE -eq 0 ]; then
  echo "[ok] Seeded tickets (truncated):"
  echo "$SEED_RESP" | head -c 400; echo
else
  echo "[x] Seeding failed (debug-replay POST)."
fi

# 3) confirm tickets exist
echo
echo "-> GET /tickets (first 400 bytes)"
set +e
TICKETS="$(curl -fsS "$API_URL/tickets" | head -c 400)"
TICKETS_CODE=$?
set -e
if [ $TICKETS_CODE -eq 0 ]; then
  printf "[ok] tickets ok:\n%s\n" "$TICKETS"
else
  echo "[x] /tickets failed"
fi

# 4) check CSV export
echo
echo "-> GET /export/tickets.csv (first 10 lines)"
set +e
CSV="$(curl -fsS "$API_URL/export/tickets.csv" | head -n 10)"
CSV_CODE=$?
set -e
if [ $CSV_CODE -eq 0 ]; then
  echo "[ok] CSV ok:"
  echo "$CSV"
else
  echo "[!] CSV still not available (may need more tickets or endpoint path differs)"
fi

echo
echo "===== OUTCOME REPORT ====="
echo "api_url: $API_URL"
echo "seed_post: $([ $SEED_CODE -eq 0 ] && echo ok || echo failed)"
echo "tickets_ok: $([ $TICKETS_CODE -eq 0 ] && echo yes || echo no)"
echo "csv_ok: $([ $CSV_CODE -eq 0 ] && echo yes || echo no)"

echo
echo "next:"
echo " - If csv_ok=no: paste output here; we can try a second seed batch or confirm export route mapping."

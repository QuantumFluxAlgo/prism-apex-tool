#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root
cd "$(dirname "$0")"

API_ORIGIN="${API_ORIGIN:-http://localhost:8000}"

payload='{
  "alerts": [
    { "symbol": "ES", "side": "BUY",  "price": 5432.25, "human": "BUY ES @ 5432.25 (OR breakout)" },
    { "symbol": "NQ", "side": "SELL", "price": 18987.5, "human": "SELL NQ @ 18987.5 (VWAP first touch)" }
  ],
  "tickets": [
    {
      "ticket": { "symbol": "ES", "side": "BUY", "qty": 2, "entry": 5432.25, "stop": 5426.75, "targets": [5436.25, 5442.25] },
      "reasons": []
    }
  ],
  "risk": { "ddAmount": 3000, "maxContracts": 4, "bufferAchieved": false, "todayProfit": 125.5, "periodProfit": 980.0 }
}'

echo "[seed] POST $API_ORIGIN/compat/dev/seed"
echo "$payload" | curl -sS -X POST "$API_ORIGIN/compat/dev/seed" \
  -H 'content-type: application/json' \
  --data-binary @- | jq .
echo "[seed] Done. Visit http://localhost:3000 to see data."

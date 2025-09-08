#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

curl_auth() {
  if [[ -n "${BEARER_TOKEN-}" ]]; then
    curl -sS -H "Authorization: Bearer ${BEARER_TOKEN}" "$@"
  else
    curl -sS "$@"
  fi
}

say() { printf "\n== %s ==\n" "$*"; }

say "Probing API"
curl_auth -o /dev/null -w "health:%{http_code}\n"       "$BASE/health"
curl_auth -o /dev/null -w "openapi:%{http_code}\n"      "$BASE/openapi.json"
curl_auth -o /dev/null -w "ready:%{http_code}\n"        "$BASE/ready"

# macOS-friendly dates (BSD date)
NOW_ISO="$(date -u +%FT%TZ)"
YEST_ISO="$(date -u -v-1d +%FT%TZ)"
TODAY="$(date -u +%F)"
YEST="$(date -u -v-1d +%F)"

post_ticket() {
  local symbol="$1" side="$2" entry="$3" stop="$4" target="$5" qty="$6" when_iso="$7" reason="${8:-seed}"
  local id="seed-$(date +%s%N)-$RANDOM"
  printf "POST /tickets/promote  %-4s %-4s  when=%s  id=%s\n" "$symbol" "$side" "$when_iso" "$id"
  curl_auth -H "Content-Type: application/json" \
    -X POST "$BASE/tickets/promote" \
    --data @- >/dev/null <<JSON
{
  "suggestion": {
    "id": "$id",
    "symbol": "$symbol",
    "side": "$side",
    "qty": $qty,
    "entry": $entry,
    "stop": $stop,
    "targets": [$target],
    "reasons": ["$reason"]
  },
  "when": "$when_iso",
  "reasons": ["$reason"]
}
JSON
}

upsert_account() {
  local acct="$1" maxc="$2" cleared="$3" notes="$4"
  printf "PUT /accounts/%s  max=%s cleared=%s\n" "$acct" "$maxc" "$cleared"
  curl_auth -H "Content-Type: application/json" \
    -X PUT "$BASE/accounts/$acct" \
    --data @- >/dev/null <<JSON
{ "maxContracts": $maxc, "bufferCleared": $cleared, "notes": "$notes" }
JSON
}

say "Upserting demo accounts"
upsert_account "ACC-DEMO-1" 3 true  "demo account 1"
upsert_account "ACC-DEMO-2" 5 false "demo account 2"

say "Seeding tickets (today)"
post_ticket ES BUY  5450.25 5439.75 5461.00 2 "$NOW_ISO" "seed: ES breakout"
post_ticket NQ SELL 19980.00 20020.00 19920.00 1 "$NOW_ISO" "seed: NQ pullback"
post_ticket CL BUY     72.40    71.90    73.20  3 "$NOW_ISO" "seed: CL swing"
post_ticket GC SELL   2540.0   2546.0   2531.0  1 "$NOW_ISO" "seed: GC fade"

say "Seeding tickets (yesterday)"
post_ticket ES SELL  5420.00 5430.00 5405.00 1 "$YEST_ISO" "seed: ES yday"
post_ticket NQ BUY  19800.00 19740.00 19910.00 2 "$YEST_ISO" "seed: NQ yday"
post_ticket CL SELL    71.60    72.10    70.80  2 "$YEST_ISO" "seed: CL yday"
post_ticket GC BUY    2525.0   2518.0   2536.0  1 "$YEST_ISO" "seed: GC yday"

say "Verify /tickets for today"
if command -v jq >/dev/null 2>&1; then
  curl_auth "$BASE/tickets?date=$TODAY" | jq '.tickets | length'
else
  curl_auth "$BASE/tickets?date=$TODAY" | wc -c
fi

say "Verify /tickets for yesterday"
if command -v jq >/dev/null 2>&1; then
  curl_auth "$BASE/tickets?date=$YEST" | jq '.tickets | length'
else
  curl_auth "$BASE/tickets?date=$YEST" | wc -c
fi

say "Done"

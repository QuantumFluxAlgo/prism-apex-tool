#!/usr/bin/env bash
# Prism-Apex: Verify stack health and data freshness (no writes)
set -euo pipefail
cid() { docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
DB_ID="$(cid '(^|-)db(-| |$)')"  || true
API_ID="$(cid '(^|-)api(-| |$)')" || true
[ -z "$DB_ID" ] && { echo "❌ DB not running"; exit 1; }
[ -z "$API_ID" ] && { echo "❌ API not running"; exit 1; }
echo "== VERIFY STACK =="
echo "-- API health --"; curl -sS http://localhost:5190/api/health | head -c 200; echo
echo "-- Bars ceilings (top 10) --"
docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -F \$'\t' -A -c \
\"with mx as (select symbol, max(ts_utc) max_ts from public.bars_1m group by 1)
  select symbol, max_ts from mx order by max_ts desc nulls last limit 10;\""
echo "-- Tickets ceilings --"
docker exec "$DB_ID" psql -U apex -d prismapex -t -A -c \
"select max(opened_at_utc), max(created_at_utc) from public.tickets;"
echo "== DONE =="

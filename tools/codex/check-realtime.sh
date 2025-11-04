#!/usr/bin/env bash
set -euo pipefail
cid(){ docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
DB_ID="$(cid '(^|-)db(-| |$)')" || true
API_ID="$(cid '(^|-)api(-| |$)')" || true
[ -z "${DB_ID:-}" ] && { echo "❌ DB not running"; exit 1; }
[ -z "${API_ID:-}" ] && { echo "❌ API not running"; exit 1; }

TODAY="$(date -u +%Y-%m-%d)"

echo "== Health =="; curl -sS http://localhost:5190/api/health | head -c 200; echo
echo "== bars ceilings today (key symbols) =="
for s in ES=F NQ=F CL=F EURUSD=X; do
  printf "%-9s: " "$s"
  docker exec "$DB_ID" psql -U apex -d prismapex -t -A -c \
    "select coalesce(max(ts_utc)::text,'NULL') from public.bars_1m where symbol='$s' and ts_utc::date='${TODAY}';"
done

echo "== tickets created today by strategy =="
docker exec "$DB_ID" psql -U apex -d prismapex -F $'\t' -A -c \
"select strategy, count(*) from public.tickets where created_at_utc::date='${TODAY}' group by 1 order by 2 desc;"

echo "== last 10 tickets =="
docker exec "$DB_ID" psql -U apex -d prismapex -F $'\t' -A -c \
"select symbol, strategy, status, opened_at_utc, created_at_utc from public.tickets order by created_at_utc desc limit 10;"

echo "== lag probe (last 90m) =="
tools/codex/lag-probe.sh || true

echo "== API sample =="
curl -sS "http://localhost:5190/api/tickets?limit=5" | head -c 800; echo

#!/usr/bin/env bash
set -euo pipefail
cid(){ docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
DB_ID="$(cid '(^|-)db(-| |$)')" || true
[ -z "${DB_ID:-}" ] && { echo "no DB"; exit 1; }
echo "== Bars->Tickets lag (last 90m) =="
docker exec "$DB_ID" psql -U apex -d prismapex -F $'\t' -A -c "
with bars as (
  select symbol, max(ts_utc) as max_bar
  from public.bars_1m
  where ts_utc >= now() - interval '90 minutes'
  group by 1
), tix as (
  select symbol, max(created_at_utc) as max_created
  from public.tickets
  where created_at_utc >= now() - interval '90 minutes'
  group by 1
)
select coalesce(b.symbol,t.symbol) as symbol, b.max_bar, t.max_created,
       (extract(epoch from (t.max_created - b.max_bar))::int) as seconds_lag_when_both
from bars b
full outer join tix t on b.symbol=t.symbol
order by 1;
"

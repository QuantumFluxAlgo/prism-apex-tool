#!/usr/bin/env bash
set -euo pipefail
: "${PG_URL:?set PG_URL}"

SYM="${1:-ES=F}"
DAYS="${2:-14}"
OUT="${3:-tickets_from_bars_${SYM}_${DAYS}d.jsonl}"

psql "$PG_URL" -At -c "
with r as (
  select symbol, date, min(ts) as first_ts, max(ts) as last_ts
  from prism.bars_1m
  where symbol = '${SYM}'
    and date >= current_date - interval '${DAYS} days'
  group by 1,2
),
first as (
  select b.symbol, b.date, 'buy'::text as side, 1::int as qty, b.close as price, b.ts as ts
  from prism.bars_1m b
  join r on b.symbol=r.symbol and b.date=r.date and b.ts=r.first_ts
),
last as (
  select b.symbol, b.date, 'sell'::text as side, 1::int as qty, b.close as price, b.ts as ts
  from prism.bars_1m b
  join r on b.symbol=r.symbol and b.date=r.date and b.ts=r.last_ts
),
u as (
  select date, 'default'::text as strategy, symbol, side, qty, price,
         to_char(ts at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as ts
  from first
  union all
  select date, 'default', symbol, side, qty, price,
         to_char(ts at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as ts
  from last
)
select row_to_json(u)::text from u order by date, ts;
" > "$OUT"

echo "wrote $(wc -l < "$OUT") tickets to $OUT"

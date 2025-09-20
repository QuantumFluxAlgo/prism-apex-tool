#!/usr/bin/env bash
set -euo pipefail
: "${PG_URL:?set PG_URL}"

JSONL="$1"
TSV="${JSONL%.jsonl}.tsv"

jq -r '[.symbol, .ts, .open, .high, .low, .close, (.volume // 0)] | @tsv' "$JSONL" > "$TSV"

psql "$PG_URL" -v ON_ERROR_STOP=1 <<SQL
create schema if not exists prism;

create table if not exists prism.bars_1m (
  symbol  text        not null,
  ts      timestamptz not null,
  open    numeric     not null,
  high    numeric     not null,
  low     numeric     not null,
  close   numeric     not null,
  volume  bigint,
  date    date        not null,
  constraint pk_bars_1m primary key (symbol, ts)
);

create table if not exists prism.bars_1m_stage (
  symbol text, ts timestamptz, open numeric, high numeric, low numeric, close numeric, volume bigint
);

truncate prism.bars_1m_stage;
\copy prism.bars_1m_stage (symbol,ts,open,high,low,close,volume) FROM '$TSV' WITH (FORMAT csv, DELIMITER E'\t', NULL 'null');

insert into prism.bars_1m (symbol,ts,open,high,low,close,volume,date)
select s.symbol, s.ts, s.open, s.high, s.low, s.close, s.volume, (s.ts::date)
from prism.bars_1m_stage s
on conflict (symbol, ts) do nothing;

truncate prism.bars_1m_stage;
SQL

rm -f "$TSV"
echo "loaded $(wc -l < "$JSONL") bars from $JSONL"

#!/usr/bin/env bash
set -euo pipefail
: "${PG_URL:?PG_URL required}"
D="${D:-$(date -I)}"
S="${S:-APX-DDB-01}"
F="tickets_${D}_${S}.jsonl"
psql "$PG_URL" -v ON_ERROR_STOP=1 <<'PSQL'
CREATE SCHEMA IF NOT EXISTS prism;
CREATE TABLE IF NOT EXISTS prism.tickets_raw(
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  strategy TEXT NOT NULL,
  payload JSONB NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT now()
);
PSQL
[ -f "$F" ] || { echo "missing $F"; exit 1; }
jq -r --arg d "$D" --arg s "$S" '[ $d, $s, . ] | @tsv' < "$F" \
| psql "$PG_URL" -v ON_ERROR_STOP=1 -c "\copy prism.tickets_raw(date,strategy,payload) from STDIN with (format text, delimiter E'\''\t'\'', null '')"

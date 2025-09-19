#!/usr/bin/env bash
set -euo pipefail
D="${D:-}"; S="${S:-}"; PG_URL="${PG_URL:-}"; IN="${1:-}"

if [ -z "$IN" ]; then
  [ -n "$D" ] && [ -n "$S" ] || { echo "D and S required or pass input file"; exit 1; }
  IN="tickets_${D}_${S}.jsonl"
fi

[ -n "$PG_URL" ] || { echo "PG_URL not set; skipping load"; exit 0; }
[ -s "$IN" ] || { echo "missing or empty $IN"; exit 1; }
command -v psql >/dev/null || { echo "psql required"; exit 1; }
command -v jq   >/dev/null || { echo "jq required"; exit 1; }

psql "$PG_URL" -v ON_ERROR_STOP=1 -f db/db_init.sql
psql "$PG_URL" -v ON_ERROR_STOP=1 -f db/db_dedup.sql

TMP="$(mktemp)"
# TSV: date \t strategy \t payload-json
jq -r --arg d "${D:-}" --arg s "${S:-}" '
  if (($d|length)>0) and (($s|length)>0) then
    [ $d, $s, tostring ] | @tsv
  else
    [ (.date // ""), (.strategy // ""), tostring ] | @tsv
  end
' "$IN" > "$TMP"

psql "$PG_URL" -v ON_ERROR_STOP=1 -c "\copy prism.tickets_raw_stage (date, strategy, payload) FROM '$TMP' WITH (FORMAT text, DELIMITER E'\t')"

psql "$PG_URL" -v ON_ERROR_STOP=1 -c "
  insert into prism.tickets_raw(date,strategy,payload)
  select date,strategy,payload from prism.tickets_raw_stage
  on conflict do nothing;
  truncate prism.tickets_raw_stage;
"

rm -f "$TMP"
echo "loaded $(wc -l < "$IN" | tr -d " ") rows (dedup applied)"

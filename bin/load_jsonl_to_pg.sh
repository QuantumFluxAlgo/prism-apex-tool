#!/usr/bin/env bash
# Loads tickets_${D}_${S}.jsonl into prism.tickets_raw using PG_URL.
# Exits successfully without loading if PG_URL is unset/empty.
set -euo pipefail

: "${D:?}"
: "${S:?}"
: "${PG_URL:=}"

INPUT="tickets_${D}_${S}.jsonl"

if [ -z "$PG_URL" ]; then
  echo "PG_URL not set; skipping load"
  exit 0
fi

command -v psql >/dev/null 2>&1 || { echo "psql is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }
[ -s "$INPUT" ] || { echo "missing or empty $INPUT"; exit 1; }

psql "$PG_URL" -v ON_ERROR_STOP=1 -f "db/db_init.sql"

TMP="$(mktemp)"
jq -r --arg d "$D" --arg s "$S" '[ $d, $s, tostring ] | @tsv' "$INPUT" > "$TMP"

psql "$PG_URL" -v ON_ERROR_STOP=1 -c "\copy prism.tickets_raw (date, strategy, payload) FROM '$TMP' WITH (FORMAT text, DELIMITER E'\t')"

rm -f "$TMP"
echo "loaded $(wc -l < "$INPUT" | tr -d ' ') rows to prism.tickets_raw"

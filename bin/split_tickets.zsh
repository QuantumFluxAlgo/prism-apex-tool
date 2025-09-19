#!/usr/bin/env zsh
# Assumptions:
# - Input JSONL: tickets_${D}_${S}.jsonl, one JSON object per line with at least: symbol, instrumentType (string or null).
# - Futures classification: instrumentType == "futures" (case-insensitive) OR symbol contains a month code [FGHJKMNQUVXZ] followed by two-digit year (e.g., ESZ25).
# - CSV columns: date,strategy,symbol,side,qty,price,payload. payload is compact JSON string.
set -euo pipefail

: ${D:?}
: ${S:?}

INPUT="tickets_${D}_${S}.jsonl"
FUT_JSONL="tickets_${D}_${S}.fut.jsonl"
EQ_JSONL="tickets_${D}_${S}.eq.jsonl"
FUT_CSV="tickets_${D}_${S}.fut.csv"
EQ_CSV="tickets_${D}_${S}.eq.csv"

[ -s "$INPUT" ] || { echo "missing or empty $INPUT"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }

jq -c 'select((.instrumentType // "" | ascii_downcase) == "futures" or ((.symbol // "") | test("[FGHJKMNQUVXZ][0-9]{2}"; "i")) )' "$INPUT" > "$FUT_JSONL" || true
jq -c 'select(((.instrumentType // "" | ascii_downcase) != "futures") and (((.symbol // "") | test("[FGHJKMNQUVXZ][0-9]{2}"; "i")) | not))' "$INPUT" > "$EQ_JSONL" || true

print -r -- "date,strategy,symbol,side,qty,price,payload" > "$FUT_CSV"
if [ -s "$FUT_JSONL" ]; then
  jq -r --arg d "$D" --arg s "$S" '[ $d, $s, (.symbol // ""), (.side // ""), ((.qty // 0)|tostring), ((.price // 0)|tostring), (tostring) ] | @csv' "$FUT_JSONL" >> "$FUT_CSV"
fi

print -r -- "date,strategy,symbol,side,qty,price,payload" > "$EQ_CSV"
if [ -s "$EQ_JSONL" ]; then
  jq -r --arg d "$D" --arg s "$S" '[ $d, $s, (.symbol // ""), (.side // ""), ((.qty // 0)|tostring), ((.price // 0)|tostring), (tostring) ] | @csv' "$EQ_JSONL" >> "$EQ_CSV"
fi

#!/usr/bin/env zsh
# Validations:
# - Input exists and has ≥1 line.
# - futures+equities JSONL line counts sum to input line count.
# - CSVs have header; when JSONL non-empty, CSV has header + ≥1 data row and data row count equals JSONL count.
set -euo pipefail

: ${D:?}
: ${S:?}

INPUT="tickets_${D}_${S}.jsonl"
FUT_JSONL="tickets_${D}_${S}.fut.jsonl"
EQ_JSONL="tickets_${D}_${S}.eq.jsonl"
FUT_CSV="tickets_${D}_${S}.fut.csv"
EQ_CSV="tickets_${D}_${S}.eq.csv"

[ -s "$INPUT" ] || { echo "input missing or empty"; exit 1; }

in_lines=$(wc -l < "$INPUT" | tr -d ' ')
fut_lines=0; [ -f "$FUT_JSONL" ] && fut_lines=$(wc -l < "$FUT_JSONL" | tr -d ' ')
eq_lines=0; [ -f "$EQ_JSONL" ] && eq_lines=$(wc -l < "$EQ_JSONL" | tr -d ' ')
if [ $((fut_lines + eq_lines)) -ne $in_lines ]; then
  echo "split line mismatch: fut($fut_lines) + eq($eq_lines) != input($in_lines)"
  exit 1
fi

header="date,strategy,symbol,side,qty,price,payload"

check_csv() {
  local jsonl="$1" csv="$2" name="$3"
  if [ -s "$jsonl" ]; then
    [ -f "$csv" ] || { echo "$name CSV missing"; exit 1; }
    [ "$(head -n1 "$csv")" = "$header" ] || { echo "$name CSV header mismatch"; exit 1; }
    rows=$(($(wc -l < "$csv" | tr -d ' ') - 1))
    jlines=$(wc -l < "$jsonl" | tr -d ' ')
    [ "$rows" -ge 1 ] || { echo "$name CSV has no data rows"; exit 1; }
    [ "$rows" -eq "$jlines" ] || { echo "$name CSV/JSONL row count mismatch"; exit 1; }
  else
    if [ -f "$csv" ]; then
      [ "$(head -n1 "$csv")" = "$header" ] || { echo "$name CSV header mismatch"; exit 1; }
    fi
  fi
}

check_csv "$FUT_JSONL" "$FUT_CSV" "futures"
check_csv "$EQ_JSONL" "$EQ_CSV" "equities"

echo "validation OK"

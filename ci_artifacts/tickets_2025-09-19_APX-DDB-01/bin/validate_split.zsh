#!/usr/bin/env zsh
set -euo pipefail
D="${D:?}"
S="${S:?}"
BASE="tickets_${D}_${S}"
ALL="${BASE}.jsonl"
FUT="${BASE}.fut.jsonl"
EQ="${BASE}.eq.jsonl"
CSV_FUT="${BASE}.fut.csv"
CSV_EQ="${BASE}.eq.csv"
assert() { test "$1" -eq "$2" || { echo "FAIL $3 $1 != $2"; exit 1; } }
test -f "$ALL"
test -f "$FUT"
test -f "$EQ"
test -f "$CSV_FUT"
test -f "$CSV_EQ"
ALL_N=$(wc -l < "$ALL")
FUT_N=$(wc -l < "$FUT")
EQ_N=$(wc -l < "$EQ")
assert $ALL_N $((FUT_N+EQ_N)) "split_counts"
CSV_FUT_N=$(( $(wc -l < "$CSV_FUT") - 1 ))
CSV_EQ_N=$(( $(wc -l < "$CSV_EQ") - 1 ))
assert $CSV_FUT_N $FUT_N "csv_fut_vs_jsonl"
assert $CSV_EQ_N $EQ_N "csv_eq_vs_jsonl"
NONF_IN_FUT=$(jq -r 'select(.symbol|test("=F$")|not)|.urn' "$FUT" | wc -l)
assert $NONF_IN_FUT 0 "fut_symbol_gate"
F_IN_EQ=$(jq -r 'select(.symbol|test("=F$"))|.urn' "$EQ" | wc -l)
assert $F_IN_EQ 0 "eq_symbol_gate"
DUP_URNS=$(jq -r '.urn' "$ALL" | sort | uniq -d | wc -l)
assert $DUP_URNS 0 "duplicate_urns"
echo "PASS jsonl_all=$ALL_N jsonl_fut=$FUT_N jsonl_eq=$EQ_N csv_fut=$CSV_FUT_N csv_eq=$CSV_EQ_N"

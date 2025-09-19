#!/usr/bin/env zsh
set -euo pipefail
D="${D:?}"
S="${S:?}"
OUT="tickets_${D}_${S}.jsonl"
CSVOUT="${OUT%.jsonl}.csv"
OUT_FUT="${OUT%.jsonl}.fut.jsonl"
CSVOUT_FUT="${OUT%.jsonl}.fut.csv"
OUT_EQ="${OUT%.jsonl}.eq.jsonl"
CSVOUT_EQ="${OUT%.jsonl}.eq.csv"
test -f "$OUT"
jq -c 'select(.symbol|test("=F$"))' "$OUT" > "$OUT_FUT"
jq -c 'select(.symbol|test("=F$")|not)' "$OUT" > "$OUT_EQ"
jq -nr '["id","urn","symbol","timestamp_utc","side","entry_price","stop_price","target_price","qty","strategy_code","strategy_label","account_id","accepted","reasons","compliance_snapshot","decision_snapshot_id","meta","created_at"]|@csv' > "$CSVOUT_FUT"
jq -r '[.id,.urn,.symbol,.timestamp_utc,.side,.entry_price,.stop_price,.target_price,.qty,.strategy_code,.strategy_label,.account_id,.accepted, (.reasons|tostring), .compliance_snapshot, .decision_snapshot_id, (.meta|tostring), .created_at] | @csv' "$OUT_FUT" >> "$CSVOUT_FUT"
jq -nr '["id","urn","symbol","timestamp_utc","side","entry_price","stop_price","target_price","qty","strategy_code","strategy_label","account_id","accepted","reasons","compliance_snapshot","decision_snapshot_id","meta","created_at"]|@csv' > "$CSVOUT_EQ"
jq -r '[.id,.urn,.symbol,.timestamp_utc,.side,.entry_price,.stop_price,.target_price,.qty,.strategy_code,.strategy_label,.account_id,.accepted, (.reasons|tostring), .compliance_snapshot, .decision_snapshot_id, (.meta|tostring), .created_at] | @csv' "$OUT_EQ" >> "$CSVOUT_EQ"
ALL=$(wc -l < "$OUT")
FUT=$(wc -l < "$OUT_FUT")
EQ=$(wc -l < "$OUT_EQ")
echo "jsonl_all=$ALL jsonl_fut=$FUT jsonl_eq=$EQ"
echo "csv_fut=$(( $(wc -l < "$CSVOUT_FUT") - 1 )) csv_eq=$(( $(wc -l < "$CSVOUT_EQ") - 1 ))"

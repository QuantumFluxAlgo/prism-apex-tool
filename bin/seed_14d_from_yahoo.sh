#!/usr/bin/env bash
set -euo pipefail
: "${PG_URL:?set PG_URL}"
UA="Mozilla/5.0"
SYMS=("$@")
if [ ${#SYMS[@]} -eq 0 ]; then SYMS=(ES=F NQ=F YM=F); fi
for S in "${SYMS[@]}"; do
  SENC="${S//=/%3D}"
  P2=$(date -u +%s); P1=$(date -u -v-7d +%s)
  curl -fsSL -H "User-Agent: $UA" "https://query1.finance.yahoo.com/v7/finance/chart/${SENC}?period1=${P1}&period2=${P2}&interval=1m&includePrePost=true" \
  | jq -c --arg s "$S" '.chart.result[0] as $r | ($r.timestamp // []) as $t | ($r.indicators.quote[0]) as $q | (range(0; ($t|length))) as $i | {symbol:$s, ts:($t[$i]|todateiso8601), open:$q.open[$i], high:$q.high[$i], low:$q.low[$i], close:$q.close[$i], volume:($q.volume[$i]//0)} | select(.open!=null and .high!=null and .low!=null and .close!=null)' \
  > "bars_${S}_1m_w1.jsonl"
  sleep 2
  P2=$(date -u -v-7d +%s); P1=$(date -u -v-14d +%s)
  curl -fsSL -H "User-Agent: $UA" "https://query1.finance.yahoo.com/v7/finance/chart/${SENC}?period1=${P1}&period2=${P2}&interval=1m&includePrePost=true" \
  | jq -c --arg s "$S" '.chart.result[0] as $r | ($r.timestamp // []) as $t | ($r.indicators.quote[0]) as $q | (range(0; ($t|length))) as $i | {symbol:$s, ts:($t[$i]|todateiso8601), open:$q.open[$i], high:$q.high[$i], low:$q.low[$i], close:$q.close[$i], volume:($q.volume[$i]//0)} | select(.open!=null and .high!=null and .low!=null and .close!=null)' \
  > "bars_${S}_1m_w2.jsonl"
  PG_URL="$PG_URL" ./bin/load_bars_jsonl_to_pg.sh "bars_${S}_1m_w1.jsonl"
  PG_URL="$PG_URL" ./bin/load_bars_jsonl_to_pg.sh "bars_${S}_1m_w2.jsonl"
  PG_URL="$PG_URL" ./bin/make_tickets_from_bars.sh "$S" 14 "tickets_${S}_14d.jsonl"
  PG_URL="$PG_URL" ./bin/load_jsonl_to_pg.sh "tickets_${S}_14d.jsonl"
done

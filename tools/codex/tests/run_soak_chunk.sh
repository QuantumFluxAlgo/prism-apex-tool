#!/bin/sh
set -eu
API_PORT="${API_PORT:-3000}"
CHUNK_SEC="${CHUNK_SEC:-540}"
POLL_SEC="${POLL_SEC:-30}"
ROTATE="${ROTATE:-true}"
SYMBOLS_A="${SYMBOLS_A:-ES,YM}"
SYMBOLS_B="${SYMBOLS_B:-NQ,RTY}"
SYMBOLS_C="${SYMBOLS_C:-CL,GC}"
STATE_FILE="${STATE_FILE:-/tmp/prism_apex_governed_soak.state}"
YF_WINDOW_MIN="${YF_WINDOW_MIN:-15}"
YF_INTERVAL_SEC="${YF_INTERVAL_SEC:-90}"
YF_MAX_RETRIES="${YF_MAX_RETRIES:-6}"
YF_JITTER_MS="${YF_JITTER_MS:-1000}"
YF_429_COOLDOWN_SEC="${YF_429_COOLDOWN_SEC:-600}"

build_args(){
  out=""
  for f in docker-compose.yml compose.ingress-db.override.yml compose.gapfill-realtime.override.yml compose.tickets-realtime.override.yml compose.codex-governor.override.yml compose.codex-forcecurl.override.yml; do
    [ -f "$f" ] && out="$out -f $f"
  done
  echo "$out"
}
ARGS="$(build_args)"
docker compose $ARGS up -d gapfill-realtime tickets-realtime --renew-anon-volumes >/dev/null
GR_CID="$(docker ps --filter "name=gapfill-realtime" --format '{{.ID}}' | head -n1)"
[ -n "$GR_CID" ] || { echo "❌ gapfill-realtime not running"; exit 2; }
if [ ! -f "$STATE_FILE" ]; then
  docker exec "$GR_CID" /bin/sh -lc "
    export SYMBOLS='${SYMBOLS_A}';
    export YF_WINDOW_MIN='${YF_WINDOW_MIN}';
    export YF_INTERVAL_SEC='${YF_INTERVAL_SEC}';
    export YF_MAX_RETRIES='${YF_MAX_RETRIES}';
    export YF_JITTER_MS='${YF_JITTER_MS}';
    export YF_429_COOLDOWN_SEC='${YF_429_COOLDOWN_SEC}';
    export YF_METRICS_PATH='/data/ops/yahoo-metrics.jsonl';
    mkdir -p /data/ops; : > /data/ops/yahoo-metrics.jsonl;
    echo \"[ops] env applied: SYMBOLS=\$SYMBOLS; metrics=\$YF_METRICS_PATH;\"
  " >/dev/null
  echo "ADVANCES=0" > "$STATE_FILE"
fi
WRAP_PATH="$(docker exec "$GR_CID" /bin/sh -lc 'which curl || true')"
GOV_OK="$(docker exec "$GR_CID" /bin/sh -lc '[ -f /opt/codex/lib/yahoo_governor.sh ] && echo OK || echo MISS' | tail -n1)"
case "$WRAP_PATH" in
  */usr/local/bin/curl|*/opt/codex/bin/curl|*/tools/codex/bin/curl) : ;;
  *) echo "❌ governed curl not active in container ($WRAP_PATH)"; exit 3 ;;
esac
[ "$GOV_OK" = "OK" ] || { echo "❌ governor lib missing in container"; exit 3; }
docker exec "$GR_CID" /bin/sh -lc "curl -sS https://example.com >/dev/null" >/dev/null 2>&1 || true
ADVANCES=0
LAST_MAXTS=""
if [ -f "$STATE_FILE" ]; then
  . "$STATE_FILE"
fi
start_ts="$(date -u +%s)"
rot_state=0
pass="no"
while : ; do
  now_ts="$(date -u +%s)"
  elapsed=$((now_ts - start_ts))
  [ "$elapsed" -ge "$CHUNK_SEC" ] && break
  if [ "$ROTATE" = "true" ]; then
    case "$rot_state" in
      0) cur_syms="$SYMBOLS_A" ;;
      1) cur_syms="$SYMBOLS_B" ;;
      2) cur_syms="$SYMBOLS_C" ;;
    esac
    docker exec "$GR_CID" /bin/sh -lc "export SYMBOLS='${cur_syms}'" >/dev/null 2>&1 || true
    rot_state=$(( (rot_state + 1) % 3 ))
  fi
  STATUS="$(curl -fsS "http://localhost:${API_PORT}/api/ops/status" 2>/dev/null || true)"
  maxTs="$(printf '%s' "$STATUS" | awk -F'\"' '/"bars":/{f=1} f&&/"maxTs"/{print $4; exit}')"
  if [ -n "$maxTs" ] && [ "$maxTs" != "${LAST_MAXTS:-}" ]; then
    ADVANCES=$((ADVANCES+1))
    LAST_MAXTS="$maxTs"
    echo "✅ bars.maxTs advanced → $maxTs (total $ADVANCES)"
  else
    [ -n "$maxTs" ] && echo "… bars.maxTs unchanged ($maxTs)" || echo "ℹ️ status not ready"
  fi
  OKS_RAW="$(docker exec "$GR_CID" /bin/sh -lc "grep -c '\"event\":\"ok\"' /data/ops/yahoo-metrics.jsonl 2>/dev/null || echo 0")"
  R429_RAW="$(docker exec "$GR_CID" /bin/sh -lc "grep -c '\"event\":\"429\"' /data/ops/yahoo-metrics.jsonl 2>/dev/null || echo 0")"
  OKS="$(printf '%s' "$OKS_RAW" | tr -d '\r' | tr -d '\n')"
  R429="$(printf '%s' "$R429_RAW" | tr -d '\r' | tr -d '\n')"
  [ -n "$OKS" ] || OKS=0
  [ -n "$R429" ] || R429=0
  total=$((OKS + R429))
  echo "metrics ok=$OKS 429=$R429 total=$total"
  if [ "$ADVANCES" -ge 2 ] && [ "$total" -ge 1 ]; then
    pass="yes"
    break
  fi
  sleep "$POLL_SEC"
done
{
  echo "ADVANCES=$ADVANCES"
  echo "LAST_MAXTS=${LAST_MAXTS:-}"
} > "$STATE_FILE"

echo "\n== OUTCOME REPORT =="
printf 'api_port: %s\nchunk_sec: %s\nrotate: %s\n' "$API_PORT" "$CHUNK_SEC" "$ROTATE"
printf 'advances_observed_total: %s\nmetrics_ok_count: %s\nmetrics_429_count: %s\n' "$ADVANCES" "$OKS" "$R429"
printf 'pass: %s\nstate_file: %s\n' "$pass" "$STATE_FILE"

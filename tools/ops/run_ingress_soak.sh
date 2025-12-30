#!/bin/sh
set -eu
API_PORT="${API_PORT:-3000}"; CHUNK_SEC="${CHUNK_SEC:-480}"; POLL_SEC="${POLL_SEC:-30}"; STATE_FILE="${STATE_FILE:-/tmp/ingress_governor_soak.state}"
ADVANCES=0; LAST=""; pass="no"; OKS=0; R429=0
[ -f "$STATE_FILE" ] && . "$STATE_FILE" || true
now(){ date -u +'%Y-%m-%dT%H:%M:%SZ'; }
cid(){ docker ps --filter "name=gapfill-realtime" -q | head -n1; }
state(){ docker inspect -f '{{.State.Status}}' "$1" 2>/dev/null || echo unknown; }
to_int(){ v=$(printf '%s' "$1" | tr -cd '0-9'); [ -z "$v" ] && echo 0 || echo "$v"; }
start=$(date -u +%s)
while :; do
  [ $(( $(date -u +%s) - start )) -ge "$CHUNK_SEC" ] && break
  C=$(cid); [ -z "$C" ] && { echo "$(now) … container missing"; sleep 5; continue; }
  st=$(state "$C"); [ "$st" = running ] || { echo "$(now) … state=$st"; sleep 5; continue; }
  STATUS=$(curl -fsS "http://localhost:${API_PORT}/api/ops/status" 2>/dev/null || true)
  ts=$(printf '%s' "$STATUS" | awk -F'"' '/"bars":/{f=1} f&&/"maxTs"/{print $4; exit}')
  if [ -n "$ts" ] && [ "$ts" != "${LAST:-}" ]; then ADVANCES=$((ADVANCES+1)); LAST="$ts"; echo "$(now) ✅ bars advance → $ts (total $ADVANCES)"; else echo "$(now) … no change"; fi
  OKS_RAW=$(docker exec "$C" /bin/sh -lc "grep -c '"event":"ok"' /data/ops/ingress-metrics.jsonl 2>/dev/null || echo 0" 2>/dev/null || echo 0)
  R429_RAW=$(docker exec "$C" /bin/sh -lc "grep -c '"event":"429"' /data/ops/ingress-metrics.jsonl 2>/dev/null || echo 0" 2>/divnull || echo 0)
  OKS=$(to_int "$OKS_RAW"); R429=$(to_int "$R429_RAW"); total=$((OKS+R429))
  echo "$(now) metrics ok=$OKS 429=$R429 total=$total"
  if [ "$ADVANCES" -ge 2 ] && [ "$total" -ge 1 ]; then pass="yes"; break; fi
  sleep "$POLL_SEC"
done
echo "ADVANCES=$ADVANCES" > "$STATE_FILE"; echo "LAST=$LAST" >> "$STATE_FILE"
echo; echo "== OUTCOME REPORT =="; echo "advances_observed_total: $ADVANCES"; echo "metrics_ok_count: $OKS"; echo "metrics_429_count: $R429"; echo "pass: $pass"

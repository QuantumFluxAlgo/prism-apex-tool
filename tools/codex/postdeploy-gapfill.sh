#!/usr/bin/env bash
# Prism-Apex: Hardened Post-Deploy Full-Universe Backfill (Bash 3.2 compatible)
# - Discovers symbols from DB (bars_1m ∪ tickets) + optional seeds (seeds/symbols.txt or SEED_SYMBOLS)
# - 14-day default window; flags honored via ts-node entry
# - Chunking, exponential backoff, rate-limited pauses
# - Compose-first, docker-run fallback (API network)
# - Concurrency lock; writes metrics/log summary
set -euo pipefail

# ---- Dates (portable across BSD/GNU) ----
if date -u -v-14d +%Y-%m-%dT00:00:00Z >/dev/null 2>&1; then
  FROM_DEFAULT="$(date -u -v-14d +%Y-%m-%dT00:00:00Z)"
else
  FROM_DEFAULT="$(date -u -d '14 days ago 00:00:00' +%FT%TZ)"
fi
FROM_DATE="${FROM_DATE:-$FROM_DEFAULT}"
TO_DATE="${TO_DATE:-$(date -u +%FT%TZ)}"

BATCH_SIZE="${BATCH_SIZE:-6}"
PAUSE_SECS="${PAUSE_SECS:-10}"
ALLOW_REGEX="${ALLOW_REGEX:-.*}"
DENY_REGEX="${DENY_REGEX:-^$}"
LOG_DIR="${LOG_DIR:-apps/api/data/ops}"
METRICS_FILE="${METRICS_FILE:-$LOG_DIR/backfill-metrics.json}"
LOCK_FILE="${LOCK_FILE:-/tmp/prism-apex-postdeploy-gapfill.lock}"
DRY_RUN="${DRY_RUN:-false}"   # set true to only plan/print

mkdir -p "$LOG_DIR"

# ---- Compose base ----
BASE=""
if [ -n "${COMPOSE_FILE:-}" ] && [ -f "$COMPOSE_FILE" ]; then
  BASE="$COMPOSE_FILE"
else
  for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
    if [ -f "$c" ]; then BASE="$c"; break; fi
  done
fi
[ -z "$BASE" ] && { echo "❌ No compose file found"; exit 1; }

# ---- Single-instance lock ----
if [ -e "$LOCK_FILE" ]; then
  echo "⚠️ Lock present: $LOCK_FILE — another run may be active. Remove to force."
  exit 0
fi
trap 'rm -f "$LOCK_FILE"' EXIT
: > "$LOCK_FILE"

# ---- Utility: container ids, masking, backoff ----
cid() { docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
mask(){ sed -E 's#://([^:]+):[^@]+@#://\1:***@#'; }
backoff() { # backoff <attempt>
  a="$1"; sleep_secs=$(( (a<5?a:5) * 3 )); sleep "$sleep_secs";
}

# ---- Find API/DB, get DATABASE_URL ----
API_ID="$(cid '(^|-)api(-| |$)')" || true
DB_ID="$(cid '(^|-)db(-| |$)')"  || true
[ -z "$API_ID" ] && { echo "❌ API container not found"; docker ps; exit 2; }
[ -z "$DB_ID" ]  && { echo "❌ DB container not found"; docker ps; exit 3; }

DATABASE_URL="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$API_ID" | awk -F= '$1=="DATABASE_URL"{print $2;exit}')"
[ -z "$DATABASE_URL" ] && { echo "❌ DATABASE_URL missing on API"; exit 4; }

echo "[postdeploy] BASE=$BASE"
echo "[postdeploy] WINDOW: $FROM_DATE -> $TO_DATE  | batch=$BATCH_SIZE pause=${PAUSE_SECS}s"
echo "[postdeploy] DATABASE_URL: $(printf "%s" "$DATABASE_URL" | mask)"

# ---- Ensure ingress sees DB (if service exists) ----
if docker compose -f "$BASE" config --services 2>/dev/null | grep -qx ingress-yahoo; then
  docker compose -f "$BASE" -f compose.ingress-db.override.yml up -d ingress-yahoo
else
  echo "[postdeploy] ingress-yahoo not in compose; skipping explicit up."
fi

# ---- Build symbol universe: DB ∪ seeds ----
SQL='with s1 as (select distinct symbol from public.bars_1m),
                s2 as (select distinct symbol from public.tickets)
     select symbol from s1
     union
     select symbol from s2
     order by 1;'
DB_SYMS="$(docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -t -A -c \"$SQL\"" | sed '/^$/d')" || DB_SYMS=""
SEED_SYMS_ENV="${SEED_SYMBOLS:-}"
SEED_SYMS_FILE=""
if [ -f "seeds/symbols.txt" ]; then
  SEED_SYMS_FILE="$(grep -v '^[[:space:]]*#' seeds/symbols.txt | sed '/^$/d' | tr '\n' ',' | sed 's/,$//')"
fi

TMP_SYMS="$(mktemp -t syms.XXXXXX)"
if [ -n "$DB_SYMS" ]; then printf "%s\n" "$DB_SYMS" >> "$TMP_SYMS"; fi
if [ -n "$SEED_SYMS_FILE" ]; then echo "$SEED_SYMS_FILE" | tr ',' '\n' >> "$TMP_SYMS"; fi
if [ -n "$SEED_SYMS_ENV" ]; then echo "$SEED_SYMS_ENV" | tr ',' '\n' >> "$TMP_SYMS"; fi

SYMS_FILE="$(mktemp -t syms.XXXXXX)"
awk '!seen[$0]++' "$TMP_SYMS" | awk -v A="$ALLOW_REGEX" -v D="$DENY_REGEX" 'tolower($0) ~ tolower(A) && tolower($0) !~ tolower(D)' > "$SYMS_FILE"
rm -f "$TMP_SYMS"
TOTAL="$(wc -l < "$SYMS_FILE" | tr -d ' ')"
[ "$TOTAL" -eq 0 ] && { echo "❌ No symbols to process"; rm -f "$SYMS_FILE"; exit 5; }
echo "[postdeploy] Symbols ($TOTAL):"; sed 's/^/  - /' "$SYMS_FILE" | sed -n '1,40p'; [ "$TOTAL" -gt 40 ] && echo "  ... (+$((TOTAL-40)) more)"

# ---- Batch list into CSV lines (Bash-3.2 safe) ----
CHUNKS_FILE="$(mktemp -t chunks.XXXXXX)"
awk -v n="$BATCH_SIZE" '
  NF {
    if (cnt==0){printf "%s",$0; cnt=1}
    else {printf ",%s",$0; cnt++}
    if (cnt==n){printf "\n"; cnt=0}
  }
  END { if (cnt>0) printf "\n"; }
' "$SYMS_FILE" > "$CHUNKS_FILE"

# ---- runner: compose first, docker-run fallback (API network) ----
run_chunk() {
  CHUNK_STR="$1"
  # compose path
  set +e
  docker compose -f "$BASE" \
    -f compose.ingress-db.override.yml \
    -f compose.gapfill-once.nodeps.yml \
    run --rm \
      -e DATABASE_URL="$DATABASE_URL" \
      -e FROM_DATE="$FROM_DATE" \
      -e TO_DATE="$TO_DATE" \
      -e SYMBOLS="$CHUNK_STR" \
      gapfill-once \
      /bin/sh -lc "corepack enable || true; pnpm -r --filter @prism-apex/ingest build || true; npx -y ts-node apps/ingest/src/gapfill.ts --from \"$FROM_DATE\" --to \"$TO_DATE\" --symbols \"$CHUNK_STR\""
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then return 0; fi

  # docker run fallback
  API_NET="$(docker inspect "$API_ID" -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)"
  [ -z "$API_NET" ] && { echo "❌ API network not found"; return 1; }

  docker run --rm --network "$API_NET" \
    -e TZ=UTC \
    -e DATABASE_URL="$DATABASE_URL" \
    -e FROM_DATE="$FROM_DATE" \
    -e TO_DATE="$TO_DATE" \
    -e SYMBOLS="$CHUNK_STR" \
    prism-apex:ingress-dev \
    /bin/sh -lc "corepack enable || true; pnpm -r --filter @prism-apex/ingest build || true; npx -y ts-node apps/ingest/src/gapfill.ts --from \"$FROM_DATE\" --to \"$TO_DATE\" --symbols \"$CHUNK_STR\""
}

# ---- Execute batches with retries/backoff ----
FAILED=0; BATCH_IDX=1
if [ "$DRY_RUN" = "true" ]; then echo "[postdeploy] DRY_RUN=true — skipping execution."; fi

while IFS= read -r CHUNK || [ -n "$CHUNK" ]; do
  [ -z "$CHUNK" ] && continue
  echo; echo "[postdeploy] BATCH $BATCH_IDX: $(echo "$CHUNK" | tr ',' ' ')"
  if [ "$DRY_RUN" != "true" ]; then
    attempt=1; ok=0
    while [ $attempt -le 5 ]; do
      if run_chunk "$CHUNK"; then ok=1; break; fi
      echo "[postdeploy] retry attempt $attempt failed; backing off..."
      backoff "$attempt"
      attempt=$((attempt+1))
    done
    if [ $ok -ne 1 ]; then
      echo "[postdeploy] ❌ permanent failure for chunk: $CHUNK"
      FAILED=$((FAILED+1))
    fi
    echo "[postdeploy] pause ${PAUSE_SECS}s..."; sleep "$PAUSE_SECS"
  fi
  BATCH_IDX=$((BATCH_IDX+1))
done < "$CHUNKS_FILE"

rm -f "$SYMS_FILE" "$CHUNKS_FILE"

# ---- Restart tickets-cron if present ----
CRON_ID="$(cid 'tickets.*cron')" || true
if [ -n "$CRON_ID" ]; then
  echo "[postdeploy] restarting tickets-cron..."
  docker restart "$(docker inspect "$CRON_ID" -f '{{.Name}}' | sed s,^/,,)" || true
  sleep 3
  docker logs --tail 120 "$CRON_ID" || true
else
  echo "[postdeploy] tickets-cron not found; skip restart."
fi

# ---- Verification & metrics ----
NOW_UTC="$(date -u +%FT%TZ)"
echo; echo "[postdeploy] Ceilings (top 25 by ts_utc):"
docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -F \$'\t' -A -c \
\"with mx as (select symbol, max(ts_utc) max_ts from public.bars_1m group by 1)
  select symbol, max_ts from mx order by max_ts desc nulls last limit 25;\"" | tee "$LOG_DIR/bars-ceilings.txt" >/dev/null || true

echo; echo "[postdeploy] Tickets ceilings (opened_at_utc, created_at_utc):"
TICKETS_CEIL="$(docker exec "$DB_ID" psql -U apex -d prismapex -t -A -c \
"select coalesce(max(opened_at_utc)::text,'NULL'), coalesce(max(created_at_utc)::text,'NULL') from public.tickets;")" || TICKETS_CEIL="NULL|NULL"
echo "$TICKETS_CEIL" | tee "$LOG_DIR/tickets-ceilings.txt" >/dev/null

API_HEALTH="$(curl -sS http://localhost:5190/api/health || true)"
API_TICKETS="$(curl -sS 'http://localhost:5190/api/tickets?limit=5' | head -c 800 || true)"

# Write metrics as compact JSON (no jq reliance)
{
  echo "{"
  echo "  \"timestamp\":\"$NOW_UTC\",";
  echo "  \"from\":\"$FROM_DATE\",";
  echo "  \"to\":\"$TO_DATE\",";
  echo "  \"batch_size\":$BATCH_SIZE,";
  echo "  \"pause_secs\":$PAUSE_SECS,";
  echo "  \"failed_chunks\":$FAILED";
  echo "}"
} > "$METRICS_FILE"

echo; echo "== OUTCOME REPORT =="
echo "Backfill window: $FROM_DATE -> $TO_DATE"
echo "Failed chunks: $FAILED"
echo "Metrics: $METRICS_FILE"
echo "Bars ceilings: $LOG_DIR/bars-ceilings.txt"
echo "Tickets ceilings: $LOG_DIR/tickets-ceilings.txt"
echo "API health (first 200): $(printf '%s' "$API_HEALTH" | head -c 200)"
echo "API tickets (first 200): $(printf '%s' "$API_TICKETS" | head -c 200)"

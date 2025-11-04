#!/usr/bin/env bash
# Prism-Apex: Standard Post-Deploy Full-Universe Gapfill (uses existing jobs)
# - Discovers all symbols from DB (bars_1m ∪ tickets)
# - Runs gapfill in batches using compose.gapfill-once.nodeps.yml
# - Restarts tickets-cron
# - Prints bars ceilings (top 25), tickets ceilings, and API snapshot
set -euo pipefail

FROM_DATE="${FROM_DATE:-$(date -u -d '5 days ago 00:00:00' +%FT%TZ 2>/dev/null || date -u -v-5d +%Y-%m-%dT00:00:00Z)}"
TO_DATE="${TO_DATE:-$(date -u +%FT%TZ)}"
BATCH_SIZE="${BATCH_SIZE:-6}"
PAUSE_SECS="${PAUSE_SECS:-10}"
ALLOW_REGEX="${ALLOW_REGEX:-.*}"
DENY_REGEX="${DENY_REGEX:-^$}"

if [[ -n "${COMPOSE_FILE:-}" && -f "$COMPOSE_FILE" ]]; then BASE="$COMPOSE_FILE"
else
  for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do [[ -f "$c" ]] && BASE="$c" && break; done
fi
[[ -z "${BASE:-}" ]] && { echo "❌ No compose file found"; exit 1; }

cid() { docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
API_ID="$(cid '(^|-)api(-| |$)')" || true
DB_ID="$(cid '(^|-)db(-| |$)')"  || true
[[ -z "${API_ID}" ]] && { echo "❌ API container not found"; exit 2; }
[[ -z "${DB_ID}" ]] && { echo "❌ DB container not found"; exit 3; }
DBURL="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$API_ID" | awk -F= '$1=="DATABASE_URL"{print $2;exit}')"
[[ -z "${DBURL}" ]] && { echo "❌ DATABASE_URL missing on API"; exit 4; }

mask(){ sed -E 's#://([^:]+):[^@]+@#://\1:***@#'; }
BYTES=$(printf "%s" "$DBURL" | mask)
echo "[postdeploy] BASE=$BASE"
echo "[postdeploy] WINDOW: $FROM_DATE -> $TO_DATE  | batch=$BATCH_SIZE pause=${PAUSE_SECS}s"
echo "[postdeploy] DATABASE_URL: $BYTES"

docker compose -f "$BASE" -f compose.ingress-db.override.yml up -d ingress-yahoo >/dev/null

SQL='with s1 as (select distinct symbol from public.bars_1m),
                s2 as (select distinct symbol from public.tickets)
     select symbol from s1
     union
     select symbol from s2
     order by 1;'
SYMS_RAW="$(docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -t -A -c \"$SQL\"" | sed '/^$/d')"
[[ -z "${SYMS_RAW}" ]] && { echo "❌ No symbols discovered"; exit 5; }
SYMS_FILTERED="$(echo "$SYMS_RAW" | awk -v A="$ALLOW_REGEX" -v D="$DENY_REGEX" 'tolower($0) ~ tolower(A) && tolower($0) !~ tolower(D)')"
mapfile -t SYM_ARR < <(echo "$SYMS_FILTERED")
TOTAL="${#SYM_ARR[@]}"; [[ "$TOTAL" -eq 0 ]] && { echo "❌ Zero symbols after filtering"; exit 6; }
echo "[postdeploy] Symbols ($TOTAL):"; printf '  - %s\n' "${SYM_ARR[@]}"

i=0; b=1
while (( i < TOTAL )); do
  j=$(( i + BATCH_SIZE )); (( j > TOTAL )) && j=$TOTAL
  CHUNK=("${SYM_ARR[@]:i:j-i}")
  CHUNK_STR="$(IFS=,; echo "${CHUNK[*]}")"
  echo; echo "[postdeploy] BATCH $b: ${CHUNK[*]}"
  docker compose -f "$BASE" \
    -f compose.ingress-db.override.yml \
    -f compose.gapfill-once.nodeps.yml \
    run --rm \
      -e DATABASE_URL="$DBURL" \
      -e FROM_DATE="$FROM_DATE" \
      -e TO_DATE="$TO_DATE" \
      -e SYMBOLS="$CHUNK_STR" \
      gapfill-once || true
  echo "[postdeploy] pause ${PAUSE_SECS}s..."; sleep "$PAUSE_SECS"
  i=$j; b=$((b+1))
done

CRON_ID="$(cid 'tickets.*cron')" || true
if [[ -n "${CRON_ID}" ]]; then
  echo "[postdeploy] restarting tickets-cron..."; docker restart "$(docker inspect "$CRON_ID" -f '{{.Name}}' | sed s,^/,,)" >/dev/null || true
  sleep 3; docker logs --tail 100 "$CRON_ID" || true
fi

echo; echo "[postdeploy] Ceilings (top 25 by ts_utc):"
docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -F \$'\t' -A -c \\
\"with mx as (select symbol, max(ts_utc) max_ts from public.bars_1m group by 1)\n  select symbol, max_ts from mx order by max_ts desc nulls last limit 25;\""

echo; echo "[postdeploy] Tickets ceilings (opened_at_utc, created_at_utc):"
docker exec "$DB_ID" psql -U apex -d prismapex -t -A -c \
"select max(opened_at_utc), max(created_at_utc) from public.tickets;"

echo; echo "[postdeploy] API snapshot:"
curl -sS "http://localhost:5190/api/tickets?limit=5" | head -c 800; echo

echo; echo "== OUTCOME REPORT =="
echo "Ran postdeploy gapfill for $TOTAL symbols (batch $BATCH_SIZE). Window: $FROM_DATE -> $TO_DATE"
echo "Printed ceilings (top25), ticket ceilings, API snapshot."

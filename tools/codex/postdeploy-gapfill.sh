#!/usr/bin/env bash
# Prism-Apex: Standard Post-Deploy Full-Universe Gapfill
# Compatible with macOS Bash 3.2: no arrays/mapfile
# Forces ts-node so CLI flags --from/--to/--symbols are honored
set -euo pipefail

# ----- Date defaults -----
if date -u -v-5d +%Y-%m-%dT00:00:00Z >/dev/null 2>&1; then
  FROM_DATE_DEFAULT="$(date -u -v-5d +%Y-%m-%dT00:00:00Z)"
else
  FROM_DATE_DEFAULT="$(date -u -d '5 days ago 00:00:00' +%FT%TZ)"
fi
FROM_DATE="${FROM_DATE:-$FROM_DATE_DEFAULT}"
TO_DATE="${TO_DATE:-$(date -u +%FT%TZ)}"
BATCH_SIZE="${BATCH_SIZE:-6}"
PAUSE_SECS="${PAUSE_SECS:-10}"
ALLOW_REGEX="${ALLOW_REGEX:-.*}"
DENY_REGEX="${DENY_REGEX:-^$}"

# ----- Compose base -----
BASE=""
if [ -n "${COMPOSE_FILE:-}" ] && [ -f "$COMPOSE_FILE" ]; then
  BASE="$COMPOSE_FILE"
else
  for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
    if [ -f "$c" ]; then BASE="$c"; break; fi
  done
fi
[ -z "$BASE" ] && { echo "❌ No compose file found"; exit 1; }

# ----- Containers & DB URL -----
cid() { docker ps --format '{{.ID}} {{.Names}}' | awk -v p="$1" 'tolower($0) ~ tolower(p) {print $1; exit}'; }
API_ID="$(cid '(^|-)api(-| |$)')" || true
DB_ID="$(cid '(^|-)db(-| |$)')"  || true
[ -z "$API_ID" ] && { echo "❌ API container not found"; exit 2; }
[ -z "$DB_ID" ]  && { echo "❌ DB container not found";  exit 3; }
DBURL="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$API_ID" | awk -F= '$1=="DATABASE_URL"{print $2;exit}')"
[ -z "$DBURL" ] && { echo "❌ DATABASE_URL missing on API"; exit 4; }
mask(){ sed -E 's#://([^:]+):[^@]+@#://\1:***@#'; }
echo "[postdeploy] BASE=$BASE"
echo "[postdeploy] WINDOW: $FROM_DATE -> $TO_DATE | batch=$BATCH_SIZE pause=${PAUSE_SECS}s"
echo "[postdeploy] DATABASE_URL: $(printf "%s" "$DBURL" | mask)"

docker compose -f "$BASE" -f compose.ingress-db.override.yml up -d ingress-yahoo >/dev/null

# ----- Discover symbols from DB -----
SQL='with s1 as (select distinct symbol from public.bars_1m),
                s2 as (select distinct symbol from public.tickets)
     select symbol from s1
     union
     select symbol from s2
     order by 1;'
SYMS_FILTERED="$(docker exec "$DB_ID" sh -lc "psql -U apex -d prismapex -t -A -c \"$SQL\"" \
  | sed '/^$/d' \
  | awk -v A="$ALLOW_REGEX" -v D="$DENY_REGEX" 'tolower($0) ~ tolower(A) && tolower($0) !~ tolower(D)')"
[ -z "$SYMS_FILTERED" ] && { echo "❌ Zero symbols after filtering"; exit 5; }
TOTAL=$(printf "%s\n" "$SYMS_FILTERED" | wc -l | awk '{print $1}')
echo "[postdeploy] Symbols ($TOTAL):"; printf '  - %s\n' $SYMS_FILTERED

echo "[postdeploy] batching symbols (total=$TOTAL size=${BATCH_SIZE})..."

# ----- Batch to CSV lines via awk (portable) -----
TMP_CHUNKS=$(mktemp -t postdeploy.chunks.XXXXXX)
printf "%s\n" $SYMS_FILTERED \
| awk -v n="$BATCH_SIZE" 'BEGIN{cnt=0}
    {
      if (cnt==0){printf "%s", $0; cnt=1}
      else       {printf ",%s", $0; cnt++}
      if (cnt==n){printf "\n"; cnt=0}
    }
    END{ if (cnt>0) printf "\n"; }
' > "$TMP_CHUNKS"

# ----- Run each chunk using ts-node to honor flags -----
batch=1
while IFS= read -r CHUNK; do
  [ -z "$CHUNK" ] && continue
  echo
  echo "[postdeploy] BATCH $batch: $(echo "$CHUNK" | tr ',' ' ')"
  docker compose -f "$BASE" \
    -f compose.ingress-db.override.yml \
    -f compose.gapfill-once.nodeps.yml \
    run --rm \
      -e DATABASE_URL="$DBURL" \
      -e FROM_DATE="$FROM_DATE" \
      -e TO_DATE="$TO_DATE" \
      -e SYMBOLS="$CHUNK" \
      gapfill-once \
      /bin/sh -lc "corepack enable || true; pnpm -r --filter @prism-apex/ingest build || true; npx -y ts-node apps/ingest/src/gapfill.ts --from '$FROM_DATE' --to '$TO_DATE' --symbols '$CHUNK'"
  echo "[postdeploy] pause ${PAUSE_SECS}s..."; sleep "$PAUSE_SECS"
  batch=$((batch+1))
done < "$TMP_CHUNKS"
rm -f "$TMP_CHUNKS"

# ----- Restart tickets + verify -----
CRON_ID="$(cid 'tickets.*cron')" || true
if [ -n "$CRON_ID" ]; then
  echo "[postdeploy] restarting tickets-cron..."
  docker restart "$(docker inspect "$CRON_ID" -f '{{.Name}}' | sed s,^/,,)" || true
  sleep 3
  docker logs --tail 120 "$CRON_ID" || true
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
echo "Ran postdeploy gapfill (Bash-3.2 safe) for $TOTAL symbols. Window: $FROM_DATE -> $TO_DATE"
echo "Printed ceilings (top25), ticket ceilings, API snapshot."

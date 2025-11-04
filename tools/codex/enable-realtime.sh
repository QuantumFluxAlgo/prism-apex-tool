#!/usr/bin/env bash
# Enable realtime services on any host with the compose bundle present.
set -euo pipefail
# Discover base compose
BASE="${COMPOSE_FILE:-}"
if [ -z "$BASE" ]; then
  for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
    [ -f "$c" ] && BASE="$c" && break
  done
fi
[ -z "$BASE" ] && { echo "❌ No compose file found"; exit 1; }

echo "[realtime] Using compose: $BASE"
# Ensure ingress picks up DATABASE_URL (from API container env) if present
EXTRA="-f compose.ingress-db.override.yml"
[ -f compose.gapfill-realtime.override.yml ] || { echo "❌ compose.gapfill-realtime.override.yml missing"; exit 2; }
[ -f compose.tickets-realtime.override.yml ] || { echo "❌ compose.tickets-realtime.override.yml missing"; exit 3; }

docker compose -f "$BASE" $EXTRA -f compose.gapfill-realtime.override.yml up -d gapfill-realtime
docker compose -f "$BASE" $EXTRA -f compose.tickets-realtime.override.yml up -d tickets-realtime

echo "[realtime] Services up:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | egrep 'tickets-realtime|gapfill-realtime|api|db' || true

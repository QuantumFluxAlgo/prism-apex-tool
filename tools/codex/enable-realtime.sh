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
OVERLAYS=(
  compose.ingress-db.override.yml
  compose.gapfill-realtime.override.yml
  compose.tickets-realtime.override.yml
  compose.codex-governor.override.yml
  compose.codex-forcecurl.override.yml
)
for f in "${OVERLAYS[@]}"; do
  [ -f "$f" ] || { echo "❌ missing $f"; exit 2; }
done
ARGS=(-f "$BASE")
for f in "${OVERLAYS[@]}"; do
  ARGS+=(-f "$f")
done
echo "[realtime] Applying overlays: ${OVERLAYS[*]}"
docker compose "${ARGS[@]}" up -d gapfill-realtime tickets-realtime

echo "[realtime] Services up:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | egrep 'tickets-realtime|gapfill-realtime|api|db' || true

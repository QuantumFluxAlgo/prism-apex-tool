#!/usr/bin/env bash
# Disable realtime services on any host with the compose bundle present.
set -euo pipefail
BASE="${COMPOSE_FILE:-}"
if [ -z "$BASE" ]; then
  for c in docker-compose.yml docker-compose.yaml compose.yml compose.yaml; do
    [ -f "$c" ] && BASE="$c" && break
  done
fi
[ -z "$BASE" ] && { echo "❌ No compose file found"; exit 1; }

docker compose -f "$BASE" stop gapfill-realtime tickets-realtime || true
docker compose -f "$BASE" rm -f gapfill-realtime tickets-realtime || true
echo "[realtime] Disabled gapfill-realtime & tickets-realtime"

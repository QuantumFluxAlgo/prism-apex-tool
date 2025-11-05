#!/bin/sh
# Prism-Apex: keep minute bars current by re-running gapfill for today->now every 60s
set -eu

echo "[gapfill-rt] starting realtime gapfill loop"
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
fi

HEARTBEAT_DIR="${HEARTBEAT_DIR:-/app/apps/api/data/ops}"
HEARTBEAT_PATH="$HEARTBEAT_DIR/gapfill-realtime.heartbeat"
mkdir -p "$HEARTBEAT_DIR"

while :; do
  FROM_DATE="$(date -u +%Y-%m-%dT00:00:00Z)"
  TO_DATE="$(date -u +%FT%TZ)"
  SYMBOLS_VALUE="${SYMBOLS:-}"
  echo "[gapfill-rt] window: ${FROM_DATE} -> ${TO_DATE}"

  pnpm -r --filter @prism-apex/ingest build || true
  if [ -f apps/ingest/dist/gapfill.js ]; then
    node apps/ingest/dist/gapfill.js --from "${FROM_DATE}" --to "${TO_DATE}" --symbols "${SYMBOLS_VALUE}" || \
      npx -y ts-node apps/ingest/src/gapfill.ts --from "${FROM_DATE}" --to "${TO_DATE}" --symbols "${SYMBOLS_VALUE}"
  else
    npx -y ts-node apps/ingest/src/gapfill.ts --from "${FROM_DATE}" --to "${TO_DATE}" --symbols "${SYMBOLS_VALUE}"
  fi

  date -u +%FT%TZ > "$HEARTBEAT_PATH" || true
  sleep 60
done

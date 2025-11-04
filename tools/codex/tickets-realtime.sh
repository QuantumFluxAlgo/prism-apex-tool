#!/usr/bin/env bash
# Prism-Apex: run ALL ticket backfill runners incrementally every minute (Bash 3.2 safe)
set -euo pipefail
echo "[tickets-rt] starting realtime orchestrator"
corepack enable || true

build_safe() {
  # build once per loop to pick up any new artifacts
  pnpm -r --filter @prism-apex/tickets build || true
}

discover_runners() {
  # List dist backfill runners like apps/tickets/dist/backfill-*.js
  if [ -d "apps/tickets/dist" ]; then
    ls apps/tickets/dist 2>/dev/null | awk '/^backfill-.*\.js$/ {print "apps/tickets/dist/" $0}'
  fi
}

run_once() {
  FROM_DATE="$(date -u +%Y-%m-%dT00:00:00Z)"
  TO_DATE="$(date -u +%FT%TZ)"
  echo "[tickets-rt] window: $FROM_DATE -> $TO_DATE"

  build_safe
  runners="$(discover_runners || true)"
  if [ -z "$runners" ]; then
    echo "[tickets-rt] no backfill-* runners found under apps/tickets/dist"
    return 0
  fi
  printf "%s\n" "$runners" | while IFS= read -r JS; do
    [ -z "$JS" ] && continue
    echo "[tickets-rt] executing: node $JS"
    node "$JS" || true
  done
}

# main loop
while :; do
  run_once
  sleep 60
done

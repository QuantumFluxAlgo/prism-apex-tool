#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
V2="$ROOT/apps/dashboard/src/pages/WorklistV2.tsx"
LEGACY="$ROOT/apps/dashboard/src/pages/WorklistV2.legacy.tsx"

echo "=== PRISM APEX — SYNC WORKLIST V2 → LEGACY SNAPSHOT ==="
echo "Source (canonical):     $V2"
echo "Destination (snapshot): $LEGACY"
echo

if [ ! -f "$V2" ]; then
  echo "ERROR: WorklistV2.tsx not found at $V2" >&2
  exit 1
fi

cp "$V2" "$LEGACY"

echo "OK: Legacy snapshot updated from current WorklistV2.tsx"
echo
ls -l "$LEGACY"
echo
git status -s || true


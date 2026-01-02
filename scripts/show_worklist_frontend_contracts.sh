#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

V2_PAGE="$ROOT/apps/dashboard/src/pages/WorklistV2.tsx"
API_LIB="$ROOT/apps/dashboard/src/lib/api.ts"
MOCK_LIB="$ROOT/apps/dashboard/src/lib/worklistMock.ts"
FILTERS_BAR="$ROOT/apps/dashboard/src/ui/FiltersBar.tsx"

echo "=== PRISM APEX — WORKLIST V2 FRONTEND CONTRACTS SNAPSHOT ==="
echo "Root: $ROOT"
echo

for f in "$V2_PAGE" "$API_LIB" "$MOCK_LIB" "$FILTERS_BAR"; do
  if [ -f "$f" ]; then
    echo "---------------------------------------------------------------------"
    echo "FILE: ${f#$ROOT/}"
    echo "---------------------------------------------------------------------"
    cat "$f"
    echo
  else
    echo "MISSING: ${f#$ROOT/} (file not found)"
    echo
  fi
done

echo "=== DONE: frontend contracts snapshot complete. ==="

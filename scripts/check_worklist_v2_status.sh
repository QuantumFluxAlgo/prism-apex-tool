#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "=== PRISM APEX — WORKLIST V2 STATUS CHECK ==="
echo "Root: $ROOT"
echo

V2="$ROOT/apps/dashboard/src/pages/WorklistV2.tsx"
LEGACY="$ROOT/apps/dashboard/src/pages/WorklistV2.legacy.tsx"
API="$ROOT/apps/dashboard/src/lib/api.ts"
MOCK="$ROOT/apps/dashboard/src/lib/worklistMock.ts"
SHELL="$ROOT/apps/dashboard/src/layouts/ExecutionShell.tsx"

if [ ! -f "$V2" ]; then
  echo "ERROR: Missing WorklistV2.tsx at $V2" >&2
  exit 1
fi

echo "--- Files ---"
ls -1 "$V2" "$LEGACY" "$API" "$MOCK" "$SHELL" 2>/dev/null || true
echo

echo "--- Diff: WorklistV2.tsx vs WorklistV2.legacy.tsx ---"
if [ -f "$LEGACY" ]; then
  if diff -q "$V2" "$LEGACY" >/dev/null 2>&1; then
    echo "OK: WorklistV2.tsx and WorklistV2.legacy.tsx are identical."
  else
    echo "WARN: WorklistV2.tsx and WorklistV2.legacy.tsx differ. Showing unified diff:"
    echo
    diff -u "$LEGACY" "$V2" || true
  fi
else
  echo "NOTE: No legacy file present at $LEGACY"
fi
echo

echo "--- Key wiring checks ---"
echo
echo "WorklistV2 uses A2 primitives + mocks:"
grep -n "FiltersBar" "$V2" || true
grep -n "DataTable" "$V2" || true
grep -n "CardHeader" "$V2" || true
grep -n "getWorklistV2CanonicalTickets" "$V2" || true
grep -n "fetchWorklistCanonicalTickets" "$V2" || true
grep -n "fetchSessionMetrics" "$V2" || true
echo

echo "SessionMetrics DTO + helpers in lib/api.ts:"
grep -n "interface SessionMetricsDto" "$API" || true
grep -n "fetchSessionMetrics" "$API" || true
grep -n "fetchSessionMetricsBatch" "$API" || true
echo

echo "Worklist V2 mock tickets:"
grep -n "getWorklistV2CanonicalTickets" "$MOCK" || true
echo

echo "ExecutionShell tabs (should include worklist → /worklist-v2):"
grep -n "worklist" "$SHELL" || true
echo

echo "=== DONE: Worklist V2 status checked. ==="

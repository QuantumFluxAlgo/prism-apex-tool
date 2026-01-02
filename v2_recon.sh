#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 RECON (READ-ONLY) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
echo "Repo root: $REPO_ROOT"
echo

echo "--- Checking dashboard structure ---"
ls -R apps/dashboard/src || true
echo

echo "--- Key V2 Pages (Worklist, Tickets, Markets, Analytics, StrategyLab, System) ---"
for f in \
  apps/dashboard/src/pages/WorklistV2.tsx \
  apps/dashboard/src/pages/Tickets.tsx \
  apps/dashboard/src/pages/MarketData.tsx \
  apps/dashboard/src/pages/Analytics.tsx \
  apps/dashboard/src/pages/StrategyLab.tsx \
  apps/dashboard/src/pages/Status.tsx \
  apps/dashboard/src/layouts/ExecutionShell.tsx \
  apps/dashboard/src/App.tsx
do
  echo ">>> $f"
  sed -n '1,200p' "$f" 2>/dev/null || echo "MISSING: $f"
  echo
done

echo "--- Shared UI Components ---"
for f in \
  apps/dashboard/src/ui/FiltersBar.tsx \
  apps/dashboard/src/ui/DataTable.tsx \
  apps/dashboard/src/ui/Card.tsx \
  apps/dashboard/src/ui/Badge.tsx
do
  echo ">>> $f"
  sed -n '1,200p' "$f" 2>/dev/null || echo "MISSING: $f"
  echo
done

echo "--- API Contract Layer ---"
for f in \
  apps/dashboard/src/lib/api.ts \
  apps/dashboard/src/lib/worklistMock.ts
do
  echo ">>> $f"
  sed -n '1,200p' "$f" 2>/dev/null || echo "MISSING: $f"
  echo
done

echo "=== DONE: V2 RECON ==="

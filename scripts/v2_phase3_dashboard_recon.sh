#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3 DASHBOARD RECON ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo
echo "--- Git branch & status ---"
git rev-parse --abbrev-ref HEAD || true
git status -sb || true

echo
echo "--- Recent commits (last 8) ---"
git log -8 --oneline || true

echo
echo "--- Canonical V2 dashboard pages ---"
PAGES=(
  "apps/dashboard/src/pages/WorklistV2.tsx"
  "apps/dashboard/src/pages/Tickets.tsx"
  "apps/dashboard/src/pages/MarketData.tsx"
  "apps/dashboard/src/pages/Analytics.tsx"
  "apps/dashboard/src/pages/StrategyLab.tsx"
  "apps/dashboard/src/pages/Status.tsx"
  "apps/dashboard/src/pages/Alerts.tsx"
)
for f in "${PAGES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "✓ $f"
  else
    echo "✗ $f (MISSING)"
  fi
done

echo
echo "--- Canonical helpers & hooks ---"
HELPERS=(
  "apps/dashboard/src/lib/api.ts"
  "apps/dashboard/src/lib/apiBase.ts"
  "apps/dashboard/src/hooks/useTicketsHistory.ts"
)
for f in "${HELPERS[@]}"; do
  if [[ -f "$f" ]]; then
    echo "✓ $f"
  else
    echo "✗ $f (MISSING)"
  fi
done

echo
echo "--- Dashboard tests (key suites) ---"
TESTS=(
  "apps/dashboard/src/__tests__/App.test.tsx"
  "apps/dashboard/src/__tests__/Tickets.test.tsx"
  "apps/dashboard/src/__tests__/Analytics.test.tsx"
  "apps/dashboard/src/__tests__/MarketData.test.tsx"
  "apps/dashboard/src/__tests__/StrategyLab.test.tsx"
  "apps/dashboard/src/__tests__/Status.test.tsx"
  "apps/dashboard/src/__tests__/Alerts.test.tsx"
  "apps/dashboard/src/__tests__/WorklistPnLColumns.test.tsx"
  "apps/dashboard/src/__tests__/WorklistPnLCell.test.tsx"
)
for f in "${TESTS[@]}"; do
  if [[ -f "$f" ]]; then
    echo "✓ $f"
  else
    echo "✗ $f (MISSING)"
  fi
done

echo
echo "--- Docs presence check ---"
DOCS=(
  "docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"
  "docs/REPO_INDEX_V2.md"
)
for f in "${DOCS[@]}"; do
  if [[ -f "$f" ]]; then
    echo "✓ $f"
  else
    echo "✗ $f (MISSING)"
  fi
done

echo
echo "--- Phase 3 snapshot marker in dashboard plan ---"
grep -n "Phase 3 (Dec 2025 snapshot)" docs/PRISM_APEX_V2_DASHBOARD_PLAN.md || echo "Phase 3 snapshot line not found"

echo
echo "--- Canonical V2 dashboard pages section marker in repo index ---"
grep -n "2.2.1 Canonical V2 Dashboard Pages" docs/REPO_INDEX_V2.md || echo "Canonical pages section not found"

echo
echo "--- Dashboard tests (quick run) ---"
pnpm --filter prism-apex-dashboard run test

echo
echo "=== DONE: V2 Phase 3 dashboard recon complete. ==="

#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 3: ALERTS TESTS COMMIT ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo "--- Running dashboard tests (belt-and-braces) ---"
pnpm --filter prism-apex-dashboard run test

echo
echo "--- Staging Alerts tests + helper script ---"
git add \
  apps/dashboard/src/__tests__/Alerts.test.tsx \
  scripts/v2_phase3_alerts_fix_tests_v2.sh

echo
echo "--- Commit ---"
git commit -m "V2 Phase 3: Alerts tests – disambiguated queries for canonical surface"

echo
echo "=== DONE: Alerts tests changes committed. ==="

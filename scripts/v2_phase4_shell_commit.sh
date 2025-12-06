#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PHASE 4: SHELL RETHEME COMMIT ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo "--- Git status (before) ---"
git status --short --branch || true
echo

echo "--- Running dashboard tests (belt-and-braces) ---"
pnpm --filter prism-apex-dashboard run test
echo

echo "--- Staging Phase 4 shell retheme artefacts ---"
git add \
  apps/dashboard/src/layouts/ExecutionShell.tsx \
  apps/dashboard/src/styles/a3-shell.css \
  scripts/v2_phase4_shell_retheme.sh \
  scripts/v2_phase4_shell_commit.sh

echo
echo "--- Commit ---"
git commit -m "V2 Phase 4: Execution shell retheme (A3 operator dashboard)"

echo
echo "--- Git status (after) ---"
git status --short --branch || true

echo
echo "=== DONE: V2 Phase 4 shell retheme committed. ==="

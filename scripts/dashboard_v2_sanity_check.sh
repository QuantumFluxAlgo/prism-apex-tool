#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — DASHBOARD V2 SANITY CHECK ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

DASHBOARD_PKG_JSON="$REPO_ROOT/apps/dashboard/package.json"

if [ ! -f "$DASHBOARD_PKG_JSON" ]; then
  echo "✗ ERROR: apps/dashboard/package.json not found. Aborting."
  exit 1
fi

echo "--- Detecting dashboard workspace name from apps/dashboard/package.json ---"

WORKSPACE_NAME="$(node << 'NODE'
const fs = require('fs');
const path = require('path');
const pkgPath = path.join(process.cwd(), 'apps', 'dashboard', 'package.json');
const raw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(raw);
const name = (pkg && typeof pkg.name === 'string' && pkg.name.trim().length > 0)
  ? pkg.name.trim()
  : 'prism-apex-dashboard';
console.log(name);
NODE
)"

echo "Dashboard workspace: ${WORKSPACE_NAME}"
echo

STATUS=0

echo "--- STEP 1: Lint (pnpm --filter \"${WORKSPACE_NAME}\" run lint) ---"
if pnpm --filter "${WORKSPACE_NAME}" run lint; then
  echo "✓ Lint passed for ${WORKSPACE_NAME}"
else
  echo "✗ Lint FAILED for ${WORKSPACE_NAME}"
  STATUS=1
fi

if [ "$STATUS" -eq 0 ]; then
  echo
  echo "--- STEP 2: Tests (pnpm --filter \"${WORKSPACE_NAME}\" run test) ---"
  if pnpm --filter "${WORKSPACE_NAME}" run test; then
    echo "✓ Tests passed for ${WORKSPACE_NAME}"
  else
    echo "✗ Tests FAILED for ${WORKSPACE_NAME}"
    STATUS=1
  fi
else
  echo
  echo "--- STEP 2: Tests skipped because lint failed ---"
fi

echo
if [ "$STATUS" -eq 0 ]; then
  echo "=== DASHBOARD V2 SANITY CHECK: SUCCESS ==="
else
  echo "=== DASHBOARD V2 SANITY CHECK: FAILED ==="
fi

exit "$STATUS"

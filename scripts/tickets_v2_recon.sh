#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — TICKETS V2 RECON (READ-ONLY) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "--- Dashboard tree (pages + layouts + styles) ---"
ls -R apps/dashboard/src/pages || true
echo
ls -R apps/dashboard/src/layouts || true
echo
ls -R apps/dashboard/src/styles || true
echo

echo "--- TICKETS PAGE: apps/dashboard/src/pages/Tickets.tsx (head) ---"
if [ -f apps/dashboard/src/pages/Tickets.tsx ]; then
  sed -n '1,220p' apps/dashboard/src/pages/Tickets.tsx
else
  echo "MISSING: apps/dashboard/src/pages/Tickets.tsx"
fi
echo

echo "--- TICKETS PAGE: apps/dashboard/src/pages/Tickets.tsx (tail) ---"
if [ -f apps/dashboard/src/pages/Tickets.tsx ]; then
  sed -n '221,520p' apps/dashboard/src/pages/Tickets.tsx
fi
echo

echo "--- EXECUTION SHELL: apps/dashboard/src/layouts/ExecutionShell.tsx ---"
if [ -f apps/dashboard/src/layouts/ExecutionShell.tsx ]; then
  sed -n '1,260p' apps/dashboard/src/layouts/ExecutionShell.tsx
else
  echo "MISSING: apps/dashboard/src/layouts/ExecutionShell.tsx"
fi
echo

echo "--- A2 TOKENS: apps/dashboard/src/index.css ---"
if [ -f apps/dashboard/src/index.css ]; then
  sed -n '1,260p' apps/dashboard/src/index.css
else
  echo "MISSING: apps/dashboard/src/index.css"
fi
echo

echo "--- A2 LAYOUT STYLES: apps/dashboard/src/styles/a2.css (head) ---"
if [ -f apps/dashboard/src/styles/a2.css ]; then
  sed -n '1,260p' apps/dashboard/src/styles/a2.css
else
  echo "MISSING: apps/dashboard/src/styles/a2.css"
fi
echo

echo "--- DATA TABLE / BADGE / FILTERS (for reuse) ---"
if [ -f apps/dashboard/src/ui/DataTable.tsx ]; then
  echo "apps/dashboard/src/ui/DataTable.tsx (head):"
  sed -n '1,200p' apps/dashboard/src/ui/DataTable.tsx
  echo
fi

if [ -f apps/dashboard/src/ui/Badge.tsx ]; then
  echo "apps/dashboard/src/ui/Badge.tsx (head):"
  sed -n '1,160p' apps/dashboard/src/ui/Badge.tsx
  echo
fi

if [ -f apps/dashboard/src/ui/FiltersBar.tsx ]; then
  echo "apps/dashboard/src/ui/FiltersBar.tsx (head):"
  sed -n '1,200p' apps/dashboard/src/ui/FiltersBar.tsx
  echo
fi

echo "--- ROUTER/ENTRY: apps/dashboard/src/App.tsx (head) ---"
if [ -f apps/dashboard/src/App.tsx ]; then
  sed -n '1,220p' apps/dashboard/src/App.tsx
else
  echo "MISSING: apps/dashboard/src/App.tsx"
fi
echo

echo "--- TESTS: apps/dashboard/src/__tests__/Tickets.test.tsx (head) ---"
if [ -f apps/dashboard/src/__tests__/Tickets.test.tsx ]; then
  sed -n '1,260p' apps/dashboard/src/__tests__/Tickets.test.tsx
else
  echo "MISSING: apps/dashboard/src/__tests__/Tickets.test.tsx"
fi
echo

echo "--- DOCS: V2 CHANGELOG (head) ---"
if [ -f docs/PRISM_APEX_V2_CHANGELOG.md ]; then
  sed -n '1,200p' docs/PRISM_APEX_V2_CHANGELOG.md
else
  echo "MISSING: docs/PRISM_APEX_V2_CHANGELOG.md"
fi
echo

echo "--- DOCS: V2 BUILD AUDIT (Tickets-related region, if present) ---"
if [ -f docs/PRISM_APEX_V2_BUILD_AUDIT.md ]; then
  # Show a mid-section slice where Worklist/Tickets entries are likely to live
  sed -n '160,360p' docs/PRISM_APEX_V2_BUILD_AUDIT.md
else
  echo "MISSING: docs/PRISM_APEX_V2_BUILD_AUDIT.md"
fi
echo

echo "=== TICKETS V2 RECON COMPLETE ==="

#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – WORKLIST V2 VISUAL RECON (READ-ONLY) ==="
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "--- 1) Confirm key files exist ---"
for f in \
  apps/dashboard/src/index.css \
  apps/dashboard/src/styles/a2.css \
  apps/dashboard/src/layouts/ExecutionShell.tsx \
  apps/dashboard/src/pages/WorklistV2.tsx \
  apps/dashboard/src/main.tsx \
  apps/dashboard/src/App.tsx
do
  if [[ -f "$f" ]]; then
    echo "[OK] $f"
  else
    echo "[MISS] $f"
  fi
done
echo

echo "--- 2) Check that a2.css is actually imported ---"
if [[ -f apps/dashboard/src/index.css ]]; then
  echo ">>> apps/dashboard/src/index.css (top 80 lines)"
  echo "----------------------------------------------------------------"
  sed -n '1,80p' apps/dashboard/src/index.css
  echo
  echo ">>> Grep for a2.css imports"
  echo "----------------------------------------------------------------"
  rg --no-heading --line-number "a2\.css" apps/dashboard/src/index.css || echo "No explicit a2.css import found in index.css"
  echo
fi

echo "--- 3) Dump a2.css shell + table styles (first 200 lines) ---"
if [[ -f apps/dashboard/src/styles/a2.css ]]; then
  echo ">>> apps/dashboard/src/styles/a2.css (top 200 lines)"
  echo "----------------------------------------------------------------"
  sed -n '1,200p' apps/dashboard/src/styles/a2.css
  echo
fi

echo "--- 4) ExecutionShell layout/header region ---"
if [[ -f apps/dashboard/src/layouts/ExecutionShell.tsx ]]; then
  echo ">>> apps/dashboard/src/layouts/ExecutionShell.tsx (top 220 lines)"
  echo "----------------------------------------------------------------"
  sed -n '1,220p' apps/dashboard/src/layouts/ExecutionShell.tsx
  echo

  echo ">>> Search for 'Operator Dashboard' / header markup"
  echo "----------------------------------------------------------------"
  rg --no-heading --line-number "Operator Dashboard|PRISM APEX|Worklist|Tickets|Markets|Analytics|System|Strategy Lab" \
    apps/dashboard/src/layouts/ExecutionShell.tsx || echo "No obvious header strings found in ExecutionShell.tsx"
  echo
fi

echo "--- 5) WorklistV2 header + layout region ---"
if [[ -f apps/dashboard/src/pages/WorklistV2.tsx ]]; then
  echo ">>> apps/dashboard/src/pages/WorklistV2.tsx (top 260 lines)"
  echo "----------------------------------------------------------------"
  sed -n '1,260p' apps/dashboard/src/pages/WorklistV2.tsx
  echo

  echo ">>> WorklistV2 layout markers (filters, table, details) ---"
  echo "----------------------------------------------------------------"
  rg --no-heading --line-number "Worklist|Live Signals|Signal Details|filters|table|detail" \
    apps/dashboard/src/pages/WorklistV2.tsx || echo "No obvious layout markers found in WorklistV2.tsx"
  echo
fi

echo "--- 6) Root app wiring (to confirm shell usage) ---"
for f in apps/dashboard/src/main.tsx apps/dashboard/src/App.tsx; do
  if [[ -f "$f" ]]; then
    echo ">>> $f (top 160 lines)"
    echo "----------------------------------------------------------------"
    sed -n '1,160p' "$f"
    echo
  fi
done

echo "=== RECON COMPLETE ==="
echo "Paste this entire output back into chat so we can generate a precise visual-fix patch without breaking your heuristics."

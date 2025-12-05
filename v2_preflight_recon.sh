#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PREFLIGHT RECON (READ-ONLY) ==="
echo

# 1) Confirm we’re in a git repo and show branch + cleanliness
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  echo "Repo root: $REPO_ROOT"
else
  echo "ERROR: Not inside a git repository."
  exit 1
fi
echo

echo "--- Git branch & status ---"
git rev-parse --abbrev-ref HEAD || true
echo
git status -sb || true
echo

echo "--- Check for Test branch (local & remote) ---"
echo "Local Test branch:"
git branch --list Test || true
echo
echo "Remote Test branch:"
git branch -r | grep 'origin/Test' || echo "origin/Test not found" 
echo

# 2) Docker status
echo "--- Docker status ---"
if command -v docker >/dev/null 2>&1; then
  docker info >/dev/null 2>&1 && echo "Docker: RUNNING (docker info ok)" || echo "Docker: INSTALLED but docker info failed (daemon not running?)"
else
  echo "Docker: NOT INSTALLED or not on PATH"
fi
echo

# 3) Repo structure – key apps and routes
cd "$REPO_ROOT"

echo "--- apps/ tree (top-level) ---"
ls -R apps 2>/dev/null || echo "apps/ directory not found"
echo

echo "--- Dashboard pages ---"
ls -R apps/dashboard/src/pages 2>/dev/null || echo "apps/dashboard/src/pages not found"
echo

echo "--- API routes ---"
ls -R apps/api/src/routes 2>/dev/null || echo "apps/api/src/routes not found"
echo

# 4) Canonical V2 docs metadata
echo "--- Canonical V2 docs (ls -l) ---"
for f in \
  docs/PRISM_APEX_V2_DASHBOARD_PLAN.md \
  docs/REPO_INDEX_V2.md \
  docs/DOCS_CLASSIFICATION_V2.md
do
  if [ -f "$f" ]; then
    echo "\$ ls -l $f"
    ls -l "$f"
  else
    echo "MISSING: $f"
  fi
  echo
done

echo "=== END PREFLIGHT RECON ==="

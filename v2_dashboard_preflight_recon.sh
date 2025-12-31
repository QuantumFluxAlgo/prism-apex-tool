#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 DASHBOARD PREFLIGHT RECON ==="
echo

# Ensure we are in the git repo root
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "--- Git status & branch ---"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'UNKNOWN')"
  echo "Current branch: $CURRENT_BRANCH"
  echo
  echo "Full git status:"
  git status
else
  echo "WARNING: Not inside a git repository."
fi
echo

echo "--- Check Docker daemon ---"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "Docker: RUNNING (docker info succeeded)"
  else
    echo "Docker: INSTALLED but NOT RUNNING or not accessible (docker info failed)"
  fi
else
  echo "Docker: NOT INSTALLED or not on PATH"
fi
echo

echo "--- Check presence of Test branch (local or remote) ---"
TEST_BRANCH_STATUS="absent"
if git show-ref --verify --quiet "refs/heads/Test"; then
  TEST_BRANCH_STATUS="local"
elif git ls-remote --exit-code --heads origin Test >/dev/null 2>&1; then
  TEST_BRANCH_STATUS="remote"
fi

case "$TEST_BRANCH_STATUS" in
  local)
    echo "Test branch: PRESENT locally (refs/heads/Test)"
    ;;
  remote)
    echo "Test branch: NOT local, but PRESENT on origin (origin/Test)"
    ;;
  *)
    echo "Test branch: NOT FOUND (neither local nor on origin)"
    ;;
esac
echo

echo "--- apps/ directory structure ---"
if [ -d "apps" ]; then
  ls -R apps || true
else
  echo "apps/ directory not found."
fi
echo

echo "--- Dashboard pages (apps/dashboard/src/pages) ---"
if [ -d "apps/dashboard/src/pages" ]; then
  ls -1 "apps/dashboard/src/pages" || true
else
  echo "apps/dashboard/src/pages not found."
fi
echo

echo "--- API routes (apps/api/src/routes) ---"
if [ -d "apps/api/src/routes" ]; then
  ls -R "apps/api/src/routes" || true
else
  echo "apps/api/src/routes not found."
fi
echo

echo "--- Canonical V2 docs metadata ---"
for DOC in \
  "docs/REPO_INDEX_V2.md" \
  "docs/DOCS_CLASSIFICATION_V2.md"
do
  echo "Inspecting: $DOC"
  if [ -f "$DOC" ]; then
    ls -l "$DOC"
  else
    echo "  -> MISSING"
  fi
  echo
done

echo "=== PREFLIGHT RECON COMPLETE ==="

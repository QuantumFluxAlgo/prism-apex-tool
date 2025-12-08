#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM-APEX PREFLIGHT RECON ==="

if ! git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "ERROR: Not inside a git repository."
  exit 1
fi

cd "$git_root"
echo "Repo root: $git_root"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
echo "Current git branch: $current_branch"

echo "Working tree: CLEAN"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree: DIRTY (uncommitted changes present)"
  echo "--- git status --short ---"
  git status --short || true
  echo "---------------------------"
fi

echo
echo "Checking Docker daemon..."
if docker info >/dev/null 2>&1; then
  echo "Docker: RUNNING"
else
  echo "Docker: NOT RUNNING or not accessible (docker info failed)."
fi

echo
echo "Checking for 'Test' branch (local or remote)..."
has_local_test_branch=false
has_remote_test_branch=false

if git show-ref --verify --quiet "refs/heads/Test"; then
  has_local_test_branch=true
fi

if git ls-remote --exit-code --heads origin Test >/dev/null 2>&1; then
  has_remote_test_branch=true
fi

echo "Local 'Test' branch:  $has_local_test_branch"
echo "Remote 'origin/Test': $has_remote_test_branch"

echo
echo "Listing apps/ ..."
if [ -d "apps" ]; then
  ls -la "apps"
else
  echo "WARNING: apps/ directory not found."
fi

echo
echo "Listing apps/dashboard/src/pages ..."
if [ -d "apps/dashboard/src/pages" ]; then
  ls -la "apps/dashboard/src/pages"
else
  echo "WARNING: apps/dashboard/src/pages directory not found."
fi

echo
echo "Listing apps/api/src/routes ..."
if [ -d "apps/api/src/routes" ]; then
  ls -la "apps/api/src/routes"
else
  echo "WARNING: apps/api/src/routes directory not found."
fi

echo
echo "Docs metadata:"
for f in \
  "docs/PRISM_APEX_V2_DASHBOARD_PLAN.md" \
  "docs/REPO_INDEX_V2.md" \
  "docs/DOCS_CLASSIFICATION_V2.md"
do
  echo
  echo "-> $f"
  if [ -e "$f" ]; then
    ls -l "$f"
  else
    echo "WARNING: File not found."
  fi
done

echo
echo "=== END PREFLIGHT RECON ==="

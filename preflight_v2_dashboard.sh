#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 DASHBOARD PREFLIGHT ==="
echo

# 1) Confirm repo root and branch
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "[FATAL] Not inside a git repo. cd into prism-apex-tool first."
  exit 1
fi

cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

echo "--- Git status / branch ---"
git status -sb || true
echo

# 2) Docker check
echo "--- Docker daemon check ---"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "Docker: OK (daemon responding)"
  else
    echo "Docker: INSTALLED but daemon NOT responding"
  fi
else
  echo "Docker: NOT INSTALLED or not on PATH"
fi
echo

# 3) Confirm Test branch exists (local or remote)
echo "--- Test branch presence ---"
if git show-ref --verify --quiet refs/heads/Test; then
  echo "Local branch 'Test' exists."
else
  echo "Local branch 'Test' does NOT exist."
fi

if git ls-remote --exit-code --heads origin Test >/dev/null 2>&1; then
  echo "Remote branch 'origin/Test' exists."
else
  echo "Remote branch 'origin/Test' does NOT exist."
fi
echo

# 4) Working tree cleanliness
echo "--- Working tree cleanliness ---"
if git diff --quiet && git diff --cached --quiet; then
  echo "Working tree: CLEAN (no unstaged or staged changes)."
else
  echo "Working tree: DIRTY (there are local changes)."
fi
echo

# 5) List key app directories
echo "--- apps/ ---"
ls -la apps || echo "apps/ missing"
echo

echo "--- apps/dashboard/src/pages ---"
ls -la apps/dashboard/src/pages 2>/dev/null || echo "apps/dashboard/src/pages missing"
echo

echo "--- apps/api/src/routes ---"
ls -la apps/api/src/routes 2>/dev/null || echo "apps/api/src/routes missing"
echo

# 6) Canonical docs metadata
echo "--- Canonical docs metadata ---"

for f in \
  docs/REPO_INDEX_V2.md \
  docs/DOCS_CLASSIFICATION_V2.md
 do
  echo "File: $f"
  if [ -f "$f" ]; then
    ls -la "$f"
  else
    echo "  [MISSING]"
  fi
  echo
done

echo "=== PREFLIGHT COMPLETE ==="

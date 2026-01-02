#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PREFLIGHT RECON ==="
echo

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"

if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: Not inside a git repository. cd into prism-apex-tool and re-run."
  exit 1
fi

cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo

echo "--- Git branch & status ---"
git rev-parse --abbrev-ref HEAD || true
echo
git status -sb || true
echo

echo "--- Docker daemon status ---"
if docker ps >/dev/null 2>&1; then
  echo "Docker: OK (daemon reachable)"
else
  echo "Docker: UNAVAILABLE (docker ps failed)"
fi
echo

echo "--- Test branch presence ---"
if git show-ref --verify --quiet refs/heads/Test; then
  echo "Local branch 'Test' exists."
elif git show-ref --verify --quiet refs/remotes/origin/Test; then
  echo "Remote branch 'origin/Test' exists (no local branch)."
else
  echo "WARNING: No local or remote 'Test' branch found."
fi
echo

echo "--- apps/ ---"
ls -R apps 2>/dev/null || echo "No apps/ directory found."
echo

echo "--- apps/dashboard/src/pages ---"
ls -R apps/dashboard/src/pages 2>/dev/null || echo "No dashboard pages directory found."
echo

echo "--- apps/api/src/routes ---"
ls -R apps/api/src/routes 2>/dev/null || echo "No API routes directory found."
echo

echo "--- Canonical docs metadata ---"
for f in \
  docs/PRISM_APEX_V2_MASTER_PLAN.md \
  docs/REPO_INDEX_V2.md \
  docs/DOCS_CLASSIFICATION_V2.md
do
  if [ -f "$f" ]; then
    echo
    echo "File: $f"
    ls -l "$f"
  else
    echo
    echo "MISSING: $f"
  fi
done

echo
echo "=== END PREFLIGHT RECON ==="

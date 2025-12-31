#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 DASHBOARD PREFLIGHT RECON ==="

if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  echo "ERROR: Not inside a git repository. cd into prism-apex-tool first."
  exit 1
fi

cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

echo "--- Git status ---"
git status -sb || true
echo

echo "--- Current branch ---"
git rev-parse --abbrev-ref HEAD || true
echo

echo "--- Test branch presence (local/remote) ---"
git branch --list Test || true
git branch -r | grep -E 'origin/Test' || true
echo

echo "--- Docker daemon check ---"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "Docker: OK (daemon reachable)"
  else
    echo "Docker: INSTALLED but daemon NOT reachable (start Docker Desktop or service)"
  fi
else
  echo "Docker: NOT INSTALLED or not on PATH"
fi
echo

echo "--- apps/ ---"
ls -la apps || true
echo

echo "--- apps/dashboard/src/pages ---"
ls -la apps/dashboard/src/pages || true
echo

echo "--- apps/api/src/routes ---"
ls -la apps/api/src/routes || true
echo

echo "--- Canonical V2 docs metadata ---"
for doc in \
  "docs/REPO_INDEX_V2.md" \
  "docs/DOCS_CLASSIFICATION_V2.md"
do
  if [ -f "$doc" ]; then
    echo
    echo "File: $doc"
    ls -la "$doc"
  else
    echo
    echo "File: $doc (MISSING)"
  fi
done

echo
printenv | sort

echo

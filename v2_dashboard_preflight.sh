#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 DASHBOARD PREFLIGHT (READ-ONLY) ==="
echo

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "ERROR: Not inside a git repository. cd into prism-apex-tool repo and re-run."
  exit 1
fi

cd "${REPO_ROOT}"

echo "Repo root: ${REPO_ROOT}"
echo

echo "--- Docker daemon check ---"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "Docker: OK (daemon reachable)"
  else
    echo "Docker: docker installed but daemon NOT reachable"
  fi
else
  echo "Docker: NOT INSTALLED or not on PATH"
fi
echo

echo "--- Git status / branch ---"
git rev-parse --abbrev-ref HEAD || true
echo

git status -sb || true
echo

echo "--- Test branch existence ---"
if git show-ref --verify --quiet refs/heads/Test; then
  echo "Local branch 'Test' exists."
else
  echo "Local branch 'Test' does NOT exist."
fi

if git ls-remote --heads origin Test >/dev/null 2>&1; then
  echo "Remote branch 'origin/Test' exists."
else
  echo "Remote branch 'origin/Test' does NOT exist."
fi
echo

echo "--- Top-level apps/ listing ---"
if [[ -d "apps" ]]; then
  ls -R apps || true
else
  echo "No apps/ directory found."
fi
echo

echo "--- apps/dashboard/src/pages snapshot ---"
if [[ -d "apps/dashboard/src/pages" ]]; then
  ls -1 apps/dashboard/src/pages || true
else
  echo "apps/dashboard/src/pages not found."
fi
echo

echo "--- apps/api/src/routes snapshot ---"
if [[ -d "apps/api/src/routes" ]]; then
  ls -R apps/api/src/routes || true
else
  echo "apps/api/src/routes not found."
fi
echo

echo "--- Canonical docs metadata ---"
for f in \
  "docs/REPO_INDEX_V2.md" \
  "docs/DOCS_CLASSIFICATION_V2.md"
do
  if [[ -f "$f" ]]; then
    echo "File: $f"
    ls -l "$f"
    echo
  else
    echo "File missing: $f"
    echo
  fi
done

echo "=== PREFLIGHT COMPLETE ==="

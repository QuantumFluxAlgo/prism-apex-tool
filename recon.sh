#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PRE-FLIGHT RECON (READ-ONLY) ==="

if docker info >/dev/null 2>&1; then
  echo "[OK] Docker daemon reachable"
else
  echo "[FATAL] Docker daemon not reachable (start Docker Desktop or service)"
fi
echo

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "${REPO_ROOT}" ]; then
  echo "[FATAL] Not inside a git repository"
  exit 1
fi

cd "${REPO_ROOT}"
echo "Repo root: ${REPO_ROOT}"
echo

echo "--- Git status (short) ---"
git status -sb || true
echo

echo "--- Test branch presence (local + remote) ---"
echo "[local]"
git branch --list "Test" || true
echo
echo "[remote]"
git branch -r | grep "origin/Test" || true
echo

echo "--- apps/ tree ---"
ls -R apps || true
echo

echo "--- Dashboard pages ---"
ls apps/dashboard/src/pages || true
echo

echo "--- API routes ---"
ls -R apps/api/src/routes || true
echo

echo "--- Canonical V2 docs ---"
ls -l docs/REPO_INDEX_V2.md \
      docs/DOCS_CLASSIFICATION_V2.md 2>/dev/null || true
echo

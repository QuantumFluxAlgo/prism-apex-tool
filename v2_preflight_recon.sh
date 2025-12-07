#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 PREFLIGHT RECON ==="

# 1) Docker status
echo "--- Docker ---"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "[OK] Docker daemon is running."
  else
    echo "[WARN] Docker installed but 'docker info' failed (daemon not running?)."
  fi
else
  echo "[WARN] 'docker' command not found on PATH."
fi
echo

# 2) Git repo / branch / cleanliness
echo "--- Git ---"
if git rev-parse --git-dir >/dev/null 2>&1; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  echo "[OK] Git repo detected at: $REPO_ROOT"
  echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
  echo
  echo "Working tree status (short):"
  git status --short || true
  echo

  echo "Checking for 'Test' branch (local or remote)..."
  if git show-ref --verify --quiet refs/heads/Test; then
    echo "[OK] Local branch 'Test' exists."
  elif git show-ref --verify --quiet refs/remotes/origin/Test; then
    echo "[OK] Remote branch 'origin/Test' exists (no local tracking branch)."
  else
    echo "[WARN] No local or remote 'Test' branch found."
  fi
else
  echo "[ERROR] Not inside a git repository."
fi
echo

# 3) Structure: apps and key routes/pages
echo "--- apps/ (recursive) ---"
ls -R apps || true
echo

echo "--- apps/dashboard/src/pages (recursive) ---"
ls -R apps/dashboard/src/pages || true
echo

echo "--- apps/api/src/routes (recursive) ---"
ls -R apps/api/src/routes || true
echo

# 4) Canonical doc metadata
echo "--- Canonical V2 docs (ls -l) ---"
for f in \
  docs/PRISM_APEX_V2_DASHBOARD_PLAN.md \
  docs/REPO_INDEX_V2.md \
  docs/DOCS_CLASSIFICATION_V2.md
 do
  echo
  echo "File: $f"
  ls -l "$f" 2>/dev/null || echo "[WARN] Missing: $f"
 done

echo
echo "=== END PREFLIGHT RECON ==="

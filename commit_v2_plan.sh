#!/usr/bin/env bash

echo "=== PRISM APEX – Commit V2 Dashboard Plan Doc ==="

# Force bash semantics even if invoked from zsh
if ! command -v git >/dev/null 2>&1; then
  echo "❌ git not found on PATH."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not inside a git repository. cd into prism-apex-tool first."
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}"
echo "Repo root: ${REPO_ROOT}"

PLAN_FILE="docs/PRISM_APEX_V2_DASHBOARD_PLAN.md"

if [ ! -f "${PLAN_FILE}" ]; then
  echo "❌ Plan file does not exist: ${PLAN_FILE}"
  exit 1
fi

echo
echo "Staging plan file…"
git add "${PLAN_FILE}"

echo
echo "=== STAGED CHANGES ==="
git status --short

echo
printf "Commit these staged changes? (y/N) "
read CONFIRM

if [ "${CONFIRM}" != "y" ] && [ "${CONFIRM}" != "Y" ]; then
  echo "❌ Commit cancelled."
  exit 0
fi

MSG="Add V2 Dashboard Productionisation Plan (PRISM_APEX_V2_DASHBOARD_PLAN.md)"
git commit -m "${MSG}"

echo
echo "=== COMMIT COMPLETE ==="
git log -1 --oneline --decorate

echo
echo "You may now 'git push' to update the branch on GitHub."
echo "====================================================="

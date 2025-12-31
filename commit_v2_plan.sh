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
echo
echo "⚠️  The dedicated dashboard plan document has been retired."
echo "    Update 'docs/REPO_INDEX_V2.md' and 'docs/UPGRADE_DASHBOARD.md' directly."
echo "    This helper no longer stages or commits anything."
exit 0

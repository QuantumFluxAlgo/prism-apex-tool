#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 A3 DASHBOARD CODEX TERMINAL ==="

ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

echo "Repo root: $ROOT"
mkdir -p reports/v2
mkdir -p docs

# -------------------------------------------------------------------
# 0. Sanity checks – use existing repo outputs where possible
# -------------------------------------------------------------------

if [[ ! -f "full_files_list.json" ]]; then
  echo "[WARN] full_files_list.json missing. Prefer reusing it if available (deep scan output)."
else
  echo "[OK] full_files_list.json present (will be used as canonical inventory)."
fi

if [[ ! -f "backend_dependency_graph.json" ]]; then
  echo "[WARN] backend_dependency_graph.json missing."
else
  echo "[OK] backend_dependency_graph.json present."
fi

if [[ ! -f "frontend_dependency_graph.json" ]]; then
  echo "[WARN] frontend_dependency_graph.json missing."
else
  echo "[OK] frontend_dependency_graph.json present."
fi

# -------------------------------------------------------------------
# 1. A3 Dashboard Surfaces Playbook – styling + layouts per page
# -------------------------------------------------------------------
PLAYBOOK_A3="docs/V2_A3_DASHBOARD_SURFACES_PLAYBOOK.md"

if [[ -f "$PLAYBOOK_A3" ]]; then
  echo "[SKIP] A3 dashboard playbook already exists: $PLAYBOOK_A3"
else
  echo "[WRITE] Creating A3 dashboard playbook: $PLAYBOOK_A3"
  cat <<'__PLAYBOOK__' > "$PLAYBOOK_A3"
# Prism-Apex – V2 A3 Dashboard Surfaces Playbook
...
__PLAYBOOK__
fi
# ... rest of provided script ...

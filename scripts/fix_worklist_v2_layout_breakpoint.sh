#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – FIX WORKLIST V2 LAYOUT BREAKPOINT ==="

CSS_FILE="apps/dashboard/src/styles/a2.css"
if [ ! -f "$CSS_FILE" ]; then
  echo "ERROR: ${CSS_FILE} not found. Run from repo root."
  exit 1
fi

TS="$(date +%Y%m%d%H%M%S)"
BACKUP="${CSS_FILE}.bak.${TS}"

echo "--- Backing up ${CSS_FILE} to ${BACKUP} ---"
cp "$CSS_FILE" "$BACKUP"

python <<'PY'
from pathlib import Path

path = Path("apps/dashboard/src/styles/a2.css")
src = path.read_text()

old = "@media (max-width: 1280px) {"
new = "@media (max-width: 1024px) {"

if old not in src and new not in src:
    raise SystemExit("Expected layout-two breakpoint not found in a2.css")

src = src.replace(old, new)

path.write_text(src)
PY

echo "--- Breakpoint updated to 1024px ---"
echo "Backup: ${BACKUP}"

if [ -x "./scripts/dashboard_v2_sanity_check.sh" ]; then
  echo "--- Running dashboard sanity check ---"
  ./scripts/dashboard_v2_sanity_check.sh || {
    echo "WARN: dashboard_v2_sanity_check.sh exited non-zero; inspect above logs."
  }
else
  echo "NOTE: ./scripts/dashboard_v2_sanity_check.sh not found or not executable; skipping."
fi

echo "=== DONE – reload /worklist-v2 in your browser (hard refresh) ==="

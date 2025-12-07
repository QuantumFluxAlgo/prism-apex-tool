#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – PHASE 1 HOTFIX: RESTORE ANALYTICS FROM ZIP SNAPSHOT ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

ZIP_FILE="prism-apex-tool-feat-remove-pnl-beta-banner-v2-audit.zip"

echo
echo "Repo root: $REPO_ROOT"
echo "ZIP file:  $ZIP_FILE"
echo

if [ ! -f "$ZIP_FILE" ]; then
  echo "[ERROR] ZIP file '$ZIP_FILE' not found at repo root."
  echo "        Make sure the audit ZIP is present, or adjust the script to point at the correct path."
  exit 1;
fi

echo "=== GIT STATUS (BEFORE) ==="
git status -sb || true
echo

echo "=== STEP 1: Backup current Analytics.tsx (for safety) ==="
ANALYTICS_PATH="apps/dashboard/src/pages/Analytics.tsx"
BACKUP_SUFFIX="$(date +%Y%m%d-%H%M%S)"
if [ -f "$ANALYTICS_PATH" ]; then
  BACKUP_PATH="${ANALYTICS_PATH}.bad-date-dep.${BACKUP_SUFFIX}"
  cp "$ANALYTICS_PATH" "$BACKUP_PATH"
  echo "Backed up current Analytics.tsx to: $BACKUP_PATH"
else
  echo "[WARN] $ANALYTICS_PATH not found before restore; no pre-restore backup created."
fi
echo

echo "=== STEP 2: Restore Analytics.tsx from ZIP snapshot ==="
unzip -p "$ZIP_FILE" "apps/dashboard/src/pages/Analytics.tsx" > "$ANALYTICS_PATH"
echo "Restored apps/dashboard/src/pages/Analytics.tsx from ZIP."
echo

echo "=== STEP 3: Restore apply_v2_analytics_surface.sh from ZIP snapshot ==="
APPLY_SCRIPT_PATH="scripts/apply_v2_analytics_surface.sh"
unzip -p "$ZIP_FILE" "scripts/apply_v2_analytics_surface.sh" > "$APPLY_SCRIPT_PATH"
chmod +x "$APPLY_SCRIPT_PATH"
echo "Restored scripts/apply_v2_analytics_surface.sh from ZIP and made it executable."
echo

echo "=== STEP 4: Run dashboard V2 sanity check ==="
if [ -x "./scripts/dashboard_v2_sanity_check.sh" ]; then
  ./scripts/dashboard_v2_sanity_check.sh || echo "[WARN] Sanity check failed – inspect output above."
else
  echo "[WARN] ./scripts/dashboard_v2_sanity_check.sh not found; skipping."
fi

echo
echo "=== GIT STATUS (AFTER) ==="
git status -sb || true

echo
echo "=== DIFF STAT (AFTER) ==="
git diff --stat || true

echo
echo "=== PHASE 1 HOTFIX (ZIP RESTORE) COMPLETE ==="

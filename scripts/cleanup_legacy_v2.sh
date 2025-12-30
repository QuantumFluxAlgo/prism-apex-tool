#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – V2 LEGACY CLEANUP ==="
echo
DELETE_MODE="${DELETE_MODE:-archive}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo "Delete mode: $DELETE_MODE"
echo

if [ ! -d "apps/dashboard/src" ] || [ ! -d "apps/api/src" ]; then
  echo "ERROR: This does not look like the prism-apex-tool repo root."
  echo "       Expected apps/dashboard/src and apps/api/src to exist."
  exit 1
fi

timestamp="$(date +%Y%m%d_%H%M%S)"
ARCHIVE_ROOT="archive/legacy_cleanup/$timestamp"

mkdir -p "$ARCHIVE_ROOT"

move_or_delete() {
  local path="$1"

  if [ ! -e "$path" ]; then
    echo "[skip]   $path (not found)"
    return 0
  fi

  if [ "$DELETE_MODE" = "hard" ]; then
    echo "[rm]     $path"
    rm -rf "$path"
  else
    local dest_dir="$ARCHIVE_ROOT/$(dirname "$path")"
    mkdir -p "$dest_dir"
    echo "[archive] $path -> $dest_dir/"
    mv "$path" "$dest_dir/"
  fi
}

echo "--- Cleaning legacy Worklist & sync glue ---"
move_or_delete "apps/dashboard/src/pages/Worklist.tsx"
move_or_delete "apps/dashboard/src/__tests__/WorklistPnLColumns.test.tsx"
move_or_delete "apps/dashboard/src/test/WorklistPnLColumns.test.tsx"
move_or_delete "apps/dashboard/src/pages/WorklistV2.legacy.tsx"
move_or_delete "pages/WorklistV2.legacy.tsx"
move_or_delete "packages/rules-apex/src/legacy.ts"
move_or_delete "scripts/sync_worklist_v2_to_legacy.sh"
move_or_delete "sync_worklist_v2_to_legacy.sh"

echo
echo "--- Cleaning dashboard sandbox pages & tests ---"
move_or_delete "apps/dashboard/src/pages/DemoPnL.tsx"
move_or_delete "apps/dashboard/src/test/DemoPnL.test.tsx"
move_or_delete "apps/dashboard/src/__tests__/DemoPnL.test.tsx"
move_or_delete "apps/dashboard/src/pages/Downloads.tsx"
move_or_delete "apps/dashboard/src/test/Downloads.test.tsx"
move_or_delete "apps/dashboard/src/__tests__/Downloads.test.tsx"
move_or_delete "apps/dashboard/src/pages/Placeholder.tsx"
move_or_delete "apps/dashboard/src/test/Placeholder.test.tsx"
move_or_delete "apps/dashboard/src/__tests__/Placeholder.test.tsx"
move_or_delete "apps/dashboard/src/pages/Reports.tsx"
move_or_delete "apps/dashboard/src/test/Reports.test.tsx"
move_or_delete "apps/dashboard/src/__tests__/Reports.test.tsx"
move_or_delete "apps/dashboard/src/pages/StrategyConfig.tsx"
move_or_delete "apps/dashboard/src/test/StrategyConfig.test.tsx"
move_or_delete "apps/dashboard/src/__tests__/StrategyConfig.test.tsx"

echo
echo "--- Cleaning Worklist static prototype (mock) ---"
move_or_delete "worklist-mock"
move_or_delete "generate_worklist_mock.sh"
move_or_delete "scripts/generate_worklist_mock.sh"

echo
echo "=== SUMMARY ==="
if [ "$DELETE_MODE" = "hard" ]; then
  echo "All found targets were HARD-DELETED."
else
  echo "All found targets were MOVED under: $ARCHIVE_ROOT"
  echo "Review then hard-delete later with:"
  echo "  rm -rf \"$ARCHIVE_ROOT\""
fi

echo "Done."

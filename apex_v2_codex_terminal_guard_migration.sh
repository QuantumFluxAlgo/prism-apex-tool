#!/usr/bin/env bash
set -euo pipefail

# PRISM APEX – V2 RULES ENGINE / GUARD MIGRATION ORCHESTRATOR
#
# Purpose:
#   Guide Codex Terminal + engineers to migrate API guard logic from the legacy
#   @prism-apex/rules-apex exports (evaluateTicket, withinSuppressionWindow,
#   TicketInput, suggestPercent) to the NEW rules engine APIs, without
#   resurrecting deprecated code.
#
# This script DOES NOT apply TypeScript changes itself.
# It creates playbooks + work items that tightly constrain what Codex Terminal
# should inspect and change.

echo "=== PRISM APEX – V2 GUARD / RULES ENGINE MIGRATION ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

mkdir -p docs reports/v2

# ------------------------------------------------------------------------------
# 0. Sanity checks – make sure key paths exist
# ------------------------------------------------------------------------------

echo "--- Sanity checks ---"

check_path() {
  local label="$1"
  local path="$2"
  if [[ -e "$path" ]]; then
    echo "[OK] $label: $path"
  else
    echo "[WARN] $label missing: $path"
  fi
}

check_path "rules-apex index" "packages/rules-apex/src/index.ts"
check_path "rules-apex types" "packages/rules-apex/src/types.ts"
check_path "rules-apex applyGuards" "packages/rules-apex/src/applyGuards.ts"
check_path "rules-apex config" "packages/rules-apex/src/config.ts"
check_path "API guard adapter" "apps/api/src/lib/guard.ts"
check_path "API routes dir" "apps/api/src/routes"
check_path "rules-apex tests dir (optional)" "packages/rules-apex/test"
check_path "API tests dir (optional)" "apps/api/test"

echo

# ------------------------------------------------------------------------------
# 1. Create GUARD MIGRATION PLAYBOOK
# ------------------------------------------------------------------------------

PLAYBOOK="docs/V2_RULES_ENGINE_MIGRATION_PLAYBOOK.md"

cat > "$PLAYBOOK" <<'__PLAYBOOK__'
# V2 Rules Engine / Guard Migration Playbook
## Objective
...
__PLAYBOOK__

echo "[WRITE] Guard migration playbook: $PLAYBOOK"

# ------------------------------------------------------------------------------
# 2. Create a focused work-items list for Codex Terminal
# ------------------------------------------------------------------------------

WORK_ITEMS="reports/v2/guard_migration_work_items.md"

cat > "$WORK_ITEMS" <<'__WORK__'
# Guard / Rules Engine Migration – Concrete Work Items
...
__WORK__

echo "[WRITE] Guard migration work items: $WORK_ITEMS"

# ------------------------------------------------------------------------------
# 3. Append note to suspicious/deletion list (forward-looking)
# ------------------------------------------------------------------------------

SUSPICIOUS="reports/codebase-cleanup-suspicious.txt"
if [[ -f "$SUSPICIOUS" ]]; then
  cat >> "$SUSPICIOUS" <<'__SUSPICIOUS__'

9. Legacy guard expectations in apps/api/src/lib/guard.ts
   - API still expects @prism-apex/rules-apex to export evaluateTicket,
     withinSuppressionWindow, TicketInput, suggestPercent.
   - DO NOT reintroduce these exports by copy/pasting archived code.
   - Instead, migrate guard.ts to use the new rules engine entrypoints as
     defined in packages/rules-apex/src/index.ts and applyGuards.ts.
   - Once migration is complete and no code references these names, consider
     removing any lingering legacy guard types / helpers.

__SUSPICIOUS__
  echo "[APPEND] Updated suspicious/deletion list: $SUSPICIOUS"
else
  echo "[WARN] Suspicious/deletion list not found: $SUSPICIOUS (skipped append)"
fi

# ------------------------------------------------------------------------------
# 4. Summary
# ------------------------------------------------------------------------------

echo
echo "=== SUMMARY ==="
echo "Guard migration playbook:    $PLAYBOOK"
echo "Guard migration work items:  $WORK_ITEMS"
if [[ -f "$SUSPICIOUS" ]]; then
  echo "Suspicious list updated:     $SUSPICIOUS"
else
  echo "Suspicious list:             not present (no update)"
fi

echo
echo "NEXT (Codex Terminal / engineers):"
echo "  1) Use docs/V2_RULES_ENGINE_MIGRATION_PLAYBOOK.md to understand the target."
echo "  2) Work through reports/v2/guard_migration_work_items.md in order."
echo "  3) Migrate apps/api/src/lib/guard.ts and API routes to the new rules engine."
echo "  4) Update tests to match the new guard behaviour (no legacy exports)."
echo
echo "Done."

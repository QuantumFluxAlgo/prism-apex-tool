#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — FIX DASHBOARD LINT SCRIPT (REMOVE --if-present) ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

DASHBOARD_PKG_JSON="$REPO_ROOT/apps/dashboard/package.json"

print_error() {
  echo "ERROR: $1" >&2
}

echo
echo "--- Context ---"
echo "Repo root:              $REPO_ROOT"
echo "Dashboard package.json: $DASHBOARD_PKG_JSON"
echo

if [ ! -f "$DASHBOARD_PKG_JSON" ]; then
  print_error "apps/dashboard/package.json not found. Aborting."
  exit 1
fi

TS="$(date +%Y%m%d%H%M%S)"
BACKUP_PATH="$DASHBOARD_PKG_JSON.bak.$TS"
cp "$DASHBOARD_PKG_JSON" "$BACKUP_PATH"
echo "✓ Backup created: $BACKUP_PATH"
echo

echo "--- Step 1: Inspect current lint script ---"

node <<'NODE'
const fs = require("fs");
const path = require("path");
const pkgPath = path.join(process.cwd(), "apps", "dashboard", "package.json");
const pkgRaw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(pkgRaw);

if (!pkg.scripts || !pkg.scripts.lint) {
  console.log("INFO: No 'lint' script defined in apps/dashboard/package.json; nothing to change.");
  process.exit(0);
}

const before = String(pkg.scripts.lint);
console.log("Current lint script:");
console.log("  " + before);
const after = before.replace(/\s+--if-present\b/g, "");

if (before === after) {
  console.log("\nINFO: lint script does not contain '--if-present'; no modification required.");
  process.exit(0);
}

pkg.scripts.lint = after;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("\n✓ Updated lint script in apps/dashboard/package.json");
console.log("  BEFORE: " + before);
console.log("  AFTER:  " + after);
NODE

echo
echo "=== DONE: Dashboard lint script normalised (backup kept alongside package.json) ==="
echo "Next: run ./scripts/dashboard_v2_sanity_check.sh and review lint/test results."

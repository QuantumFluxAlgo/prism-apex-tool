#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – PHASE 2: REPO INDEX + CHANGELOG BASELINE ==="
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo
echo "Repo root: $REPO_ROOT"
echo

echo "=== GIT STATUS (BEFORE) ==="
git status -sb || true
echo

# --------------------------------------------------------------------
# STEP 1 – Update docs/REPO_INDEX_V2.md to drop _codex_write_test.ts
# --------------------------------------------------------------------
REPO_INDEX_PATH="docs/REPO_INDEX_V2.md"

if [ -f "$REPO_INDEX_PATH" ]; then
  echo "=== STEP 1: Updating $REPO_INDEX_PATH (remove _codex_write_test.ts) ==="
  node <<'NODE'
    const fs = require('fs');
    const path = require('path');

    const repoRoot = process.cwd();
    const repoIndexPath = path.join(repoRoot, 'docs', 'REPO_INDEX_V2.md');

    if (!fs.existsSync(repoIndexPath)) {
      console.log('REPO_INDEX_V2.md not found; skipping.');
      process.exit(0);
    }

    const original = fs.readFileSync(repoIndexPath, 'utf8');
    const codexLinePattern = /^_codex_write_test\.ts.*\n/m;

    if (!codexLinePattern.test(original)) {
      console.log('REPO_INDEX_V2.md already does not mention _codex_write_test.ts; no change.');
      process.exit(0);
    }

    const updated = original.replace(codexLinePattern, '');
    fs.writeFileSync(repoIndexPath, updated);
    console.log('Removed _codex_write_test.ts from REPO_INDEX_V2.md.');
NODE
else
  echo "WARN: $REPO_INDEX_PATH not found; skipping REPO index update."
fi

echo

# --------------------------------------------------------------------
# STEP 2 – Update CHANGELOG.md with Analytics + cleanup bullet
# --------------------------------------------------------------------
CHANGELOG_PATH="CHANGELOG.md"

if [ -f "$CHANGELOG_PATH" ]; then
  echo "=== STEP 2: Updating $CHANGELOG_PATH ([Unreleased] – Analytics V2 & cleanup) ==="
  node <<'NODE'
    const fs = require('fs');
    const path = require('path');

    const repoRoot = process.cwd();
    const changelogPath = path.join(repoRoot, 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) {
      console.log('CHANGELOG.md not found; skipping.');
      process.exit(0);
    }

    const original = fs.readFileSync(changelogPath, 'utf8');

    const markerLine =
      'Docs: establish A2 UI design system and align V2 dashboard pla...dex/classification for EPIC V2.6 (A2 UI Polish & Consistency).';

    const newLine =
      'Dashboards: pin Analytics V2 surface, add scripts/apply_v2_analytics_surface.sh, ' +
      'and remove legacy dashboard backup files and apps/api/src/routes/_codex_write_test.ts.';

    if (original.includes(newLine)) {
      console.log('CHANGELOG.md already contains Analytics V2 + cleanup entry; no change.');
      process.exit(0);
    }

    if (!original.includes(markerLine)) {
      console.log('WARN: Expected marker line not found in CHANGELOG.md; skipping insert to avoid corrupting history.');
      process.exit(0);
    }

    const updated = original.replace(
      markerLine + '\n',
      markerLine + '\n' + newLine + '\n'
    );

    fs.writeFileSync(changelogPath, updated);
    console.log('Inserted Analytics V2 + cleanup bullet into [Unreleased].');
NODE
else
  echo "WARN: $CHANGELOG_PATH not found; skipping changelog update."
fi

echo

# --------------------------------------------------------------------
# STEP 3 – Run dashboard V2 sanity check (docs only, but keeps us honest)
# --------------------------------------------------------------------
if [ -x "./scripts/dashboard_v2_sanity_check.sh" ]; then
  echo "=== STEP 3: Running dashboard V2 sanity check ==="
  ./scripts/dashboard_v2_sanity_check.sh || echo "[WARN] Sanity check reported issues; inspect output above."
else
  echo "NOTE: ./scripts/dashboard_v2_sanity_check.sh not found or not executable; skipping sanity check."
fi

echo

# --------------------------------------------------------------------
# STEP 4 – Show final git status and diffstat
# --------------------------------------------------------------------
echo "=== GIT STATUS (AFTER) ==="
git status -sb || true
echo

echo "=== DIFF STAT (AFTER) ==="
git diff --stat || true

echo
echo "=== PHASE 2 REPO INDEX + CHANGELOG BASELINE COMPLETE ==="

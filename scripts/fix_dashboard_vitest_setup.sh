#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — FIX DASHBOARD VITEST SETUP ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

SETUP_PATH="apps/dashboard/src/__tests__/setup.ts"

if [ ! -f "$SETUP_PATH" ]; then
  echo "✗ ERROR: $SETUP_PATH not found. Aborting."
  exit 1
fi

TS_SUFFIX="$(date +%Y%m%d%H%M%S)"
BACKUP_PATH="${SETUP_PATH}.bak.${TS_SUFFIX}"

echo "--- Backing up existing setup.ts to ${BACKUP_PATH} ---"
cp "$SETUP_PATH" "$BACKUP_PATH"

echo "--- Rewriting Vitest setup to use vitest + RTL matchers ---"
cat > "$SETUP_PATH" << 'TS'
/**
 * PRISM APEX — Dashboard Vitest setup
 *
 * Vitest + React Testing Library + jest-dom matchers.
 * This file is loaded by Vitest as the test setup entrypoint.
 */

import { expect, afterEach } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Ensure React Testing Library cleans up between tests
afterEach(() => {
  cleanup();
});
TS

echo "Updated: $SETUP_PATH"
echo "Backup:  $BACKUP_PATH"
echo
echo "=== Re-running dashboard V2 sanity check ==="
if [ -x "scripts/dashboard_v2_sanity_check.sh" ]; then
  ./scripts/dashboard_v2_sanity_check.sh
else
  echo "NOTE: scripts/dashboard_v2_sanity_check.sh not found or not executable."
fi

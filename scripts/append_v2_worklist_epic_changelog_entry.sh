#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX — APPEND V2 WORKLIST EPIC CHANGELOG ENTRY ==="

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"
echo "Repo root: $REPO_ROOT"
echo

CHANGELOG_PATH="docs/PRISM_APEX_V2_CHANGELOG.md"

if [ ! -f "$CHANGELOG_PATH" ]; then
  echo "--- Creating V2 changelog at $CHANGELOG_PATH ---"
  cat > "$CHANGELOG_PATH" << 'HDR'
# Prism Apex V2 — Changelog

This document tracks epic-level changes for the V2 dashboard surfaces and supporting tooling.
HDR
  echo >> "$CHANGELOG_PATH"
fi

TS_DATE="$(date +%Y-%m-%d)"
TS_TIME="$(date +%H:%M:%S)"

echo "--- Appending Worklist V2 + Dashboard QA entry ---"
cat >> "$CHANGELOG_PATH" << EOF2

## [$TS_DATE] EPIC V2.1 — Worklist V2 Operator Surface & Dashboard QA

**Summary**

- Worklist V2 is now running inside the hardened `ExecutionShell` with A2 tokens, operator-friendly layout, and canonical ticket/session metrics wiring.
- Dashboard QA flow is codified via a single sanity script that runs scoped lint + tests for the dashboard workspace.
- Vitest + RTL are correctly wired so tests run under Vitest (no more Jest-style setup failures).

**Worklist V2**

- `apps/dashboard/src/pages/WorklistV2.tsx`:
  - Wrapped in `<ExecutionShell activeTab="worklist">` so the operator view sits inside the A2 shell/tabs.
  - Retains the score/strength/risk heuristics and canonical ticket/session metrics enrichment.
  - Uses the A2-styled filters bar, table, and “Signal Details” panel to mirror the A2 mock.
- Supporting docs and automation:
  - `docs/PRISM_APEX_V2_BUILD_AUDIT.md` extended with:
    - Shell integration note for Worklist V2.
    - “Operator Worklist V2 — Implementation Snapshot” section.
  - `scripts/apply_worklist_v2_execution_shell_wrap.sh`:
    - Backs up the page, applies the ExecutionShell-ready implementation, and appends an audit log entry.
  - `scripts/append_worklist_v2_operator_summary.sh`:
    - Re-appends the operator-focused Worklist summary into the audit doc on demand.
  - `v2_preflight_recon.sh`:
    - Provides a read-only snapshot (git/Docker status + key tree listings) for preflight checks.

**Dashboard QA Tooling**

- `scripts/dashboard_v2_sanity_check.sh`:
  - Auto-detects the dashboard workspace name (e.g. `prism-apex-dashboard`).
  - Runs scoped `pnpm run lint` and `pnpm run test` for the dashboard only.
  - Emits a concise summary of lint/test outcomes for operator review.
- `scripts/fix_dashboard_lint_script.sh`:
  - Guards against invalid `--if-present` forwarding into ESLint when using the legacy `ESLINT_USE_FLAT_CONFIG=false` mode.
- `scripts/fix_dashboard_vitest_setup.sh`:
  - Rewrites the Vitest setup helper and triggers a refresh sanity run.

**Vitest + React Testing Library**

- `apps/dashboard/src/__tests__/setup.ts`:
  - Now uses the Vitest-compatible setup:
    - imports `expect` and lifecycle hooks from `vitest`;
    - imports `@testing-library/jest-dom/vitest` and wires matchers;
    - hooks `cleanup()` after each test.
  - Removes legacy `@ts-nocheck` from the setup file itself.
- Individual dashboard tests (for example):
  - `App.test.tsx`
  - `Positions.test.tsx`
  - `WorklistPnLCell.test.tsx`
  - `WorklistPnLColumns.test.tsx`
  - `pnlDisplay.test.ts`
  - `Tickets.test.tsx`
  - No longer import `@testing-library/jest-dom` directly and assert against the simplified V2 Tickets UI instead of the legacy “SHORT toggle” behavior, where applicable.

**Resulting checks**

- `./scripts/dashboard_v2_sanity_check.sh`:
  - Delegates to `pnpm --filter prism-apex-dashboard run lint` and `pnpm --filter prism-apex-dashboard run test`.
  - Lint:
    - Passes, with **known** `@ts-nocheck` warnings in a small set of hard-waived dashboard files:
      - `apps/dashboard/src/components/AppErrorBoundary.tsx`
      - `apps/dashboard/src/components/ErrorBanner.tsx`
      - `apps/dashboard/src/pages/MarketData.tsx`
      - `apps/dashboard/src/pages/Tickets.tsx`
    - These are currently treated as V2 hardening waivers and are documented in the build audit.
  - Tests:
    - Vitest runs successfully with React Testing Library;
    - All dashboard suites pass, aside from expected React deprecation noise in the console.

**Notes / Debt**

- The remaining `@ts-nocheck` usage in the four dashboard files above is accepted as intentional technical debt for V2:
  - Resolution paths:
    - Add an explicit ESLint override + doc note for these waivers; or
    - Introduce a “Dashboard Type Hardening” sub-epic to restore proper typing and remove the waivers.
- No changes were made to execution or risk semantics as part of this epic; the work is UI + QA tooling only.

Recorded at: $TS_DATE $TS_TIME
EOF2

echo "=== DONE ==="
echo "Changelog updated: $CHANGELOG_PATH"

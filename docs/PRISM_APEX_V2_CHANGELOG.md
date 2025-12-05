# Prism Apex V2 — Changelog

This document tracks epic-level changes for the V2 dashboard surfaces and supporting tooling.

## [2025-12-04] EPIC V2.1 — Worklist V2 Operator Surface & Dashboard QA

**Summary**

- Worklist V2 now renders inside the hardened `ExecutionShell` with A2 tokens, keeping all canonical ticket/session-metrics heuristics intact.
- Dashboard QA is reduced to a single sanity script that runs scoped lint + tests for the dashboard workspace.
- Vitest + RTL wiring is fixed so tests run under Vitest (no more Jest-style setup failures).

**Worklist V2**

- `apps/dashboard/src/pages/WorklistV2.tsx`
  - Wrapped with `<ExecutionShell activeTab="worklist">` and re-styled using the new A2 panel/layout classes.
  - Uses the A2-style filters bar, table shell, and detail panel that mirror the mock while preserving the existing score/risk logic.
- Supporting docs & automation
  - `docs/PRISM_APEX_V2_BUILD_AUDIT.md` records the shell integration and adds an “Operator Worklist V2 — Implementation Snapshot”.
  - `scripts/apply_worklist_v2_execution_shell_wrap.sh` backs up the page, applies the ExecutionShell-ready implementation, and appends the audit entry.
  - `scripts/append_worklist_v2_operator_summary.sh` re-appends the operator-facing summary on demand.
  - `v2_preflight_recon.sh` captures git/Docker status and key tree listings for preflight checks.

**Dashboard QA Tooling**

- `scripts/dashboard_v2_sanity_check.sh`
  - Auto-detects the dashboard workspace name (`prism-apex-dashboard`) and runs `pnpm --filter … run lint/test`.
  - Emits a concise pass/fail summary for operators.
- `scripts/fix_dashboard_lint_script.sh`
  - Guards against invalid `--if-present` forwarding into ESLint when the legacy `ESLINT_USE_FLAT_CONFIG=false` script is used.
- `scripts/fix_dashboard_vitest_setup.sh`
  - Rewrites the Vitest setup helper and re-runs the sanity script automatically.

**Vitest + React Testing Library**

- `apps/dashboard/src/__tests__/setup.ts`
  - Loads `@testing-library/jest-dom/vitest`, hooks RTL `cleanup()` via `afterEach`, and removes the legacy `@ts-nocheck`.
- Tests updated to match the simplified V2 UI:
  - `App.test.tsx`, `Positions.test.tsx`, `WorklistPnLCell.test.tsx`, `WorklistPnLColumns.test.tsx`, `pnlDisplay.test.ts`, `Tickets.test.tsx`.
  - Drop direct `@testing-library/jest-dom` imports and, where relevant, assert against the V2 tickets view (no legacy SHORT-toggle logic).

**Resulting checks**

- `./scripts/dashboard_v2_sanity_check.sh`
  - Lint: passes with **known** `@ts-nocheck` warnings for the four hard-waived dashboard files (`AppErrorBoundary.tsx`, `ErrorBanner.tsx`, `MarketData.tsx`, `Tickets.tsx`), which remain documented in the audit.
  - Tests: `vitest run` succeeds for all suites (React logs only emit the expected act()/router warnings).

**Notes / Debt**

- The four `@ts-nocheck` waivers above remain intentional V2 debt; follow-up options include ESLint overrides or a “Dashboard Type Hardening” sub-epic.
- Work in this epic touched UI + QA tooling only; no execution/risk semantics changed.

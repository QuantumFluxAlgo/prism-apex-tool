
---

## 10. Waiver Inventory (as of commit $COMMIT_SHA)

This section is generated from the codebase by scanning for:

- `// @ts-nocheck` in `apps/api/src` and `apps/dashboard/src`
- `/* eslint-disable */` in `apps/dashboard/src`

It represents the **effective** set of TS/ESLint waivers at this commit.

**API TypeScript waivers:**
- `apps/api/src/jobs/scheduler.ts`
- `apps/api/src/jobs/session-metrics/batch.ts`
- `apps/api/src/jobs/ticketizer.ts`
- `apps/api/src/routes/dto/canonicalTicketView.ts`
- `apps/api/src/routes/tickets.debug.ts`
- `apps/api/src/routes/tickets.ts`
- `apps/api/src/services/strategy-engine/index.ts`

**Dashboard TypeScript waivers:**
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/components/AccountStatus.tsx`
- `apps/dashboard/src/components/AlertsPanel.tsx`
- `apps/dashboard/src/components/RiskAuditPanel.tsx`
- `apps/dashboard/src/components/SystemStatus.tsx`
- `apps/dashboard/src/components/SystemTelemetryPanel.tsx`
- `apps/dashboard/src/components/TicketSizingPreview.tsx`
- `apps/dashboard/src/pages/Alerts.tsx`
- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/pages/MarketData.tsx`
- `apps/dashboard/src/pages/StrategyConfig.tsx`
- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/pages/Worklist.tsx`
- `apps/dashboard/src/pages/WorklistV2.tsx`

**Dashboard ESLint full-file waivers:**
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/components/AccountStatus.tsx`
- `apps/dashboard/src/components/AlertsPanel.tsx`
- `apps/dashboard/src/components/RiskAuditPanel.tsx`
- `apps/dashboard/src/components/SystemStatus.tsx`
- `apps/dashboard/src/components/SystemTelemetryPanel.tsx`
- `apps/dashboard/src/components/TicketSizingPreview.tsx`
- `apps/dashboard/src/pages/Alerts.tsx`
- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/pages/StrategyConfig.tsx`
- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/pages/Worklist.tsx`
- `apps/dashboard/src/pages/WorklistV2.tsx`
- `apps/dashboard/src/types/global.d.ts`

> When a file is refactored to remove a waiver, it should disappear from
> this inventory after re-running the scan. The goal post-V2 is for this
> section to be empty.

### WorklistV2.tsx – A2 ExecutionShell integration

- Date: 2025-12-04T19:43:59Z
- Change: Wrapped `WorklistV2Page` with `ExecutionShell` (active tab `worklist`) so the operator sees the Worklist inside the hardened V2 shell. Kept the canonical ticket/session-metrics wiring intact and retained the fallback mocks.
- Risk: UI-only change; no backend/API contract churn. Existing fetch helpers and mock data stay untouched so QA can continue using the same fixtures.

---

## 10. Waiver Inventory (as of commit c40dc12)

This section is generated from the codebase by scanning for:

- `// @ts-nocheck` in `apps/api/src` and `apps/dashboard/src`
- `/* eslint-disable */` in `apps/dashboard/src`

It represents the **effective** set of TS/ESLint waivers at this commit.

**API TypeScript waivers:**
- `apps/api/src/jobs/scheduler.ts`
- `apps/api/src/jobs/session-metrics/batch.ts`
- `apps/api/src/jobs/ticketizer.ts`
- `apps/api/src/routes/dto/canonicalTicketView.ts`
- `apps/api/src/routes/tickets.debug.ts`
- `apps/api/src/routes/tickets.ts`
- `apps/api/src/services/strategy-engine/index.ts`

**Dashboard TypeScript waivers:**
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/components/AccountStatus.tsx`
- `apps/dashboard/src/components/AlertsPanel.tsx`
- `apps/dashboard/src/components/RiskAuditPanel.tsx`
- `apps/dashboard/src/components/SystemStatus.tsx`
- `apps/dashboard/src/components/SystemTelemetryPanel.tsx`
- `apps/dashboard/src/components/TicketSizingPreview.tsx`
- `apps/dashboard/src/pages/Alerts.tsx`
- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/pages/MarketData.tsx`
- `apps/dashboard/src/pages/StrategyConfig.tsx`
- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/pages/Worklist.tsx`
- `apps/dashboard/src/pages/WorklistV2.tsx`

**Dashboard ESLint full-file waivers:**
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/components/AccountStatus.tsx`
- `apps/dashboard/src/components/AlertsPanel.tsx`
- `apps/dashboard/src/components/RiskAuditPanel.tsx`
- `apps/dashboard/src/components/SystemStatus.tsx`
- `apps/dashboard/src/components/SystemTelemetryPanel.tsx`
- `apps/dashboard/src/components/TicketSizingPreview.tsx`
- `apps/dashboard/src/pages/Alerts.tsx`
- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/pages/StrategyConfig.tsx`
- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/pages/Worklist.tsx`
- `apps/dashboard/src/pages/WorklistV2.tsx`
- `apps/dashboard/src/types/global.d.ts`

> When a file is refactored to remove a waiver, it should disappear from
> this inventory after re-running the scan. The goal post-V2 is for this
> section to be empty.

### WorklistV2.tsx – A2 ExecutionShell integration

- Date: 2025-12-04T19:49:29Z
- Change: Wrapped `WorklistV2Page` in `ExecutionShell` with `activeTab="worklist"` to align with the A2 Operator Dashboard shell. No changes to canonical ticket/session metrics contracts.
- Risk: UI-only, no backend/API contract changes. Existing mocks and `fetchWorklistCanonicalTickets` / `fetchSessionMetrics` usage preserved.

## Operator Worklist V2 — Implementation Snapshot

- **Worklist view** — `apps/dashboard/src/pages/WorklistV2.tsx:1` now mirrors the full V2 Entrypoint with ExecutionShell-aware imports, scoring helpers, and formatting utilities; `apps/dashboard/src/pages/WorklistV2.tsx:253` defines `WorklistV2Content`, which orchestrates ticket fetching, session-metrics enrichment, filtering, and the table/detail layout; `apps/dashboard/src/pages/WorklistV2.tsx:770` wraps the page in `<ExecutionShell activeTab="worklist">`.
- **Automation + audit** — `scripts/apply_worklist_v2_execution_shell_wrap.sh:1` captures a self-service patcher plus backup/audit logging; this script appends the entry above and writes `apps/dashboard/src/pages/WorklistV2.tsx.bak.*` snapshots; `v2_preflight_recon.sh:1` provides the read-only recon requested for operators before/after edits.
- **Follow-ups** — Run `pnpm lint --filter dashboard --if-present` and `pnpm test --filter dashboard --if-present` for safety, then visually validate Worklist V2 inside the A2 shell via your usual dashboard dev server.

### WorklistV2.tsx – A2 ExecutionShell integration

- Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Change: Wrapped `WorklistV2Page` in `ExecutionShell` with `activeTab="worklist"` to align with the A2 Operator Dashboard shell. No changes to canonical ticket/session metrics contracts.
- Risk: UI-only, no backend/API contract changes. Existing mocks and `fetchWorklistCanonicalTickets` / `fetchSessionMetrics` usage preserved.

## Operator Worklist V2 — Implementation Snapshot

- **Worklist view** — `apps/dashboard/src/pages/WorklistV2.tsx:1` mirrors the full V2 entry (ExecutionShell-aware imports, score helpers, formatting); `apps/dashboard/src/pages/WorklistV2.tsx:253` defines `WorklistV2Content` for fetching/enriching/filtering/rendering tickets; `apps/dashboard/src/pages/WorklistV2.tsx:770` wraps the view inside `<ExecutionShell activeTab="worklist">`.
- **Automation + audit** — `scripts/apply_worklist_v2_execution_shell_wrap.sh:1` backs up/re-generates the page and appends audit entries, producing `apps/dashboard/src/pages/WorklistV2.tsx.bak.*`; `docs/PRISM_APEX_V2_BUILD_AUDIT.md:120` now records the shell integration; `v2_preflight_recon.sh:1` supplies the read-only recon requested ahead of operator changes.
- **Follow-ups** — Run `pnpm lint --filter dashboard --if-present` and `pnpm test --filter dashboard --if-present`, then use your dashboard dev server to visually confirm the Worklist V2 view within the A2 shell.

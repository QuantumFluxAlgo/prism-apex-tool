# Prism Apex – V2 Codex Terminal Playbook

## Operating Constraints

1. **Backend-first**
   - Always patch backend routes / services / DTOs **before** wiring dashboards.
   - Prioritise:
     - `/api/worklist`
     - `/api/tickets`
     - `/api/system/*`
     - `/market/*`
     - `/analytics/*`

2. **Reuse before new code**
   - Before creating any new route, hook, or component:
     - Search for an existing equivalent.
     - If something can be reused/adapted, prefer that path.
   - Examples:
     - Reuse `computeEngineTicketScoreFromRow` for scoring.
     - Reuse canonical ticket builders from `dto/canonicalTicketView`.
     - Reuse `fetchSessionMetricsBatch` instead of new ad-hoc queries.

3. **SQL Changes (Option 3 only)**
   - ALLOWED:
     - New indexes.
     - New views / materialized views.
   - NOT ALLOWED:
     - Dropping columns/tables.
     - Altering column types.
     - Destructive migrations.
   - All SQL changes must go into a new file:
     - `deploy/sql/030_worklist_v2_indexes.sql` (or higher), tagged as "INDEXES/VIEWS ONLY".

4. **Deletion discipline**
   - No direct deletion of code/docs.
   - Instead:
     - Add candidates to `codebase-cleanup-suspicious.txt`.
     - Use `scripts/codebase-cleanup-safe.sh` for reproducible artefacts only.
   - Final deletion is a separate, deliberate step.

5. **Mocks vs real data**
   - Primary objective: move dashboards off mocks and onto real engine/API data.
   - For each page:
     - Prefer live routes.
     - Fallback to mocks only when API is unavailable AND error state is surfaced.

## Implementation Sequence

1. **Phase 1 – Confirm scan artefacts**
   - Ensure JSON scans exist:
     - `full_files_list.json`
     - `backend_dependency_graph.json`
     - `frontend_dependency_graph.json`
     - `ticket_flow_map.md`
     - `backend_contracts_summary.md`
     - `dashboard_alignment_report.md`
   - If missing, regenerate via repo scan script.

2. **Phase 2 – Backend (critical path)**
   - Implement `/api/worklist` as canonical feed using:
     - `tickets` table.
     - `SessionMetrics` batch helper.
     - `sessionFlagsService`.
     - `computeEngineTicketScoreFromRow`.
     - Canonical ticket builder.
   - Align `/api/system/*`, `/market/*`, `/analytics/*` with dashboard contracts.
   - Add allowed indexes/views per `deploy/sql/030_worklist_v2_indexes.sql`.

3. **Phase 3 – Frontend wiring**
   - Update hooks and pages to consume new/real backend outputs:
     - `useWorklistTickets` → `/api/worklist`.
     - `MarketData` → `/market/*` + session metrics.
     - `Analytics` → history from `/api/tickets`.
     - `Alerts` → `/api/system/alerts`.
     - `Status` → `/api/status`, `/api/system/jobs`, `/api/system/telemetry`.
     - `Positions` → canonical tickets.

4. **Phase 4 – Cleanup**
   - Keep removing/archiving:
     - Legacy pages/HTML mocks.
     - Orphaned docs.
   - Only via:
     - `scripts/codebase-cleanup-safe.sh` (for artefacts).
     - `codebase-cleanup-suspicious.txt` for human-approved removal.

5. **Phase 5 – Validation**
   - Confirm:
     - Tickets flow end-to-end from Yahoo 1m bars → engine → tickets → dashboards.
     - Worklist shows actionable, risk-aware tickets only.
     - System/alerts dashboards use live API data.
     - Docker local/remote deploys pass health checks.


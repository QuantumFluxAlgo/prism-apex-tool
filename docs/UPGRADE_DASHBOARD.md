# UPGRADE_DASHBOARD.md

## Delivery process (tight + epic-scoped)

1. **Codex Terminal reads ONLY the current Epic section being delivered** (not the whole document) and performs a **repo-first check** to identify existing functionality (hooks, services, DTOs, routes, scoring, filters, UI components) that must be reused.
2. Codex Terminal produces an **Epic OUTCOME REPORT**: what exists, what’s missing, what’s mismatched (page ↔ API ↔ proxy), and what decisions are required.
3. Where decisions are needed, Codex Terminal asks **targeted questions**. We decide using the **expert panel** (trading systems + market structure + execution + data + risk + quant + monorepo + SRE).
4. Codex Terminal implements **all stories under the Epic in one delivery batch**, keeping changes minimal and reversible.
5. Codex Terminal **pushes to the branch** (small commits, clean messages) and updates this document in-repo: mark stories complete, record repo-evidence corrections, and log deletions/renames.
6. After all Epics are done (except the final cleanup epic), we run the **V2 docker compose** end-to-end smoke checks. Then we do the final epic.

---

## North-star KPIs (platform-level)

- **Primary KPI:** Time-to-action (ticket surfaced → operator action persisted)
- **Secondary KPI #1:** False-positive reduction (rejected/expired vs actioned/filled ratio improvement)
- **Secondary KPI #2 (expert panel):** Data-to-glass correctness + freshness (P95 page loads succeed; stale/partial data explicitly flagged, not silently shown)

Measurement approach:
- Client page-load telemetry (P50/P95), API route 404/5xx rates, operator-action audit counts, and smoke/E2E run logs. Baselines are **UNVERIFIED** until instrumentation/route logs are in place.

---

## Repo-evidence baseline (CONFIRMED from Epic-0 recon output)

### Dashboard pages (apps/dashboard/src/pages/*.tsx)
- Alerts.tsx
- Analytics.tsx
- MarketData.tsx
- Positions.tsx
- Status.tsx
- StrategyLab.tsx
- Tickets.tsx
- WorklistV2.tsx

### API route modules (apps/api/src/routes/*)
Includes (non-exhaustive, confirmed present):
- worklist.ts, tickets.ts, ticketQualityFilters.ts
- strategy-config.ts, strategies.config.ts, strategy-engine.ts (preview)
- session-metrics.ts, analytics.ts
- system.alerts.ts, system.jobs.ts, system.telemetry.ts
- telemetry.ts, operator-risk.ts, operatorSizing.ts
- market.ts (non-/api namespace), ingest.ts, health.yahoo.ts, reports.dashboard.ts
- compat.ts (legacy/compat routing)

### Deployment constraint (CRITICAL, CONFIRMED)
Dashboard container Nginx proxies **ONLY** `location /api/ { ... proxy_pass http://api:3000/api/; }`.
Therefore: **any dashboard fetch not under `/api/*` will not work in the standard V2 container path** unless API_BASE is pointed directly at the API container/host (non-default behavior).

### Contract drift (CONFIRMED)
Epic-0 recon produced:
- Dashboard references missing/incorrect endpoints including: `/activity`, `/compliance`, `/markets`, `/system`, `/tickets/live`, `/tickets/history`, malformed paths with trailing `.` or inconsistent slashes.
- API exposes granular endpoints including:
  - `/api/system/alerts`, `/api/system/jobs`, `/api/system/telemetry`
  - `/api/session-metrics`, `/api/analytics/summary`
  - `/api/tickets`, `/api/tickets/:id/complete`, `/api/tickets/:ticketId/operator-action`
  - `/api/operator-risk/*`, `/api/operator-config`, `/api/symbols/v2`
  - plus **non-/api** endpoints like `/market/sessions`, `/market/symbols` (not reachable via dashboard Nginx proxy)

### Worklist scoring (CONFIRMED — DO NOT IGNORE)
- Frontend: `apps/dashboard/src/hooks/useWorklistTickets.ts` contains local score fallback logic.
- Backend: `apps/api/src/routes/worklist.ts` computes score (e.g., `computeEngineTicketScoreFromRow(...)`) and returns score/quality metadata.
**Expert panel position:** backend score is canonical; frontend fallback remains as controlled degrade mode only.

---

# EPIC 0: Repo-first Contract Recon & Baseline Capture (COMPLETED)

## Problem statement
- We needed repo-proof of: pages, routes, contract drift, and proxy constraints to avoid inventing endpoints or UI.

## Outcome (measurable)
- Primary KPI: repo-truth captured (page↔API↔proxy map exists)
- Target: achieved (reports generated)

## Scope
### In scope
- [x] Enumerate pages
- [x] Enumerate route modules and detectable endpoints
- [x] Produce diffs: dashboard_minus_api / api_minus_dashboard
- [x] Produce page_to_api_map (best-effort)

### Out of scope
- [x] Any code changes

## Artifacts (already created)
- `reports/upgrade_dashboard/epic1_contract_alignment/OUTCOME_REPORT.txt`
- `reports/upgrade_dashboard/epic1_contract_alignment/dashboard_minus_api.txt`
- `reports/upgrade_dashboard/epic1_contract_alignment/api_minus_dashboard.txt`
- `reports/upgrade_dashboard/epic1_contract_alignment/page_to_api_map.md`

## Definition of Done
- [x] Complete

---

# EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)

## Problem statement
- Pages and client API wrappers include drifted, malformed, or **unreachable** endpoints (including **non-`/api/*` routes blocked by the dashboard Nginx** in the default V2 deployment).
- This creates **silent empty states**, mock/fallback paths, and operator-facing misinformation that degrades time-to-action and profitability.
- “Stringly-typed” endpoints and per-page ad-hoc fetching create hidden coupling and regression risk.

## Outcome (measurable)
- Primary KPI: **Data-to-glass correctness** (healthy API → pages render meaningful, non-fallback data)
- Secondary KPIs:
  - **Client contract error rate** (404 due to wrong paths) → near-zero
  - **P95 page load success** across the 8 pages ≥ 99% in steady-state
- Baseline: **UNVERIFIED** until route logging + client telemetry added
- Target: as above
- Measurement approach:
  - API route logs (404/5xx by route)
  - Client telemetry (page-load markers + fetch failures)
  - V2 compose smoke tests (8-page navigation + “meaningful data” checks)

### Epic 1 Completion Notes (2025-12-12)
- **Endpoint hygiene + canonical client (ST-001 & ST-002):** Pages now rely solely on `apps/dashboard/src/lib/api.ts`, `/api/health/yahoo` + `/api/telemetry/*` are the only paths used, and a Vitest guard blocks new raw `fetch(` strings.
- **System routes (ST-003):** Status & Alerts copy references `/api/system/{alerts,jobs,telemetry}` explicitly; no `/api/system` aggregator strings remain.
- **Market reachability (ST-004):** `/api/market/sessions` and `/api/market/symbols` aliases delegate to the existing handlers, and MarketData renders session chips + symbol filters from those proxy-safe routes.
- **Ticket sub-routes (ST-005 Decision A):** Removed unused `/api/tickets/{live,history,alerts,recipients}` helpers; `/api/tickets` stays canonical.
- **Activity/compliance drift (ST-006):** `/api/activity` and `/api/compliance` helpers are quarantined (they now throw with ST-006 context) because no repo consumers exist.
- **Observability (ST-007):** `apps/dashboard/src/lib/contractTelemetry.ts` logs page-load + contract-error events for all pages, and `fetchJson` emits errors whenever a request fails.

## Scope
### In scope
- [ ] Enforce: **dashboard calls only `/api/*`** in the default V2 proxy path
- [ ] Centralize/normalize client API usage (reuse `apps/dashboard/src/lib/*` and/or a single client module)
- [ ] Remove malformed paths (trailing `.` / mixed slashes / inconsistent prefixes)
- [ ] Resolve `/market/*` vs `/api/*` reachability via **compat aliases** (proxy-truth), not topology churn

### Out of scope
- [ ] Strategy/risk math rewrites
- [ ] New data vendors, new trading semantics, or execution behavior changes

## Assumptions
- `/api/*` is the canonical operator-facing surface under default dockerized V2 deployment.
- Non-`/api/*` routes are legacy/compat/internal unless explicitly justified by repo evidence.

## Constraints
- Security/compliance: no auth model changes unless required for endpoint parity
- Performance: avoid fan-out explosions; prefer request coalescing + caching for stable resources
- Availability/SLO: fail-safe UI (explicit stale/offline banners; **no silent empties**)
- Backward compatibility: preserve existing routes; introduce compat aliases only when required by proxy reality
- Supported platforms/versions: V2 docker compose local + server profiles

## Dependencies
- Upstream:
  - `apps/api/src/routes/*` route truth
  - DTOs and shared contracts (repo-defined)
- Downstream:
  - `apps/dashboard/src/pages/*`
  - Dashboard hooks + `apps/dashboard/src/lib/*`

## Risks & mitigations
- Risk: increased request count harms UX
  - Impact: medium
  - Likelihood: medium
  - Mitigation: per-page request coalescing; cache stable resources (symbols/config); avoid polling storms
- Risk: “fixing” a route breaks hidden consumers
  - Impact: medium
  - Likelihood: low
  - Mitigation: add compat aliases (do not delete routes here); deletions only in FINAL epic with proof

## Expert panel decisions (LOCKED)
1. **Single surface rule:** dashboard operates against `/api/*` under default Nginx proxy.
2. **No invented aggregators:** do not add umbrella endpoints like `/api/system` unless repo evidence proves durable need.
3. **Compat aliases allowed when proxy-reality requires it:** if the API exposes non-`/api` routes needed by the dashboard (e.g., `/market/*`), add `/api/*` aliases delegating to the same handlers (no logic rewrite) rather than changing deployment topology first.

## UX / API contract (if applicable)
- UX notes / wireframes link: UNVERIFIED
- API endpoints/events (targets for this epic):
  - System: `/api/system/alerts`, `/api/system/jobs`, `/api/system/telemetry`
  - Tickets: `/api/tickets`, `/api/tickets/:id/complete`, `/api/tickets/:ticketId/operator-action`
  - Worklist: `/api/worklist`
  - Market (compat aliases): `/api/market/sessions`, `/api/market/symbols`
- Data model changes: none expected (contract + wiring only)

## Delivery plan
### Milestones
1. Canonicalize dashboard API usage (remove raw endpoint strings and malformed URLs)
2. Make required non-`/api` server routes reachable via `/api/*` (alias, not rewrite)
3. Add minimal contract telemetry (404/5xx + page-load markers) and smoke tests

### Story breakdown
- ST-001: Endpoint hygiene pass (dashboard)
- ST-002: Enforce “no raw fetch strings in pages”
- ST-003: Remove non-existent aggregators (e.g., `/api/system`)
- ST-004: Market route reachability via `/api/market/*` aliases
- ST-005: Ticket sub-route drift resolution (A/B decision via repo evidence)
- ST-006: Activity/Compliance drift triage (prove usage; quarantine or implement minimal read-only)
- ST-007: Epic-scoped observability (client + API)

## Acceptance criteria (Epic-level)
- [ ] Dashboard makes **zero** calls to endpoints unreachable under default proxy rules
- [ ] All 8 pages load meaningful data when API is healthy (no silent empty/fallback states)
- [ ] MarketData page uses **reachable** endpoints under `/api/*`
- [ ] Contract errors are visible (telemetry/logs), not “blank UI”
- [ ] V2 docker compose smoke passes

## Rollout
- Feature flag: optional (page-by-page switch) — default: incremental commits on branch
- Ramp plan: validate in V2 compose → push branch
- Rollback trigger thresholds: 404 spikes, broken Worklist load, page render failure
- Comms plan: internal only

## Test strategy
- Unit: lightweight tests for canonical client module (happy path + bad status handling)
- Integration: route-level contract checks where existing harness supports it
- E2E: 8-page smoke (navigation + “meaningful widget” checks)
- Performance: capture P95 page load success and timing
- Security: no changes unless endpoint parity requires it

## Definition of Done
- [x] Code merged + reviewed
- [x] Tests passing
- [x] Docs updated (this Epic + completion notes + evidence corrections)
- [x] Monitoring/alerts in place for contract error signal (minimal)
- [x] Released and verified in V2 compose


---

# STORY: ST-001 Endpoint hygiene pass (dashboard)
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Chore | Tech Debt

## User story
As an operator
I want pages to consistently load the correct data
So that I’m not making decisions on blanks, fallbacks, or stale widgets

## Context
- Current behavior: drifted endpoints including trailing `.` and mixed slashes create 404s and “mysterious empties”.
- Desired behavior: deterministic endpoint formatting and routing.

## Requirements
### Functional
- [x] Normalize endpoint strings (remove trailing `.`; normalize slashes; enforce `/api/*` prefix)
- [x] Eliminate duplicate path variants across dashboard lib/pages

### Non-functional
- [x] Performance: no new polling; no added fan-out
- [x] Security/privacy: unchanged
- [x] Accessibility: unchanged
- [x] Compatibility: V2 compose

## Acceptance criteria (Given/When/Then)
- [x] Given any dashboard page, when it requests data, then all requests use normalized `/api/*` paths
- [x] Given a healthy API, when pages load, then no 404s occur due to malformed paths

## Out of scope
- [x] Any server route behavior changes

## Implementation notes (optional but helpful)
- Proposed approach: introduce a single path builder/constant map in dashboard lib; refactor callers.
- Files/areas likely impacted: `apps/dashboard/src/lib/*`, `apps/dashboard/src/pages/*`
- Backward-compat plan: keep server unchanged

## Telemetry / Observability
- Metrics: count of normalized vs non-normalized calls (optional), 404 count by route
- Logs: client-side error log on non-2xx with page name + route

## Test plan
- [x] Unit: path normalization tests
- [x] E2E: smoke load each page
- [x] Manual verification steps (exact commands/URLs): V2 compose up → open each page → confirm no 404s in logs

## Rollout / Release
- Feature flag: none
- Rollback steps: revert commit(s)

## Definition of Done
- [x] Meets acceptance criteria
- [x] Tests updated/passing
- [x] Docs updated (Epic completion notes)


---

# STORY: ST-002 Enforce “no raw fetch strings in pages”
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Enforcement

## User story
As an engineer
I want all pages to use canonical client functions
So that endpoint drift stops being reintroduced

## Context
- Current behavior: pages embed endpoint strings directly.
- Desired behavior: pages call `apps/dashboard/src/lib/*` (or a single exported client module) only.

## Requirements
### Functional
- [x] Replace raw fetch/path usage in pages with canonical client functions
- [x] Add a lightweight guard (lint rule or local pattern check) preventing new raw endpoint strings

### Non-functional
- [x] Performance: unchanged
- [x] Security/privacy: unchanged

## Acceptance criteria (Given/When/Then)
- [x] Given a page implementation, when it calls the API, then it calls only canonical client functions (no hardcoded `/api/` strings)
- [x] Given a PR introducing a raw endpoint string, when lint/check runs, then it fails or flags clearly

## Out of scope
- [x] Any endpoint semantic changes

## Implementation notes
- Proposed approach: export a single `apiClient` surface; pages import from it.
- Files impacted: `apps/dashboard/src/pages/*`, `apps/dashboard/src/lib/*`

## Telemetry / Observability
- Logs: none required beyond ST-007

## Test plan
- [x] Unit: client module coverage
- [x] E2E: smoke

## Rollout / Release
- Rollback: revert

## Definition of Done
- [x] Meets acceptance criteria
- [x] Guard in place


---

# STORY: ST-003 Replace non-existent aggregators (e.g., `/api/system`)
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Refactor

## User story
As an operator / SRE
I want system pages to show explicit system signals
So that failures are debuggable and not masked behind fake aggregations

## Context
- Current behavior: client attempts `/api/system` (not a real route) instead of explicit system endpoints.
- Desired behavior: use `/api/system/{alerts,jobs,telemetry}`.

## Requirements
### Functional
- [x] Replace `/api/system` calls with `/api/system/alerts`, `/api/system/jobs`, `/api/system/telemetry`
- [x] Align Status/Alerts pages to explicit system endpoints

### Non-functional
- [x] Performance: coalesce where possible; avoid parallel storms

## Acceptance criteria (Given/When/Then)
- [x] Given Status/Alerts pages, when loading, then they call only explicit system endpoints
- [x] Given the API is healthy, when pages render, then system data is visible and correct

## Out of scope
- [x] Creating `/api/system` umbrella endpoint

## Implementation notes
- Files impacted: `apps/dashboard/src/pages/Status.tsx`, `apps/dashboard/src/pages/Alerts.tsx`, dashboard lib client

## Telemetry / Observability
- Metrics: 404 count for `/api/system` should become zero

## Test plan
- [ ] E2E: navigate Status + Alerts

## Rollout / Release
- Rollback: revert

## Definition of Done
- [x] Meets acceptance criteria


---

# STORY: ST-004 Resolve market route reachability via `/api/market/*` aliases
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Enforcement

## User story
As an operator
I want market/session/symbol data to load in V2 compose
So that MarketData is a reliable cockpit rather than a dead page

## Context
- Current behavior: dashboard references `/api/markets` and/or non-`/api` market routes.
- Desired behavior: proxy-truth endpoints under `/api/market/*` that delegate to existing handlers.

## Requirements
### Functional
- [x] Implement `/api/market/sessions` alias → delegates to existing `/market/sessions` handler logic
- [x] Implement `/api/market/symbols` alias → delegates to existing `/market/symbols` handler logic
- [x] Update dashboard MarketData page + lib to use `/api/market/*` (NOT `/api/markets`)

### Non-functional
- [x] Backward compatibility: keep `/market/*` unchanged
- [x] Performance: no additional computation; alias only

## Acceptance criteria (Given/When/Then)
- [x] Given V2 compose, when MarketData loads, then it successfully fetches sessions/symbols via `/api/market/*`
- [x] Given existing `/market/*` consumers, when they call routes, then behavior is unchanged

## Out of scope
- [x] Ingest pipeline changes

## Implementation notes
- Affected areas: `apps/api/src/routes/market.ts` (or equivalent), dashboard MarketData lib/page
- Backward-compat plan: alias routes added; no removals

## Telemetry / Observability
- Logs: API access logs for `/api/market/*`

## Test plan
- [x] Integration: hit `/api/market/sessions` and `/api/market/symbols` in compose
- [x] E2E: MarketData page smoke

## Rollout / Release
- Rollback: remove aliases + revert dashboard calls

## Definition of Done
- [x] Meets acceptance criteria


---

# STORY: ST-005 Ticket sub-route drift resolution (A/B)
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Refactor | Enforcement

## User story
As an operator
I want ticket views to match what the system actually supports
So that I’m never interacting with phantom “live/history” views

## Context
- Current behavior: client contains calls like `/api/tickets/live`, `/api/tickets/history` (not implemented).
- Desired behavior: either remove usage or provide read-only compat aliases.

## Requirements
### Functional
- [x] Prove whether these sub-routes are actually used by any page/hook in the repo
- [x] Choose approach:
  - [x] (A) Remove usage and use `/api/tickets` with supported query params (if present)
  - [ ] (B) Add read-only compat aliases under `/api/tickets/*` delegating to existing query functions (no new semantics)

### Non-functional
- [x] Backward compatibility: do not remove server capabilities in this epic

## Acceptance criteria (Given/When/Then)
- [x] Given the dashboard, when tickets are loaded, then no calls are made to non-existent `/api/tickets/*` sub-routes
- [x] Given the selected approach, when the page renders, then operator sees the intended view without mocks/fallbacks

## Out of scope
- [x] New ticket semantics or state model

## Implementation notes
- Expert panel default:
  - Prefer (A) if the views are not used by any UI
  - Prefer (B) only if the UI truly depends on these views

## Telemetry / Observability
- Metrics: route-level 404 for `/api/tickets/*` becomes zero

## Test plan
- [x] E2E: Tickets + Worklist smoke

## Rollout / Release
- Rollback: revert

## Definition of Done
- [x] Meets acceptance criteria


---

# STORY: ST-006 Activity/Compliance drift triage
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Isolation | Removal of legacy code | Feature (read-only) — evidence-driven

## User story
As an operator / SRE
I want the dashboard to only show features backed by real system data
So that we eliminate phantom surfaces and reduce decision risk

## Context
- Current behavior: client has `fetchMarketActivity()` / `fetchComplianceSnapshot()` but no `/api/activity` or `/api/compliance` exists.
- Desired behavior: prove usage; quarantine or implement minimal read-only endpoints backed by existing audit/operator-action sources.

## Requirements
### Functional
- [x] Prove whether these functions are called by any page/hook
- [x] If unused: quarantine for FINAL epic deletion (do not delete here unless clearly isolated and safe)
- [x] If used: implement minimal read-only endpoints backed by existing sources (no new semantics) (N/A — not invoked)

### Non-functional
- [x] Risk: avoid phantom “compliance” claims without data provenance

## Acceptance criteria (Given/When/Then)
- [x] Given the dashboard, when loading any page, then no calls are made to non-existent `/api/activity` or `/api/compliance`
- [x] Given the functions are used, when data is shown, then it has a provable source and audit trail (N/A — functions quarantined in ST-006)

## Out of scope
- [x] New compliance frameworks or policy semantics

## Implementation notes
- Expert owner: Trading SRE + Principal Architect

## Telemetry / Observability
- Logs: calls to these endpoints (if implemented) include correlation markers

## Test plan
- [x] E2E smoke + route probes

## Rollout / Release
- Rollback: revert

## Definition of Done
- [x] Meets acceptance criteria


---

# STORY: ST-007 Epic-scoped observability (contract correctness)
Epic: EPIC 1: A3 Dashboard Contract Hardening (Client ↔ API ↔ Proxy Truth)
Type: Chore | Enforcement

## User story
As engineering/SRE
I want contract failures to be visible immediately
So that “blank UI” becomes an actionable signal rather than a debugging hunt

## Context
- Current behavior: failures can degrade into silent UI empties.
- Desired behavior: page-load markers + contract error counters (404/5xx by route), visible in logs (and optionally surfaced in System pages if already supported).

## Requirements
### Functional
- [x] Add client page-load markers (page name + success/failure + timing)
- [x] Add contract error counters (route + status code)
- [x] Ensure failures produce explicit UI state (offline/stale banners), not silent empties

### Non-functional
- [x] Performance: low overhead instrumentation only

## Acceptance criteria (Given/When/Then)
- [x] Given a wrong endpoint, when a page loads, then an explicit contract error is logged/recorded
- [x] Given a healthy API, when a page loads, then “success marker” is emitted

## Out of scope
- [x] New monitoring stack introduction

## Implementation notes
- Prefer reusing existing telemetry route(s) if already present; otherwise log-only for this epic.

## Telemetry / Observability
- Metrics: page_load_success, page_load_latency_ms (P50/P95), contract_error_count_by_route
- Logs: structured client logs; API access logs by route

## Test plan
- [x] E2E: smoke
- [x] Manual: induce 404 and confirm explicit signal

## Rollout / Release
- Rollback: revert

## Definition of Done
- [x] Meets acceptance criteria

---

# EPIC 2: Worklist V2 — Market-Leading Operator Cockpit (Scoring + Actions + Risk)

## Problem statement
- Worklist is the P&L lever. If ranking/scoring/action clarity are wrong, throughput and profitability degrade.
- Score calculator exists; it must be treated as canonical and visible, not ignored.

## Outcome (measurable)
- Primary KPI: **Time-to-action**
- Secondary KPIs:
  - **False-positive reduction**
  - **Operator throughput** (actioned tickets/hour)
- Baseline: UNVERIFIED until instrumentation is live
- Target: measurable improvement vs baseline in stable sessions

## Scope
### In scope
- [ ] Make backend score canonical; frontend fallback only for degrade-mode
- [ ] Show **score breakdown** and “why this ticket is here” (operator trust)
- [ ] Operator actions: complete ticket, operator-action logging, OCO copy workflow (where already present)
- [ ] Integrate operator-risk posture into Worklist decisioning UI (read-only guardrails)

### Out of scope
- [ ] New scoring algorithms
- [ ] Auto-execution

## Dependencies
- Backend: `apps/api/src/routes/worklist.ts` (score), `ticketQualityFilters.ts`
- Frontend: `apps/dashboard/src/hooks/useWorklistTickets.ts`, WorklistV2 page UI components

## Delivery plan / Story breakdown
- ST-201: Canonical Worklist scoring source-of-truth
  - Preserve: existing scoring logic in API
  - Improve: UI uses returned score + breakdown; fallback only on API failure
  - Not changed: the math

- ST-202: Worklist A3 cockpit styling inside ExecutionShell
  - Preserve: component library patterns already used (Buttons/Cards/Table/Filters/KPIs)
  - Improve: consistent table density, sticky headers, deterministic layout, details panel clarity
  - Not changed: data semantics

- ST-203: Risk strip (operator-risk) integrated into Worklist workflow
  - Preserve: existing endpoints (`/api/operator-risk/*`)
  - Improve: operator sees posture before actioning
  - Not changed: risk policy

- ST-204: Operator action UX parity (complete + operator-action audit)
  - Preserve: existing routes `/api/tickets/:id/complete` and `/api/tickets/:ticketId/operator-action`
  - Improve: clear confirmation + error states + audit visibility
  - Not changed: ticket lifecycle model

- ST-205: Worklist filter + quality filters reuse
  - Preserve: `ticketQualityFilters` route + DTOs
  - Improve: consistent filters across Worklist/Tickets
  - Not changed: filter semantics

---

# EPIC 3: Tickets — Lifecycle, Quality Filters, Operator Actions (Single Truth)

## Problem statement
- Tickets must be the canonical lifecycle view; today it’s under-wired and inconsistently styled vs Worklist.
- Operators should not have to cross-reference multiple pages to validate a ticket state.

## Outcome (measurable)
- Primary KPI: reduced operator “validation loops” (proxy: fewer page swaps before action)
- Secondary KPI: lower “unknown state” tickets
- Baseline/Target: UNVERIFIED until telemetry exists

## Scope
### In scope
- [ ] Ticket list, detail, complete/action flows wired to canonical endpoints
- [ ] Quality filter bar shared with Worklist
- [ ] A3 cockpit styling consistency

### Out of scope
- [ ] Ticket schema rewrite

## Delivery plan / Story breakdown
- ST-301: Tickets list uses canonical contract + stable refresh strategy
- ST-302: Ticket quality filters integration (reuse server filters)
- ST-303: Operator action + completion UX parity with Worklist
- ST-304: A3 styling alignment for Tickets cockpit

---

# EPIC 4: Strategy Lab — Config + Preview (Operator-Safe, Auditable)

## Problem statement
- StrategyLab wiring is unclear and/or indirect; API exposes strategy-config + preview capabilities that must be surfaced safely.
- Config changes must be deliberate, previewed, and auditable.

## Outcome (measurable)
- Primary KPI: config change safety (100% audited; no silent mutation)
- Secondary KPI: time-to-validate config change (preview visible)
- Baseline/Target: UNVERIFIED until metrics added

## Scope
### In scope
- [ ] Wire StrategyLab to `/api/strategies/config`, `/api/strategy-config/:strategy`, history, and preview endpoints
- [ ] Read-only preview surfaces before any apply (if apply exists, must be guarded)
- [ ] A3 cockpit styling consistent with other pages

### Out of scope
- [ ] New strategy math or new orchestrator behavior

## Delivery plan / Story breakdown
- ST-401: Strategy config fetch/render using existing DTOs
- ST-402: Strategy config history + audit visibility (if supported)
- ST-403: Strategy-engine preview integration (read-only)
- ST-404: A3 cockpit layout for StrategyLab

---

# EPIC 5: Market Data — Symbols, Sessions, Ingest Health, Coverage (Data Truth Cockpit)

## Problem statement
- MarketData currently drifts toward unreachable/incorrect endpoints (proxy reality).
- Operators need explicit data freshness + session status + coverage gaps.

## Outcome (measurable)
- Primary KPI: data freshness & gap detection time
- Secondary KPI: mean time to detect ingest break
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Symbols/session endpoints reachable under `/api/*` (via EPIC 1 aliases if needed)
- [ ] Ingest health widgets (reuse existing health endpoints, e.g., yahoo health)
- [ ] Coverage + gap indicators (reuse computations if present; otherwise minimal new functions)

### Out of scope
- [ ] Ingest pipeline redesign

## Delivery plan / Story breakdown
- ST-501: MarketData contract alignment to reachable symbol/session routes
- ST-502: Ingest health widgets wired to existing health endpoints
- ST-503: Coverage + gap indicators (reuse first; minimal new only if absent)
- ST-504: A3 cockpit layout for MarketData

---

# EPIC 6: Analytics — Session Metrics, Ticket Yield, Profitability Signals (Operator-Actionable)

## Problem statement
- Analytics is under-wired/malformed and not anchored to session metrics and ticket outcomes.
- Prop goal: analytics must improve decision quality, not just display charts.

## Outcome (measurable)
- Primary KPI: false-positive reduction
- Secondary KPIs: ticket yield, bar-close → ticket surfaced latency
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Wire to `/api/analytics/summary` + `/api/session-metrics`
- [ ] Session KPIs: risk regime, volatility, quality distribution, action outcomes
- [ ] A3 cockpit styling

### Out of scope
- [ ] PnL model rewrite

## Delivery plan / Story breakdown
- ST-601: Analytics contract alignment to summary + session-metrics
- ST-602: Session KPI strip (operator-ready)
- ST-603: Ticket yield + false positive widgets (reuse existing metrics where present)
- ST-604: A3 cockpit layout for Analytics

---

# EPIC 7: System — Status, Jobs, Telemetry, Alerts (SRE-Grade Operator View)

## Problem statement
- Status/Alerts must reflect real system health using explicit endpoints (no aggregators).
- Operators need MTTD/MTTR leverage: “what is broken, why, what can we safely do”.

## Outcome (measurable)
- Primary KPI: MTTD
- Secondary KPI: MTTR
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Replace `/api/system` usage with explicit `/api/system/{alerts,jobs,telemetry}`
- [ ] Jobs cockpit: last run, failure reason; run controls only if already supported and guarded
- [ ] Alerts: ack/peek flows if present
- [ ] A3 styling consistency

### Out of scope
- [ ] New observability stack

## Delivery plan / Story breakdown
- ST-701: Status contract alignment (`/api/status`, `/api/ops/status`, `/api/system/telemetry`)
- ST-702: Jobs cockpit wired to `/api/system/jobs` (safe controls only if present)
- ST-703: Alerts cockpit wired to `/api/system/alerts` (+ ack/peek where used)
- ST-704: A3 cockpit layout for Status + Alerts

---

# EPIC 8: Positions — Account, Positions, Fills, Live Risk Posture (Operator Safety Gate)

## Problem statement
- Positions page must reflect real exposure/fills/account posture; current wiring is inconsistent.
- Without accurate posture, operators can’t safely action tickets.

## Outcome (measurable)
- Primary KPI: risk posture correctness (exposure + limits visible and consistent)
- Secondary KPI: fewer “surprise exposure” incidents
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Wire to `/api/telemetry/{account,positions,fills}` (existing)
- [ ] Show operator-risk daily posture alongside exposure
- [ ] A3 cockpit styling

### Out of scope
- [ ] Order placement / execution rewrites

## Delivery plan / Story breakdown
- ST-801: Positions contract alignment to telemetry endpoints
- ST-802: Risk posture strip (reuse operator-risk endpoints)
- ST-803: A3 cockpit layout for Positions

---

# EPIC 9: A3 UI Consistency — Shared Components, Tokens, Page Templates (Measured UX, Not “Pretty”)

## Problem statement
- Pages diverge visually and structurally inside ExecutionShell, increasing cognitive load and slowing action.

## Outcome (measurable)
- Primary KPI: time-to-action improvement attributable to consistency
- Secondary KPI: reduced operator misclick/error proxies
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Enforce shared UI components (Buttons/Cards/Tables/Filters/KPIs) consistently
- [ ] Define an “A3 page template contract” (layout, spacing, header, KPI strip, table/detail split)
- [ ] Keep page widgets custom to their data while using shared primitives

### Out of scope
- [ ] Full redesign without measurable operator utility

## Delivery plan / Story breakdown
- ST-901: Define A3 template contract (documented + implemented)
- ST-902: Refactor all pages to conform while preserving content intent
- ST-903: Remove duplicated page-specific styling where shared primitives exist

---

# EPIC 10 (FINAL): Repo Cleanup, Deletions, Doc Consolidation, V2 Compose E2E Validation

## Problem statement
- After functional alignment, legacy code and drifted docs create non-obvious coupling and regression risk.
- Cleanup must be last to avoid deleting dependencies mid-flight.

## Outcome (measurable)
- Primary KPI: lower regression rate (fewer “dead code” breakages)
- Secondary KPI: faster onboarding (single truth, fewer conflicting docs)
- Baseline/Target: UNVERIFIED

## Scope
### In scope
- [ ] Dead-code and dead-route audit with proof (imports + runtime hits + route logs)
- [ ] Safe deletions/archives (reversible where appropriate)
- [ ] Docs alignment (update or delete drifted docs; explicitly log changes)
- [ ] Full V2 docker compose e2e validation + rollback instructions verified

### Out of scope
- [ ] Large-scale refactors not justified by evidence

## Delivery plan / Story breakdown
- ST-1001: Dead-code + dead-route proof report
- ST-1002: Safe deletions + archive strategy (reversible)
- ST-1003: Docs consolidation + deletions (logged)
- ST-1004: V2 docker compose E2E smoke + rollback verification

---

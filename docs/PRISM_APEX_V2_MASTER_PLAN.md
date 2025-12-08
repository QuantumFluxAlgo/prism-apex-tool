# PRISM APEX – V2 DASHBOARD MASTER PLAN  
_Version_: 1.0  
_Last updated_: 2025-12-08  
_Owner_: Prism-Apex Engineering (Frontend, API, Quant/Risk, UX)

---

## 1. Scope & Objectives

This document defines the **authoritative V2 dashboard plan** for Prism-Apex, with explicit mapping to the current monorepo:

- **Repository**: `prism-apex-tool`
- **Dashboard app**: `apps/dashboard`
- **API app**: `apps/api`
- **Shared types**: `packages/shared` (e.g. `@prism-apex/shared`)

Primary objectives for V2:

1. Deliver a **production-grade operator dashboard** for:
   - Worklist V2
   - Tickets
   - Markets / Session Context
   - Analytics
   - Strategy Lab
   - Positions
   - System / Status
   - Alerts
2. Ensure all surfaces consume the **canonical models**:
   - `CanonicalTicket`
   - `SessionMetricsDto`
   - PnL / R-multiple fields (realised & planned)
3. Achieve **test-complete, visually consistent, and production-deployable** output:
   - All Vitest suites green (`apps/dashboard/src/__tests__`).
   - A3/V2 visual language consistent across pages.
   - Dockerised deploy for dashboard + API.

This is a **V2 mastering plan**, not a V3 re-architecture. Where necessary, tests may be adjusted to reflect the *correct* product behaviour, not the other way around.

---

## 2. System Context & Canonical Data

### 2.1 Canonical ticket model

Location(s):

- `packages/shared/src/tickets.ts` (or equivalent)  
- Usage:
  - `apps/dashboard/src/pages/WorklistV2.tsx`
  - `apps/dashboard/src/pages/Analytics.tsx`
  - `apps/dashboard/src/lib/worklistMock.ts`
  - `apps/api/src/routes/tickets/*.ts`

Key fields (non-exhaustive, but required for V2 surfaces):

- Identity & routing: `id`, `symbol`, `sessionDateUtc`, `strategyId`, `status`, `side`
- Risk: `quantity`, `perContractRisk`, `totalRisk`
- Planned: `expectedReward`, `rrMultiple`
- Realised: `pnl`, `pnlRMultiple`
- Context: `contextRegime`, `contextAtrBucket`, `contextOrType`, `notes`
- Timestamps: `createdAtUtc`, `completedAtUtc`

### 2.2 Session metrics model

Location(s):

- `apps/dashboard/src/lib/api.ts` – `SessionMetricsDto`, `fetchSessionMetricsBatch`, `makeSessionMetricsKey`
- `apps/api/src/routes/session-metrics/*.ts` – backend batch/session endpoints

Key fields used in V2:

- OR: `orHigh`, `orLow`, `orWidthPoints`
- Volatility: `sessionAtrPoints`, `volRegime`
- Trend: `htfTrendBias`
- VWAP: `vwapSlope`
- News: `hasMajorNewsToday`, `newsLabel`
- Quality: `sessionQualityFlag`, `sessionSkipReason`

### 2.3 Dataflow – from ingest to dashboard

High-level:

1. **Ingest**: Yahoo / venue bars, configuration, account phase → stored in time-series + relational tables.
2. **Engine**: Strategies and guardrails produce **tickets** with canonical shape.
3. **Session metrics service**: Aggregates OR, ATR, VWAP, regime, news for `(symbol, sessionDate)` keys.
4. **API**:
   - Tickets endpoints expose canonical tickets for ranges and filters.
   - Session metrics endpoints expose `SessionMetricsDto` for specific symbol/session or batch.
5. **Dashboard**:
   - `WorklistV2` and `Analytics` consume canonical tickets + session metrics.
   - `Markets / Session Context` visualises metrics + tickets for a symbol/session.
   - `Tickets` provides a stream/audit view.
   - `Status` / `Alerts` expose system/risk health.

---

## 3. Surface Inventory (What V2 Actually Ships)

### 3.1 Worklist V2

- File: `apps/dashboard/src/pages/WorklistV2.tsx`
- Styles: `apps/dashboard/src/styles/worklist-v2.css` (or equivalent V2/A3 CSS)
- Responsibilities:
  - Operator-facing **ticket worklist** with:
    - Score, symbol, strategy, side, R, PnL.
    - Session context chips (regime, OR type, ATR bucket, etc.).
  - Alignment with V2/A2 mocks (fonts, colours, layout, header).

### 3.2 Tickets

- File: `apps/dashboard/src/pages/Tickets.tsx`
- Tests: `apps/dashboard/src/__tests__/Tickets.test.tsx`
- Responsibilities:
  - Read-only ticket stream for audit and cross-checking Worklist.
  - Integrates with `/api/tickets` endpoint.
  - Clear loading, empty, and error states.

### 3.3 Markets / Session Context

- File: `apps/dashboard/src/pages/MarketData.tsx`
- Styles: `apps/dashboard/src/styles/markets-a3.css` (or equivalent)
- Tests: `apps/dashboard/src/__tests__/MarketData.test.tsx`
- Responsibilities:
  - Session-context cockpit: OR footprint, ATR, VWAP, regime.
  - Symbol/session selectors, overlay toggles (OR band, VWAP trace, ATR marker).
  - Table/shell for recent tickets in the selected market session.

### 3.4 Analytics

- File: `apps/dashboard/src/pages/Analytics.tsx`
- Tests: `apps/dashboard/src/__tests__/Analytics.test.tsx`
- Responsibilities:
  - Performance analytics surface over canonical tickets:
    - Filters: symbol, strategy, side, status, min R, search, time window.
    - Summary metrics: total risk, realised PnL, avg planned R, avg realised R, expectancy, win rate, best/worst R, avg duration.
    - Ticket-level detail panel + session metrics view.
  - Uses:
    - `fetchAnalyticsCanonicalTickets`
    - `fetchSessionMetricsBatch`
    - `getWorklistV2CanonicalTickets` (fallback)

### 3.5 Strategy Lab

- File: `apps/dashboard/src/pages/StrategyLab.tsx`
- Tests: `apps/dashboard/src/__tests__/StrategyLab.test.tsx`
- Responsibilities:
  - Sandbox for comparing strategies (ORR, VWAP, OSB, etc.) via PnL and R metrics.
  - Initially read-only / toy with mocks; later wired to real analytics APIs.

### 3.6 Positions

- File: `apps/dashboard/src/pages/Positions.tsx`
- Tests: `apps/dashboard/src/__tests__/Positions.test.tsx`
- Responsibilities:
  - Shows current synthetic/real positions & PnL.
  - Aligns with risk guardrails but **never** drives API execution.

### 3.7 Status / System

- File: `apps/dashboard/src/pages/Status.tsx`
- Tests: `apps/dashboard/src/__tests__/Status.test.tsx`
- Responsibilities:
  - Health / status page for:
    - Ingest, engine, session metrics, ticket pipeline.
  - Provides quick operator view of what is safe vs degraded.

### 3.8 Alerts

- File: `apps/dashboard/src/pages/Alerts.tsx`
- Tests: `apps/dashboard/src/__tests__/Alerts.test.tsx`
- Responsibilities:
  - Synthetic (for now) alerts cockpit:
    - Severity (info, warning, critical).
    - State (open, acknowledged, cleared).
    - Sources (risk, system, engine, infra, external).
  - Filter pills row with `.alerts-filters-row`.

---

## 4. V2 Epics & Stories (Execution Plan)

### EPIC V2.0 – Baseline Test-Complete Dashboard (DONE)

**Goal**: All V2 dashboard test suites passing with synthetic/mocked data where necessary.

- Scope:
  - All tests under `apps/dashboard/src/__tests__` passing:
    - `Alerts.test.tsx`
    - `Analytics.test.tsx`
    - `App.test.tsx`
    - `MarketData.test.tsx`
    - `Positions.test.tsx`
    - `Status.test.tsx`
    - `StrategyLab.test.tsx`
    - `Tickets.test.tsx`
    - `WorklistPnLCell.test.tsx`
    - `WorklistPnLColumns.test.tsx`
    - `pnlDisplay.test.ts`
- Status: **Complete** (baseline is green).

---

### EPIC V2.1 – Canonical Contracts & Shared Types

**Goal**: One source of truth for ticket and session metrics types, used consistently across API and dashboard.

**Stories**

- **[V2.1-1] Consolidate `CanonicalTicket`**
  - Confirm definition in `@prism-apex/shared` (or create it).
  - Ensure:
    - API routes in `apps/api/src/routes/tickets/**` use this type.
    - Dashboard pages (`WorklistV2`, `Analytics`, `MarketData`, `StrategyLab`) import from shared, not local re-declarations.

- **[V2.1-2] Consolidate `SessionMetricsDto`**
  - Confirm in `apps/dashboard/src/lib/api.ts` and corresponding API types in `apps/api`.
  - Ensure batch endpoint response matches `Record<string, SessionMetricsDto | null>` contract used by:
    - `AnalyticsPage`
    - `MarketDataPage`

- **[V2.1-3] PnL/R multiple semantics**
  - Document clearly in `docs/PRISM_APEX_PNL_MODEL.md`:
    - Relationship between `pnl`, `pnlRMultiple`, `rrMultiple`, `perContractRisk`, `totalRisk`.
  - Ensure front-end formatting helpers (`fmtR`, `fmtPrice`) and tests match the agreed semantics.

**Acceptance**

- No duplicate or conflicting ticket/metrics types in the repo.
- API responses and dashboard props aligned.
- PnL semantics documented and referenced from this master plan.

---

### EPIC V2.2 – Worklist V2 Productionisation

**Goal**: Worklist V2 is the **primary operator cockpit**, visually on-spec and using canonical models.

**Key files**

- `apps/dashboard/src/pages/WorklistV2.tsx`
- `apps/dashboard/src/styles/worklist-v2.css`
- `apps/dashboard/src/components/worklist/**` (if present)
- `apps/api/src/routes/worklist/**`
- `apps/dashboard/src/lib/worklistMock.ts`

**Stories**

- **[V2.2-1] Align Worklist V2 with A2/V2 visual spec**
  - Ensure header, filters, table, and detail panel match A2 mock:
    - A3-style shell (outer card, gradient background via `ExecutionShell`).
    - Full-width header, sticky filter bar, non-clipped columns.
  - Remove old “Execution” wording where not appropriate.

- **[V2.2-2] Canonical worklist plumbing**
  - Replace any ad-hoc ticket shape with `CanonicalTicket`.
  - Ensure mock worklist tickets in `getWorklistV2CanonicalTickets()` are canonical and consistent with API expectations.

- **[V2.2-3] Backend worklist endpoint (optional V2)**
  - If available in `apps/api`, wire `WorklistV2` to fetch from:
    - `/api/worklist/v2` or equivalent.
  - Provide fallback to mock on error/empty (ensuring operator still sees plausible tickets).

- **[V2.2-4] PnL and R display consistency**
  - Ensure Worklist PnL/R displays match `pnlDisplay` and `WorklistPnLCell` tests.
  - Confirm formatting and colouring of win/loss/flat states.

**Acceptance**

- Worklist V2 is visually and functionally aligned with mocks.
- It uses canonical tickets end-to-end.
- Tests for Worklist-related PnL cells/columns stay green.

---

### EPIC V2.3 – Tickets Stream

**Goal**: Tickets page is the canonical history/audit surface, wired to backend where available.

**Key files**

- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/__tests__/Tickets.test.tsx`
- `apps/api/src/routes/tickets/index.ts` (or similar)

**Stories**

- **[V2.3-1] Normalise API→UI mapping**
  - Implement transformation from API payload (e.g. `{ rows, total }`) into internal `TicketRow` with:
    - `id`, `symbol`, `strategy`, `side`, `entry`, `stop`, `target`, `rr`, `createdAt`.
  - Ensure mapping can evolve to canonical ticket wiring later without test breakage.

- **[V2.3-2] Robust states**
  - The three states enforced:
    - Loading: “Loading tickets…”
    - Empty: “No tickets returned for the current filters.”
    - Error: `Error loading tickets: <message>`
  - Keep tests in `Tickets.test.tsx` as the spec; adjust copy only if business wording truly changes.

- **[V2.3-3] Cross-check with Worklist**
  - Ensure fields displayed match the key attributes operators need to reconcile decisions with outcomes.

**Acceptance**

- Tickets view remains test-green.
- Operators can clearly see ticket stream and differentiate error vs empty vs loading.

---

### EPIC V2.4 – Markets / Session Context (A3)

**Goal**: Deliver a credible A3-style Markets session cockpit that can later accept real metrics and ticket data.

**Key files**

- `apps/dashboard/src/pages/MarketData.tsx`
- `apps/dashboard/src/styles/markets-a3.css`
- `apps/dashboard/src/__tests__/MarketData.test.tsx`
- `apps/api/src/routes/session-metrics/**`

**Stories**

- **[V2.4-1] Filters & overlays shell**
  - Ensure `.markets-a3-filters` contains:
    - Symbol selector
    - Session selector
    - Overlay toggles (OR band, VWAP trace, ATR marker) as buttons.
  - Text and behaviour must remain compatible with tests.

- **[V2.4-2] Session metrics binding (phase 1)**
  - Implement wiring from `fetchSessionMetricsBatch` or per-session endpoint when available.
  - Drive header meta (`Loading session metrics…` vs live) from actual network state.

- **[V2.4-3] Tickets-in-session table**
  - When canonical tickets are available for the selected `(symbol, sessionDate)`, populate the table in `MarketDataPage` accordingly.
  - When none, keep the explicit debug message:
    - “No payload loaded. Select a symbol and ensure SessionMetrics are available…”

**Acceptance**

- Markets page remains visually A3-aligned.
- Tests stay green while allowing a migration from fully synthetic to live-backed session metrics.

---

### EPIC V2.5 – Analytics Surface

**Goal**: Provide strategy-level performance analytics suitable for **real risk and scaling decisions**.

**Key files**

- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/__tests__/Analytics.test.tsx`
- `apps/dashboard/src/lib/api.ts`
- `apps/api/src/routes/analytics/**`

**Stories**

- **[V2.5-1] Live API-first analytics**
  - Prefer `fetchAnalyticsCanonicalTickets` over mock tickets when API returns non-empty sample.
  - Keep `getWorklistV2CanonicalTickets()` as a fallback.

- **[V2.5-2] Robust filtering**
  - Ensure filters (symbol, strategy, side, status, min R, search, window) all operate on canonical fields:
    - `symbol`, `strategyId`, `side`, `status`, `rrMultiple`
  - Search should index ticket + session metrics context as currently implemented.

- **[V2.5-3] Summary correctness**
  - `buildAnalyticsSummary` must compute:
    - `totalTickets`, `totalRisk`, `realizedPnl`
    - `avgPlannedR`, `avgRealizedR`, `expectancyR`
    - `winRatePct`, `bestR`, `worstR`
    - `avgDurationMinutes`
  - Cross-check these calculations with quant/risk.

- **[V2.5-4] Ticket-level detail**
  - Keep `DetailsSection` blocks (Ticket Summary, Risk & PnL, Session Metrics, Notes & Context) aligned with canonical fields and `SessionMetricsDto`.

**Acceptance**

- Analytics remains test-green.
- Data is numerically consistent with backend data and PnL model doc.
- Operators can reliably use V2 Analytics to evaluate strategies before scaling risk.

---

### EPIC V2.6 – Strategy Lab & Positions

**Goal**: Provide credible, safe, operator-only strategy experimentation and positions views.

**Key files**

- `apps/dashboard/src/pages/StrategyLab.tsx`
- `apps/dashboard/src/__tests__/StrategyLab.test.tsx`
- `apps/dashboard/src/pages/Positions.tsx`
- `apps/dashboard/src/__tests__/Positions.test.tsx`

**Stories**

- **[V2.6-1] Strategy Lab coherence**
  - Ensure Strategy Lab uses canonical tickets / analytics APIs where feasible.
  - If mocks are retained, ensure they are consistent with PnL model.

- **[V2.6-2] Positions surfacing**
  - Represent net position, average price, and current PnL (synthetic or real) without ever initiating execution.
  - Align copy with risk-guardrails, emphasising **read-only** nature.

**Acceptance**

- Both pages test-green.
- No execution paths from UI; operators only view state, not send orders.

---

### EPIC V2.7 – Status & Alerts / Operational Guardrails

**Goal**: Make operational risk and system health first-class in the dashboard.

**Key files**

- `apps/dashboard/src/pages/Status.tsx`
- `apps/dashboard/src/__tests__/Status.test.tsx`
- `apps/dashboard/src/pages/Alerts.tsx`
- `apps/dashboard/src/__tests__/Alerts.test.tsx`
- `apps/api/src/routes/health/**`, `apps/api/src/routes/alerts/**` (if/when implemented)

**Stories**

- **[V2.7-1] Status page health model**
  - Map backend health checks (ingest, engine, metrics, tickets API, DB, etc.) to human-readable panels.
  - Ensure degraded states are obvious and actionable.

- **[V2.7-2] Alerts feed evolution**
  - Replace/augment synthetic alerts in `AlertsPage` with real feeds when available:
    - Risk limit breaches.
    - Guardrail interventions.
    - System lagging / degraded.
  - Preserve filters and summary tiles; ensure tests still pass (adjusting only where behaviour is intentionally evolved).

**Acceptance**

- Status & Alerts are clearly usable by operators to understand when *not* to trade or when manual intervention is needed.

---

### EPIC V2.8 – UX/Visual Consistency & Polish

**Goal**: Unify A3/V2 visual language across all pages and eliminate regressions.

**Key files**

- `apps/dashboard/src/layouts/ExecutionShell.tsx`
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/styles/*.css`

**Stories**

- **[V2.8-1] Shell & layout consistency**
  - Ensure `ExecutionShell` is used appropriately so each page:
    - Has a consistent background, shell, and padding.
    - Avoids clipped tables; all column headers visible at common viewport widths.

- **[V2.8-2] Typography & density**
  - Ensure we use the same typographic scale and spacing as A2/A3 mocks (especially for headings, badges, chips, table headers).

- **[V2.8-3] Component hygiene**
  - Remove unused components/styles.
  - Centralise shared dashboard elements (badges, table wrapper, details panels).

**Acceptance**

- No page feels like a “different product”.
- All tables have visible headers and usable density on standard laptop resolution.

---

### EPIC V2.9 – Deployment & Ops

**Goal**: Make the V2 dashboard deployable in a reproducible way for operators.

**Key files**

- `docker-compose.yml`
- `apps/dashboard/Dockerfile`
- `apps/api/Dockerfile`
- `docs/PRISM_APEX_DELIVERY_PLAN.md`

**Stories**

- **[V2.9-1] Docker profiles**
  - Ensure we can run a self-contained environment for:
    - API + dashboard + DB (where applicable).
  - Honour Node 20 LTS and lockfiles.

- **[V2.9-2] Environment configuration**
  - Document expected env vars and config for:
    - API endpoints.
    - Session metrics service.
    - Feature flags (e.g. mock vs live analytics).

- **[V2.9-3] Smoke tests**
  - Define a minimal smoke-test checklist:
    - Worklist loads with canonical tickets.
    - Tickets stream works.
    - Analytics shows non-empty sample.
    - Status page shows healthy baseline.
    - No console errors in the main flows.

**Acceptance**

- V2 can be brought up by another engineer using only:
  - This document
  - `docs/PRISM_APEX_DELIVERY_PLAN.md`
  - `docker-compose` / Dockerfiles

---

## 5. References

- `docs/REPO_INDEX_V2.md` – locating key folders and modules.
- `docs/DOCS_CLASSIFICATION_V2.md` – doc taxonomy and ownership.
- `docs/PRISM_APEX_DELIVERY_PLAN.md` – broader phase plan including ingest/engine.
- `docs/PRISM_APEX_PNL_MODEL.md` – PnL/R semantics (to be created if not present).

This master plan is the **single source of truth** for the V2 dashboard.  
When tests, code, or behaviour diverge, **this document and product intent win**, and tests should be updated accordingly.


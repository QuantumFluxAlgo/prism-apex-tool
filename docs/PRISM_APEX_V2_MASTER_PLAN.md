# PRISM APEX – V2 MASTER PLAN (A3 DASHBOARD SURFACES)

_Last updated: 2025-12-08_

---

## 0. Purpose of this document

This document defines the **Prism Apex V2 Operator Dashboard** (A3 surfaces), the **current implementation status**, and the **forward path** to a production-ready A3 UX across all operator surfaces.

It is written for a new engineer + AI assistant so they can:

- See exactly what is **already working (true today)**.
- Understand the **target A3 UX pattern** for every dashboard.
- Know which pieces are **deliberately follow-up work**, not accidents.
- Keep all changes aligned with the **canonical engine / ticket / analytics model**.

This file, together with `docs/REPO_INDEX_V2.md`, is the **canonical source of truth** for what the V2 dashboard is and where it is going.

---

## 1. Product frame (high level)

Prism Apex is an **operator-assisted trading and risk platform**.

- It is **not** an auto-trader.
- The dashboard is a **read-only + ticket surface** over:

  - Ingest: Yahoo 1m bars and other feeds.
  - Engine: session metrics, strategy orchestration, guardrails.
  - Tickets: canonical ticket model (ORR / OSB / VWAP-FT / internal strategies).
  - Analytics: canonical analytics tickets and PnL views.

### 1.1 Non-negotiables

- The dashboard **does not place trades**.
- Output is **tickets + analytics + telemetry** for a human operator.
- Safety > cleverness – every surface exists to help an operator make a clear **yes/no** risk decision.
- All dashboard work must respect the **canonical models** in `@prism-apex/shared` and the API contracts in `apps/api`.

---

## 2. Architecture snapshot (UI side)

This section describes the **UI topology** and the **canonical building blocks** the V2 dashboard must use.

### 2.1 Key dashboard pages

All live dashboard pages are under:

- `apps/dashboard/src/pages`
- `apps/dashboard/src/layouts/ExecutionShell.tsx`

**Canonical V2 surfaces:**

- `WorklistV2.tsx` – V2 operator cockpit (A3 worklist surface).
- `Tickets.tsx` – canonical ticket history.
- `MarketData.tsx` – session / markets context cockpit (A3 shell).
- `Analytics.tsx` – analytics & PnL over canonical analytics tickets.
- `StrategyLab.tsx` – strategy lab surface, driven by canonical analytics tickets.
- `Status.tsx` – system status / telemetry.
- `Alerts.tsx` – alert stream.
- `Positions.tsx` – positions / exposure snapshot (currently synthetic).
- `layouts/ExecutionShell.tsx` – global shell (header, env badges, background).
- `App.tsx` – top-level router and page wiring.

**Legacy / non-V2 surfaces** (reference only):

- `Worklist.tsx` and `Worklist*.bak*` – V1 Worklist variants.
- Demo/auxiliary surfaces:
  - `DemoPnL.tsx`
  - `Downloads.tsx`
  - `Placeholder.tsx`
  - `Reports.tsx`
  - `StrategyConfig.tsx`

> **Rule:** Only the **V2 pages listed above** are canonical going forward. Legacy pages are for reference and cleanup only.

---

### 2.2 Shared UI primitives (stabilised)

Shared UI primitives live under:

- `apps/dashboard/src/ui`
- `apps/dashboard/src/components`

As of this plan:

#### Atoms / layout

- `ui/Card.tsx`  
  `Card`, `CardHeader`, `CardBody` for A3 surface framing.
- `ui/Button.tsx`  
  Primary/secondary button styles.
- `ui/Badge.tsx`  
  Compact label chips (env, modes, statuses, regimes).
- `ui/Kpi.tsx`  
  KPI tile (label + value, optional delta).
- `ui/Tooltip.tsx`  
  Hover hints.

#### Data surfaces

- `ui/DataTable.tsx` – generic typed table abstraction:

  - Props: `columns`, `rows`, `rowKey`, `loading`, `emptyMessage`.
  - **Important:** `rows` must always be an array (empty is fine).

- `ui/FiltersBar.tsx` – A2/A3-style compact filter strip used on Worklist, Tickets, Analytics, and other cockpit pages.

#### Feature components

- `components/WorklistPnLCell.tsx` – visual PnL cell using `Badge` + `Tooltip`.
- `utils/pnlDisplay.ts` – PnL formatting logic (unit-tested).

**Rules:**

- These primitives are **canonical** for V2 dashboard work.
- Page-local bespoke CSS blobs are **discouraged** unless there is a strong, documented reason.
- All V2 pages must use the A2/A3 tokens defined in:

  - `docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md`
  - `apps/dashboard/src/index.css`

---

### 2.3 API helper layer (dashboard side)

API helpers live under:

- `apps/dashboard/src/lib/apiBase.ts`
- `apps/dashboard/src/lib/api.ts`

#### `apiBase.ts` (canonical HTTP base)

- Resolves `API_BASE` from:

  - `VITE_API_BASE`
  - `VITE_API_URL`
  - `VITE_BACKEND_BASE`

- `resolveApiUrl()` – handles relative vs absolute URLs safely.
- `fetchJson()` – tolerant, normalised `fetch` wrapper:

  - Centralised error handling.
  - Normalised JSON/text parsing.
  - **Single entrypoint** for HTTP on the dashboard.

#### `api.ts` (canonical dashboard API helpers)

- `fetchTickets(...)` – canonical ticket history (`/api/tickets`).
- `buildCanonicalTicketFromRow(...)` – maps `TicketRow -> CanonicalTicket`.
- `fetchWorklistCanonicalTickets(...)` – constrained worklist feed wrapper (`/api/worklist`).
- `fetchAnalyticsCanonicalTickets(...)` – canonical analytics ticket feed.
- `fetchSessionMetrics(...)` / `fetchSessionMetricsBatch(...)` – session metrics helpers for Worklist, Analytics, and (future) Markets.
- `makeSessionMetricsKey(symbol, sessionDateUtc)` – stable keying for metrics maps.

> **Rule:** These helpers are the **only allowed HTTP surface** for V2 dashboard code. Any new API integration must go through `apiBase.ts` + `api.ts`.

---

## 3. Current implementation status (branch snapshot)

This section describes the **current true state** of the V2 dashboard on the active branch.

### 3.1 Test status

- **Vitest (dashboard suite):**
  - **11/11 test files, 28/28 tests passing.**

Coverage includes:

- Page-level tests:
  - `Alerts`
  - `Analytics`
  - `App`
  - `MarketData`
  - `Positions`
  - `Status`
  - `StrategyLab`
  - `Tickets`
- Component / utility tests:
  - `WorklistPnLCell`
  - `WorklistPnLColumns`
  - `pnlDisplay`

**Implications:**

- All canonical V2 surfaces **render without import errors**.
- Core behaviours such as loading/empty/error states and key copy are **guarded by tests**.

---

### 3.2 Shared imports & wiring

Verified as working and used in the current branch:

- UI atoms:

  - `Card`
  - `Badge`
  - `Button`
  - `Kpi`
  - `DataTable`
  - `FiltersBar`
  - `Tooltip`

- Data hooks / helpers:

  - `useWorklistTickets` – worklist hook over `/api/worklist` with mock fallback.
  - `fetchTickets`, `buildCanonicalTicketFromRow`.
  - `fetchAnalyticsCanonicalTickets`.
  - `fetchSessionMetrics`, `fetchSessionMetricsBatch`.
  - `makeSessionMetricsKey`.

- Page components:

  - `WorklistV2`
  - `Tickets`
  - `MarketData`
  - `Analytics`
  - `StrategyLab`
  - `Status`
  - `Alerts`
  - `Positions`

There are **no known broken imports** or obvious wiring gaps in the canonical V2 pages.

---

### 3.3 Worklist / WorklistV2

**Location**

- `apps/dashboard/src/pages/WorklistV2.tsx`
- `apps/dashboard/src/hooks/useWorklistTickets.ts`
- `apps/dashboard/src/lib/worklistMock.ts`

#### Current state (TRUE)

- `WorklistV2.tsx` is the **canonical V2 operator cockpit** for live signals.
- Uses `useWorklistTickets` as the **single worklist data hook**:

  - Primary source: engine-backed `GET /api/worklist`.
  - Tolerant of payload shapes:
    - `{ tickets: [...] }`
    - `{ worklist: [...] }`
    - bare `[...]`.
  - Fallback: `getWorklistV2CanonicalTickets()` mock when:
    - Engine is offline.
    - Payload shape is invalid.
    - No tickets are returned for the current view.

- Layout (A3 cockpit pattern):

  - A3 header under `ExecutionShell`:
    - Title “Worklist”.
    - Environment badges (e.g. SIM) and explicit read-only copy.
  - Filter strip:
    - Symbol, strategy, side, risk bucket, min score, max age, text search, reset.
  - KPI strip:
    - Ticket count.
    - Average score.
    - Risk bucket breakdown.
    - Latest ticket summary.
  - Main table:
    - Ticket ID, symbol, strategy, side, score, risk, PnL (ticks), age, created-at.
    - PnL columns use `WorklistPnLCell` + `pnlDisplay` utilities.
  - Details panel:
    - Ticket identity chips.
    - Core metrics, risk context.
    - Operator notes.
    - Explicit “read-only / guardrails live in engine” messaging.

- Testing:

  - `WorklistPnLCell.test.tsx` and `WorklistPnLColumns.test.tsx` both **green**.
  - PnL formatting is covered by `pnlDisplay.test.ts`.

#### Where we need to be (TARGET)

- API-backed filtering and pagination (push semantics into `/api/worklist`).
- Strategy-specific narratives (ORR / OSB / VWAP-FT) in the details panel.
- Full A3 visual QA against A2 mocks:
  - Spacing, typography, chip styles.
  - Table header visibility and alignment.
  - Consistent token usage.

---

### 3.4 Tickets

**Location**

- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/lib/api.ts`

#### Current state (TRUE)

- Tickets is an A3-style **ticket history / audit surface**.
- Uses `fetchTickets(...)` + `buildCanonicalTicketFromRow(...)` from `lib/api.ts`.

**Data path:**

- `GET /api/tickets` with standard filters:

  - `symbol`
  - `strategy`
  - `status`
  - `direction`
  - `scope`
  - `limit`

**Layout:**

- Header:

  - Title “Tickets”.
  - Badges:
    - `Read-only ticket history`
    - `Backed by /api/tickets`

- Filter strip:

  - Symbol
  - Strategy
  - Side
  - Status
  - Free-text search

- KPI strip:

  - Ticket count (post-filter).
  - LONG/SHORT split.
  - Average R multiple.
  - Latest ticket ID.

- Main table:

  - Ticket ID
  - Symbol
  - Strategy
  - Side
  - Entry / stop / target
  - R multiple
  - Created-at (UTC)

- Detail panel:

  - Chips for: ticket ID, symbol, strategy, side, status.
  - Grids for: entry/stop/target, R multiple, PnL amount, created-at.
  - Read-only disclaimer: routing and guardrails live in engine/back office.

**Testing:**

- `Tickets.test.tsx` asserts:

  - Loading state.
  - Happy-path data render.
  - Empty state.
  - Error state.
  - Core copy and structure remain stable.

#### Where we need to be (TARGET)

- More advanced time windows (session / week / month).
- Clear scopes (live session, archive, lab).
- Richer operator-level analytics signals:
  - Ticket error codes.
  - Guardrail reasons.
  - Risk bucket breakdowns.

---

### 3.5 Analytics

**Location**

- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/lib/api.ts`

#### Current state (TRUE)

- Analytics is an **A3 analytics cockpit over canonical analytics tickets**.

**Data sources:**

- `fetchAnalyticsCanonicalTickets(...)`:

  - Pulls canonical analytics tickets with:
    - `from`, `to` (ISO dates).
    - Optional `symbol`.
    - Optional `strategy`.
    - `limit`.

- `fetchSessionMetricsBatch(...)` + `makeSessionMetricsKey(...)`:

  - Overlay session metrics per ticket (OR/ATR/VWAP/trend/regime).

- `getWorklistV2CanonicalTickets()`:

  - Safe fallback when analytics feed is empty/unavailable.

**Behaviour:**

- Time-window presets:

  - `'7D'`, `'30D'`, `'90D'`, `'YTD'` mapped to `{ from, to }` ISO ranges.

- Filters:

  - Symbol: `ALL` + discovered symbols from sample.
  - Strategy: `ALL` + discovered `strategyId` values.
  - Side: `ALL / BUY / SELL`.
  - Status: `ALL / OPEN / COMPLETED / CANCELLED`.
  - Min R multiple: `ANY / 0 / 1 / 2`.
  - Free-text search across:
    - Ticket fields.
    - Context labels.
    - Session-metrics derived flags.

- Sample summary (AnalyticsSummary):

  - Total tickets in filtered sample.
  - Aggregated risk.
  - Realised PnL.
  - Average planned R.
  - Average realised R.
  - Expectancy R.
  - Win rate (%).
  - Best R, worst R.
  - Average duration (minutes) between created/completed.

- Table (A3 row-card pattern):

  - **Ticket** card:
    - Ticket ID, symbol, strategy, side, status.
    - Created/completed timestamps (UTC).
  - **Risk / PnL** card:
    - Total risk in currency.
    - Planned vs realised R multiple.
    - Realised PnL in currency.
    - Badge tone driven by win/loss/flat classification.
  - **Duration** card:
    - Time-in-trade in minutes.
  - **Session Context** card:
    - Summary string built from OR width, ATR, VWAP slope, trend bias, news flag.
    - Regime chips (volatility, session flag, skip reason, news).

- Detail panel:

  - Ticket summary:
    - ID, symbol, side, strategy, status, timestamps.
  - Risk & PnL:
    - Contracts, per-contract risk, total risk, expected reward.
    - Planned and realised R.
    - Realised PnL.
  - Session metrics:
    - OR high/low/width.
    - Session ATR points.
    - VWAP slope.
    - Trend bias.
    - Regime.
    - Session quality flag / skip reason.
    - News label or “None”.
  - Notes & context:
    - Context regime, ATR bucket, OR type, notes text.

**Testing:**

- `Analytics.test.tsx` ensures:

  - Page shell renders correctly.
  - Analytics helper is invoked as expected.
  - Behaviour remains wired and stable.

#### Where we need to be (TARGET)

- Regime and session pivots:

  - Pivots by symbol, strategy, volatility regime, session regime.

- Visualisations:

  - R-distribution.
  - Expectancy over time.
  - Session-level metrics trends (charts kept stable for tests).

- Cross-linking:

  - Drilldown pathways into Worklist/Tickets for the same symbol/strategy/session.

---

### 3.6 Markets (Session / Market Context)

**Location**

- `apps/dashboard/src/pages/MarketData.tsx`

#### Current state (TRUE)

- `MarketData.tsx` is an A3 **Session Context** cockpit with a **structurally correct shell**.

**Shell & copy:**

- Title: **“Session Context”**.
- Subheading text explicitly mentioning:
  - “Price overlays, OR / ATR footprint, VWAP slope, and regime flags”.

**Filters row (`.markets-a3-filters`):**

- Accessible **Symbol** combobox:

  - Currently a placeholder with a single `No symbols` option.

- Non-accessible **Session** selector:

  - Present for layout, hidden from accessibility tree.

- Overlay toggles:

  - Buttons: “OR band”, “VWAP trace”, “ATR marker”.

**Main panel:**

- Chart/table shell with class `.markets-a3-chart-shell`.
- Debug message:

  - “No payload loaded. Select a symbol and ensure SessionMetrics are available before relying on this view.”

- Table placeholder:

  - Columns: Time, Side, Entry, Stop, Target, R:R, PnL (R), Status.
  - Single row instructing:
    - “Select a symbol and session to view tickets.”

**Detail panel:**

- Header: “Session Details”.
- Copy describing OR/ATR, VWAP, trend, regime, and news flags.
- Placeholder card instructing the operator to select a symbol/session.

**Reality:**

- Page is currently **synthetic**:

  - No live call to `fetchSessionMetricsBatch(...)` in this surface.
  - Designed to satisfy tests and layout requirements, not full metrics yet.

**Testing:**

- `MarketData.test.tsx` validates:

  - Page headline.
  - Filters row + overlay toggles.
  - Presence of `.markets-a3-chart-shell` and debug copy.

#### Where we need to be (TARGET)

- Replace synthetic state with real session metrics:

  - Use `fetchSessionMetricsBatch(...)` and `session-metrics` routes.
  - Add curated symbol set (ES/NQ/CL/YM) based on configs.

- Per-symbol cards:

  - Quality flag, volatility regime, trend bias.
  - OR high/low/width, ATR points, OR/ATR ratio.
  - Basic news flags (major event vs none).

- Detail panel:

  - Full OR and ATR metrics.
  - VWAP slope.
  - Trend bias.
  - Volatility regime.
  - Session flags and skip reasons.
  - Clear “read-only guardrail context” narrative.

- Cross-linking:

  - Jump from Markets to Worklist/Tickets filtered by symbol/session.

---

### 3.7 Strategy Lab, Status, Alerts, Positions

#### Strategy Lab

**Location**

- `apps/dashboard/src/pages/StrategyLab.tsx`

**Current (TRUE):**

- Uses canonical analytics helper to drive **Lab KPIs**.
- Renders:

  - Strategy preset strip (e.g. ORR / OSB / VWAP-FT).
  - Mode toggle between lab vs live focus.
  - Lab KPIs derived from analytics tickets.

- Tests:

  - `StrategyLab.test.tsx` covers:
    - Loading state.
    - Helper invocation.
    - Basic KPI rendering.

**Target:**

- Per-ticket analytics table for the selected lab preset.
- “Config snapshot” panel describing:

  - Risk per trade.
  - Guardrails.
  - Expected behaviour by regime.

- Lab vs live comparison view:

  - Toggle or side-by-side.

---

#### Status

**Location**

- `apps/dashboard/src/pages/Status.tsx`

**Current (TRUE):**

- A3-style **System Status** cockpit.
- KPI tiles summarising:

  - Healthy components.
  - Degraded components.
  - Down components.

- Main table:

  - Category (engine/external/infra/etc.).
  - Name.
  - Status.
  - Details.
  - Last updated timestamp.

- Backed by **synthetic but realistic** merged status data sufficient for tests and operator overview.

- Tests:

  - `Status.test.tsx` validates:
    - Headline “System Status”.
    - Presence of core tiles for engine and external dependencies.
    - Healthy components summary.

**Target:**

- Canonical wiring to:

  - `/api/status`
  - `/api/system.jobs`
  - `/api/system.telemetry`

- Clear mapping of:

  - Jobs.
  - Queues.
  - External APIs.
  - Infra health.

- Strong operator copy for **what to do** when parts degrade.

---

#### Alerts

**Location**

- `apps/dashboard/src/pages/Alerts.tsx`

**Current (TRUE):**

- A3 **Alerts cockpit** using a **synthetic but realistic in-memory feed**.

**Alert model:**

- Severity:

  - `info`
  - `warning`
  - `critical`

- State:

  - `open`
  - `acknowledged`
  - `cleared`

- Source:

  - `risk`
  - `system`
  - `engine`
  - `infra`
  - `external`

**Layout:**

- Header:

  - Title “Alerts”.
  - Badges:
    - `Critical alerts present` / `No critical alerts`.
    - `Synthetic · Read-only`.

- KPI tiles:

  - Open alerts.
  - Critical open alerts.
  - Alerts “in workflow” (acknowledged).

- Filters row (`.alerts-filters-row`):

  - Two filter groups (`.alerts-filter-group`):
    - Severity pills.
    - State pills.
  - Active pills use:
    - `alerts-filter-pill alerts-filter-pill--active`.

- Table:

  - Columns:
    - Created.
    - Severity (badge).
    - State.
    - Source.
    - Title.
    - Message.

**Target:**

- Replace synthetic seed with canonical alerts from `/api/system.alerts`.
- Align severity policy with the risk engine & system telemetry.
- Dedicated copy and filtering for account/session-level incidents.

---

#### Positions

**Location**

- `apps/dashboard/src/pages/Positions.tsx`

**Current (TRUE):**

- A3 **Positions** surface with a **synthetic but realistic placeholder implementation**.

**Behaviour:**

- Initial placeholder:

  - A card with literal text **“Loading…”** followed by:
    - “Fetching synthetic positions from ticket history.”
  - Tests rely on this exact `Loading…` text.

- KPI strip:

  - Active positions.
  - Symbols active.
  - Contracts (synthetic).
  - Unrealised PnL (currently flagged as requiring broker).

  All currently show `—` because live broker integration is not wired.

- Main table:

  - Columns:
    - Symbol.
    - Side.
    - Contracts.
    - Sample ticket.
    - Last updated.
    - Notes.
  - Placeholder row with text:
    - “No synthetic positions available. Either there are no open tickets in the recent window, or the engine is not emitting canonical ticket status yet.”

- Tests:

  - `Positions.test.tsx` validates:
    - Presence of the `Loading…` placeholder.
    - “Active positions” KPI text.

**Target:**

- Short term:

  - Synthetic positions derived from ticket history:
    - Aggregate non-completed tickets by symbol/side.
    - Derive synthetic exposure and sample tickets.

- Medium term (post Tradovate integration):

  - Broker-backed positions:
    - Reconciled positions.
    - Live unrealised PnL.
    - Risk buckets / guardrails.

- Detail panel:

  - Per-symbol exposure.
  - Session context and risk guardrails.
  - Alignment with Apex account rules.

---

## 4. Epics and stories (Option C approach)

We are explicitly following **Option C**:

> Ship **minimal but real** surfaces now, then iterate into richer features.

Anything marked `[FOLLOW-UP]` is intentionally deferred work, **not** a gap.

---

### EPIC V2.1 – Worklist V2 A3 Cockpit (Primary)

**Goal:** One **serious operator cockpit** that a CEO can look at and understand.

#### Current (TRUE)

- Worklist V2 A3 cockpit implemented at `WorklistV2.tsx`.
- Uses `useWorklistTickets` over `/api/worklist` with canonical-shape mock fallback.
- A3 layout: header, filters, KPIs, table, detail panel.
- PnL columns fully wired via `WorklistPnLCell` + `pnlDisplay`.
- Relevant tests are all green.

#### Target

- API-driven filters and pagination.
- Strategy-specific narratives in the details panel.
- Full A3 visual parity with A2 mocks.

#### Stories

1. **W1 – A3 layout shell for Worklist V2**  
   Refine header, filters bar, KPIs, table, and detail panel strictly against the A2 Worklist spec and tokens.

2. **W2 – Canonical Worklist table wiring**  
   Ensure columns are strictly canonical (`CanonicalTicket` / worklist DTO), with no ad-hoc fields.

3. **W3 – Operator filters**  
   Move more filtering semantics into the API instead of client-only filtering.

4. **W4 – Ticket detail panel**  
   Add richer guardrail and narrative explanations per strategy.

5. **W5 – Visual QA vs A2 mocks**  
   Iterate until mocks and live surface are recognisably the same product.

---

### EPIC V2.2 – Tickets & Markets Surfacing

**Goal:** Tickets and Markets use the same A3 structure as Worklist and are backed by canonical feeds where available.

#### Current (TRUE)

- **Tickets:**
  - Fully A3-ified ticket history surface, backed by `/api/tickets`.
  - Tests green for loading, happy-path, empty, and error states.

- **Markets:**
  - A3 Session Context shell implemented.
  - Synthetic content with correct structural landmarks for tests.
  - No live session metrics wiring yet.

#### Target

- **Tickets:**
  - Richer time windows and scopes.
  - Tighter integration with analytics views.

- **Markets:**
  - Live session metrics from `/api/session-metrics`.
  - Per-symbol regime, OR/ATR, trend, news context.
  - Cross-links to Worklist/Tickets.

#### Stories

1. **T1 – Tickets page uses shared A3 layout (DONE)**  
   Keep as-is; refine only where tests and UX require.

2. **T2 – Advanced tickets filters** `[FOLLOW-UP]`  
   Introduce engine-driven scopes and richer window presets.

3. **M1 – Markets cockpit frame (DONE – SHELL)**  
   Shell matches A3 expectations and tests.

4. **M2 – Markets data path** `[FOLLOW-UP]`  
   Wire real session metrics, add symbol sets and cross-links.

---

### EPIC V2.3 – Analytics & Strategy Lab (Canonical Analytics Tickets)

**Goal:** Solid Analytics & Strategy Lab surfaces built on **canonical analytics ticket feeds**.

#### Current (TRUE)

- **Analytics:**
  - Fully wired to `fetchAnalyticsCanonicalTickets` + `fetchSessionMetricsBatch`.
  - Provides rich KPIs, detailed ticket row-cards, and aggregated sample summary.

- **Strategy Lab:**
  - Preset strip, mode toggle, and Lab KPIs over analytics tickets.
  - Tests confirm behaviour.

#### Target

- Regime/session pivots in Analytics.
- R-distribution and expectancy visualisations.
- Strategy Lab table + config snapshot.
- Lab vs live comparison toggles.

---

### EPIC V2.4 – System, Alerts, Positions

**Goal:** Make Status, Alerts, Positions **operator-useful at a glance**.

#### Current (TRUE)

- **Status:**
  - Healthy/degraded/down counts.
  - Engine/external components table.
- **Alerts:**
  - Synthetic but realistic alert stream with severity/state filters.
- **Positions:**
  - Synthetic placeholder page with clear forward story and correct tests.

#### Target

- **Status:**
  - Live integration to jobs/telemetry/alerts routes.

- **Alerts:**
  - Canonical feed from system alerts store.

- **Positions:**
  - Synthetic positions from ticket history, then broker-backed positions.

---

### EPIC V2.5 – UX, consistency, and tokens

**Goal:** Every page feels like **one coherent product**.

#### Stories

1. **U1 – Token audit**  
   Eliminate stray hex colours; normalise typography and spacing using A2 tokens.

2. **U2 – A3 pattern enforcement**  
   Enforce the shell → header → filters → KPIs → table → details pattern on all main surfaces.

3. **U3 – Mobile / small viewport sanity** `[FOLLOW-UP]`  
   Ensure graceful degradation on smaller viewports (horizontal scroll acceptable; broken layouts are not).

---

### EPIC V2.6 – Testing & observability

**Goal:** Keep the suite green while evolving the dashboard.

#### Stories

1. **TST1 – Maintain green dashboard tests (DONE, KEEPING)**  
   Any refactor must either keep or update the existing tests.

2. **TST2 – Incremental test coverage**  
   New behaviours (filters, error states, PnL variants) must gain tests.

3. **OBS1 – Log / event hooks** `[FOLLOW-UP]`  
   Instrument key user actions (filter changes, etc.) for later observability.

---

### EPIC V2.7 – Cleanup & dead code removal

**Goal:** Reduce confusion and surface area.

#### Stories

1. **CLN1 – Legacy Worklist** `[FOLLOW-UP]`  
   Archive/remove V1 Worklist variants once V2 is fully adopted.

2. **CLN2 – Mock & stub rationalisation**  
   Keep only canonical-shape mocks still in use; remove dead ones.

3. **CLN3 – Docs alignment**  
   Keep this file and `REPO_INDEX_V2.md` in lockstep with actual code and models.

---

## 5. Quality gates

Before calling V2 “dashboard ready”:

1. **All tests green**  
   - Already true now for the dashboard suite.

2. **Worklist V2 A3 cockpit**

   - Visually close to A2 mocks.
   - Uses canonical ticket + metrics.
   - Works end-to-end with real or canonical-mock data.

3. **Tickets, Markets, Analytics, Strategy Lab, Status, Alerts, Positions**

   - Use consistent A3 structure.
   - No obvious UX regressions or broken layouts.
   - No broken imports or runtime errors.

4. **Docs**

   - This plan and `REPO_INDEX_V2.md` accurately describe:
     - File locations.
     - Canonical models.
     - Current vs follow-up work.

---

## 6. How to work on this going forward

Principles for future engineers and AI assistants:

- **Do not start from scratch.**

  - Inspect existing pages, shared UI atoms, and tests first.

- **Prefer refactor over rewrite.**

  - If tests already pass, evolve behaviour/layout incrementally and update tests alongside.

- **Respect canonical models.**

  - `@prism-apex/shared` contracts and API routes in `apps/api` are the ground truth.
  - Mocks must mirror canonical shapes exactly.

- **Keep tests and docs in sync.**

  - Any non-trivial UI change:
    - Should update or add tests that codify the intended behaviour.
    - Must update this plan and `REPO_INDEX_V2.md` if it changes surfaces or contracts.

This document is the **single source of truth** for what the Prism Apex V2 dashboard is **today**, and what is **deliberately deferred** vs **accidentally missing**.


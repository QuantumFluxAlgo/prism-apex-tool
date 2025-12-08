# PRISM APEX – V2 DASHBOARD PLAN (A3 SURFACES)

_Last updated: 2025-12-08_

## 0. Purpose of this document

This document describes the **V2 operator dashboard** surfaces (A3 layout) for the Prism-Apex Tool, and the **current state of implementation** on the active branch.

It is designed so that a new engineer + AI assistant can:

- See exactly what is **already working**.
- Understand the **target UX pattern** for all dashboards.
- Know which pieces are **follow-up work** rather than missing by accident.
- Keep changes aligned with the **canonical engine / ticket / analytics model**.

---

## 1. Product frame (high level)

Prism-Apex is an **operator-assisted trading and risk platform**. The dashboard is a **read-only + ticket surface** over:

- Ingest: Yahoo 1m bars and other feeds.
- Engine: Session metrics, strategy orchestration, risk guardrails.
- Tickets: Canonical ticket model (ORR / OSB / VWAP-FT etc.).
- Analytics: Canonical analytics tickets and PnL views.

Non-negotiables:

- **No direct order routing** from the dashboard.
- Output is **tickets + analytics + telemetry** for a human operator.
- Safety > cleverness. Every surface must help a human say “yes/no” to risk and execution.

---

## 2. Architecture snapshot (UI side)

### 2.1 Key dashboard pages

UI pages (React, Vite, Vitest) in `apps/dashboard/src`:

- `pages/Worklist.tsx` – legacy worklist.
- `pages/WorklistV2.tsx` – **V2 operator cockpit** (target Worklist A3 surface).
- `pages/Tickets.tsx` – canonical ticket history.
- `pages/MarketData.tsx` – markets / session cockpit.
- `pages/Analytics.tsx` – analytics & PnL pivots over canonical analytics tickets.
- `pages/StrategyLab.tsx` – lab-only surface, comparing config vs canonical analytics.
- `pages/Status.tsx` – system status / telemetry.
- `pages/Alerts.tsx` – alert stream.
- `pages/Positions.tsx` – positions / risk snapshot.
- `layouts/ExecutionShell.tsx` – global shell (header, env badges, background).
- `App.tsx` – top-level router and page wiring.

### 2.2 Shared UI primitives (stabilised)

Shared UI components live under `apps/dashboard/src/ui` and `apps/dashboard/src/components`.

As of this plan:

- **Atoms / layout**
  - `ui/Card.tsx` – `Card`, `CardHeader`, `CardBody` for A3 surface framing.
  - `ui/Button.tsx` – primary/secondary button styles.
  - `ui/Badge.tsx` – compact label chips (env, modes, statuses).
  - `ui/Kpi.tsx` – small KPI tile (label + value, optional delta).
  - `ui/Tooltip.tsx` – hover hints.

- **Data surfaces**
  - `ui/DataTable.tsx` – generic table:
    - Props: `columns`, `data`.
    - **Important**: `data` must always be an array (empty is fine).
  - `ui/FiltersBar.tsx` – A2/A3-style compact filter strip.

- **Feature components**
  - `components/WorklistPnLCell.tsx` – PnL cell using `Badge` and `Tooltip`.
  - `utils/pnlDisplay.ts` – formatting logic (tested).

---

## 3. Current implementation status (branch snapshot)

State as of the latest test run:

- **Vitest**:
  - All dashboard tests green: **11/11 files, 28/28 tests pass**.
  - Coverage includes:
    - Alerts, Analytics, App, MarketData, Positions, Status, StrategyLab, Tickets.
    - Worklist PnL cell, Worklist PnL columns, PnL display utilities.

- **Shared imports & UI wiring**:
  - `Card`, `Badge`, `Button`, `Kpi`, `DataTable`, `FiltersBar`, `Tooltip` are all correctly importable and used in pages and components.
  - `WorklistV2`, `Tickets`, `MarketData`, `Analytics`, `StrategyLab`, `Status`, `Alerts`, `Positions` all render without import errors.

- **Worklist / WorklistV2**:
  - V2 cockpit exists at `apps/dashboard/src/pages/WorklistV2.tsx`.
  - Uses `useWorklistTickets` as the single worklist data hook.
  - Data path:
    - Primary source: `GET /api/worklist` (engine-backed), tolerant of `{ tickets: [...] }`, `{ worklist: [...] }`, or bare arrays.
    - Fallback: in-memory `WorklistTicket[]` mock when engine or shape is unavailable.
  - Layout:
    - A3-style header under `ExecutionShell`.
    - Filters bar (symbol, strategy, side, risk bucket, score, age, text search).
    - KPI strip (count, score, risk breakdown, latest ticket).
    - Data table with canonical worklist tickets.
    - Right-hand details panel with ticket narrative and guardrail messaging.
  - Tests:
    - `WorklistPnLCell` and `WorklistPnLColumns` fully covered.
    - PnL formatting utility covered via `pnlDisplay` tests.

- **Tickets**:
  - A3-style ticket history surface at `apps/dashboard/src/pages/Tickets.tsx`.
  - Uses `fetchTickets` from `apps/dashboard/src/lib/api.ts` plus `buildCanonicalTicketFromRow`.
  - Data path:
    - `GET /api/tickets` with filters (symbol, strategy, side, status, search, scope, limit).
  - Layout:
    - Header: “Tickets” + badges (`Read-only ticket history`, `Backed by /api/tickets`).
    - Filter bar: symbol, strategy, side, status, text search.
    - KPI strip: visible tickets, long/short split, avg R multiple, latest ticket ID.
    - Table: ticket ID, symbol, strategy, side, entry/stop/target, R multiple, created-at.
    - Detail panel: ID/symbol/strategy/side/status chips; grids for price levels, R multiple, PnL amount, created-at.
  - Tests:
    - `TicketsPage` tests cover loading, happy-path data render, empty state, and error state.

- **Analytics (canonical analytics tickets)**:
  - A3 Analytics surface at `apps/dashboard/src/pages/Analytics.tsx`.
  - Uses `fetchAnalyticsCanonicalTickets` from `apps/dashboard/src/lib/api.ts`.
  - Data path:
    - Calls analytics feed over `/api/tickets` (canonical analytics ticket feed) with:
      - `from` / `to` (ISO dates),
      - `symbol` (optional),
      - `strategy` (optional),
      - `limit`.
  - Behaviour:
    - Time-window presets: Today / Last 7 days / Last 30 days.
    - Filters: symbol (ALL/ES/NQ/CL/YM), strategy (ALL/ORR/OSB/VWAP-FT).
    - KPIs:
      - Total PnL (sum over tickets),
      - Win rate (percentage of trades with positive R multiple),
      - Average R multiple,
      - Trade count.
    - Table:
      - Date, symbol, strategy, side, entry, exit, PnL, R multiple, status.
    - Detail panel:
      - Shows selected trade with ID, symbol, strategy, side, R multiple, per-contract risk, expected reward, total risk, realized PnL, and created/session timestamps.
      - Explicit guardrail statement: analytics is read-only; config changes live in engine/back-office.
  - Tests:
    - `Analytics.test.tsx` still passes and validates:
      - Page shell renders correctly.
      - Analytics helper is called (behaviour consistent with previous expectations).

- **Markets (session cockpit over canonical session metrics)**:
  - Markets surface at `apps/dashboard/src/pages/MarketData.tsx`.
  - Uses `fetchSessionMetricsBatch` and `makeSessionMetricsKey` from `apps/dashboard/src/lib/api.ts`.
  - Data path:
    - Batch fetch of `SessionMetricsDto` for a fixed symbol set (ES, NQ, CL, YM) for a given `sessionDate`.
    - Backed by `/api/session-metrics`.
  - Behaviour:
    - Inputs:
      - Session date selector (HTML date input).
      - Symbol selector (ES/NQ/CL/YM).
    - Per-symbol summary cards:
      - Quality flag, vol regime, trend bias.
      - OR high/low/width, ATR (points), OR/ATR ratio.
      - Basic news flag (major news / none).
    - Detail panel for selected symbol:
      - Opening range, OR width, ATR, OR/ATR ratio.
      - Vol regime, trend bias, VWAP slope where available.
      - Session skip reason / quality notes.
      - Explicit “read-only guardrail context” narrative.
  - Tests:
    - `MarketData.test.tsx` remains green and still validates headline, shell chrome, and basic status expectations.

- **Strategy Lab**:
  - Strategy Lab page present at `apps/dashboard/src/pages/StrategyLab.tsx`.
  - Uses canonical analytics helper and renders:
    - Lab presets strip (strategy presets),
    - Mode toggle (lab vs live focus),
    - Lab KPIs driven off analytics tickets.
  - Tests:
    - `StrategyLab.test.tsx` covers loading state, helper invocation, and basic KPI rendering.

- **Status / Alerts / Positions**:
  - `Status.tsx`, `Alerts.tsx`, and `Positions.tsx` pages exist and pass current tests.
  - Layouts follow A3 shell and use shared primitives.
  - **NOTE:** UX and data richness are intentionally below “final” standard and are the next targets for hardening (see EPIC V2.4).


---

## 4. Epics and stories (Option C approach)

We are explicitly following **Option C**: ship **minimal but real** surfaces now, then iterate into richer features. Anything marked `[FOLLOW-UP]` is intentionally deferred, not forgotten.

### EPIC V2.1 – Worklist V2 A3 Cockpit (Primary)

Goal: **One serious operator cockpit** that a CEO can look at and understand.

**Delivered (IMPLEMENTED IN CODE)**

- **Worklist V2 A3 cockpit**
  - Page: `apps/dashboard/src/pages/WorklistV2.tsx`
  - Uses `useWorklistTickets` (`apps/dashboard/src/hooks/useWorklistTickets.ts`) as the **single worklist data hook**:
    - Primary source: `GET /api/worklist` (engine-backed; tolerant of `{ tickets: [...] }`, `{ worklist: [...] }`, or bare arrays).
    - Safe mock fallback: in-memory `WorklistTicket[]`, used when engine is offline or payload shape is invalid.
  - Layout:
    - Header under `ExecutionShell` (Worklist title + SIM/environment copy, read-only warning).
    - Filter strip: symbol, strategy, side, risk bucket, min score, max age, text search, reset.
    - KPI strip: ticket count, avg score, risk-bucket breakdown, latest ticket.
    - Main table: ticket ID, symbol, strategy, side, score, risk, PnL (ticks), age, created-at.
    - Right-hand details panel: ticket identity (chips), basic metrics, notes, and “read-only / guardrails live in engine” messaging.

- **Tickets A3 cockpit**
  - Page: `apps/dashboard/src/pages/Tickets.tsx`
  - Uses **canonical tickets API helper** from `apps/dashboard/src/lib/api.ts`:
    - Calls `fetchTickets({ symbol, strategy, status, direction, scope, limit })`.
    - Uses `mapRowForDisplay` to adapt the server `TicketRow` into a minimal renderable shape.
  - Design constraints:
    - **No router dependency** in the test surface – page does not wrap itself in `ExecutionShell`, avoiding `react-router` context issues in tests.
    - Keeps all test expectations intact (strings and behaviour for loading, empty state, and error handling).
  - Layout:
    - Header: “Tickets” + badges (`Read-only ticket history`, `Backed by /api/tickets`).
    - Filter strip: symbol, strategy, side, status, search.
    - KPI strip: ticket count, L/S split, avg R multiple, latest ticket.
    - Main table: ticket ID, symbol, strategy, side, entry/stop/target, R multiple, created-at (UTC).
    - Details panel: chips for ID, symbol, strategy, side, status; grids for prices, R multiple, PnL amount, created-at.

- **API layer alignment**
  - `apps/dashboard/src/lib/apiBase.ts`
    - Central `API_BASE` resolution: `VITE_API_BASE`, `VITE_API_URL`, `VITE_BACKEND_BASE`.
    - `resolveApiUrl()` to safely handle relative vs absolute URLs.
    - `fetchJson()` wrapper to normalise real and mocked responses.
  - `apps/dashboard/src/lib/api.ts`
    - `fetchTickets(...)`: canonical tickets API building URLs against `API_BASE` or `window.location.origin`/`http://localhost`.
    - `buildCanonicalTicketFromRow(...)`: single mapping for `TicketRow -> CanonicalTicket`.
    - `fetchWorklistCanonicalTickets(...)`: constrained wrapper for actionable/open worklist feed.
    - `fetchAnalyticsCanonicalTickets(...)`: canonical historical feed for analytics.
    - `fetchSessionMetrics(...)` / `fetchSessionMetricsBatch(...)`: session metrics helpers for Worklist V2 & Analytics.

- **Test status**
  - `apps/dashboard` vitest suite: **11/11 files, 28/28 tests passing**.
  - Specific coverage:
    - `src/__tests__/WorklistPnLCell.test.tsx`
    - `src/__tests__/WorklistPnLColumns.test.tsx`
    - `src/__tests__/Tickets.test.tsx`
    - Plus `Alerts`, `Analytics`, `App`, `MarketData`, `Positions`, `Status`, `StrategyLab`, `pnlDisplay`.

**Remaining work (NOT DONE YET)**

- Markets V2 A3 cockpit aligned to canonical prices/positions/tickets.
- Analytics V2 surfaces fully backed by `fetchAnalyticsCanonicalTickets(...)` + session metrics batch helper.
- Strategy Lab, System/Status, Alerts – A3 hardening and full canonical wiring.
- Final UI polish for A3: spacing, typography, and component reuse across all dashboards.
- End-to-end smoke flows:
  - Yahoo/Tradovate → engine → `/api/worklist` & `/api/tickets` → Worklist V2 & Tickets surfaces.

**Stories**

1. **W1 – A3 layout shell for Worklist V2**
   - Use `ExecutionShell` + `Card` to frame:
     - Header (title “Worklist”, env badges, clock text).
     - Filters bar (`FiltersBar`) pinned under header.
     - KPIs row (via `Kpi` tiles).
     - Main `DataTable` with canonical worklist tickets.
     - Right-hand details panel.
   - All using shared UI atoms (no page-local one-off CSS blobs).

2. **W2 – Canonical Worklist table wiring**
   - Table rows use the **canonical ticket / worklist DTO**.
   - Columns: ticket ID, symbol, strategy, side, score, risk bucket, age, PnL, tags.
   - PnL columns use `WorklistPnLCell` + `pnlDisplay` utilities.
   - Data path:
     - Live fetch if endpoint is present.
     - **[FOLLOW-UP]** – Clean fallback mock that mirrors canonical types.

3. **W3 – Operator filters**
   - Filters (symbol, strategy, side, min score, risk bucket, max age, search) wired to state.
   - Filtering done client-side for now.
   - **[FOLLOW-UP]** – Push filters into API query parameters where appropriate.

4. **W4 – Ticket detail panel**
   - Click row → detail panel shows:
     - Ticket ID, symbol, side, size, price levels.
     - Risk guardrails summary.
     - Engine notes or diagnostic tags.
   - **[FOLLOW-UP]** – ORR/OSB/VWAP-FT specific narratives per ticket.

5. **W5 – Visual QA vs A2 mocks**
   - Compare Worklist V2 live UI to A2 mocks:
     - Layout widths, typography, padding, chip styles, table header visibility.
   - Fix mismatches using shared tokens (no random hex colours).

---

### EPIC V2.2 – Tickets & Markets Surfacing

Goal: **Tickets** and **Markets** use the same A3 structure as Worklist V2 and are backed by canonical feeds.

**Delivered (IMPLEMENTED IN CODE)**

- **Tickets (A3 ticket history)** – DONE
  - Page: `apps/dashboard/src/pages/Tickets.tsx`.
  - Uses `fetchTickets` + `buildCanonicalTicketFromRow` from `apps/dashboard/src/lib/api.ts`.
  - Filters: symbol, strategy, side, ticket status, text search.
  - KPIs: visible tickets, long/short split, avg R multiple, latest ticket ID.
  - Table: ID, symbol, strategy, side, entry/stop/target, R multiple, created-at.
  - Detail panel: ticket identity chips, price levels, PnL, R multiple, created-at; read-only risk/execution narrative.
  - Tests: `Tickets.test.tsx` fully green (loading, happy path, empty, error).

- **Markets (session metrics cockpit)** – DONE (FIRST PASS)
  - Page: `apps/dashboard/src/pages/MarketData.tsx`.
  - Uses `fetchSessionMetricsBatch` + `makeSessionMetricsKey` to read canonical `SessionMetricsDto` values.
  - Inputs:
    - Session date selector.
    - Symbol selector for a fixed curated set (ES, NQ, CL, YM).
  - Per-symbol cards:
    - Quality flag, vol regime, trend bias.
    - OR high/low/width, ATR (points), OR/ATR, basic news flag.
  - Detail panel:
    - Opening range, OR width, ATR, OR/ATR.
    - VWAP slope, skip reason, quality narrative.
    - Clear “read-only” copy: this is **context for operators**, not an override panel for engine rules.
  - Tests: `MarketData.test.tsx` still passes and validates page headline and layout.

**Remaining work (FOLLOW-UP)**

- **T2 – Advanced tickets filters** `[FOLLOW-UP]`
  - Extend tickets surface with:
    - Richer time windows (session, week, month).
    - Engine-driven scopes (e.g. “live session”, “lab”, “archive”).
  - Push more of the filter semantics into `/api/tickets` rather than only client-side filtering.

- **M2 – Markets depth and cross-links** `[FOLLOW-UP]`
  - Deepen Markets with:
    - Link-out into Worklist/Tickets for the same symbol/session.
    - Visual annotations for regimes (e.g. poor-quality sessions flagged aggressively).
    - Optional mini-history for OR/ATR over last N sessions.

### EPIC V2.3 – Analytics & Strategy Lab (Canonical Analytics Tickets)

Goal: Solid Analytics & Strategy Lab surfaces on top of the **canonical analytics ticket feed**.

**Delivered (IMPLEMENTED IN CODE)**

1. **A1 – Analytics KPIs over canonical analytics tickets (DONE)**
   - Page: `apps/dashboard/src/pages/Analytics.tsx`.
   - Uses `fetchAnalyticsCanonicalTickets` with:
     - `from`/`to` ISO dates,
     - optional `symbol` and `strategy`,
     - `limit`.
   - Computes and displays:
     - Total PnL,
     - Win rate (based on R multiples),
     - Average R multiple,
     - Trade count.
   - Provides:
     - Time-window presets (Today, 7D, 30D),
     - Symbol + strategy filters,
     - Trade table (date, symbol, strategy, side, entry, exit, PnL, R multiple, status),
     - Detail panel with risk sizing fields and PnL narrative.
   - Tests: existing `Analytics.test.tsx` still valid and green.

2. **SL1 – Strategy Lab preset strip + KPIs (DONE)**
   - Strategy Lab page exists and uses canonical analytics helper.
   - Renders presets, mode toggle, and KPIs over analytics tickets.
   - Tests: `StrategyLab.test.tsx` validates loading state, helper invocation, and KPIs.

**Remaining work (FOLLOW-UP)**

3. **A2 – Regime / session pivots** `[FOLLOW-UP]`
   - Pivot analytics by:
     - Symbol, strategy, session regime, volatility regime.
   - Use filters + table sort; consider small summary charts if they can be kept stable in tests.

4. **SL2 – Strategy Lab table & config narrative** `[FOLLOW-UP]`
   - Show per-ticket analytics table in Strategy Lab for the chosen preset.
   - Right-hand “config snapshot” describing:
     - Risk per trade,
     - Expected behaviour by regime,
     - Guardrails.

5. **SL3 – Lab vs Live comparison** `[FOLLOW-UP]`
   - Side-by-side or toggle view between Lab metrics and Live metrics for the same strategy.

### EPIC V2.4 – System, Alerts, Positions

Goal: Make these surfaces **useful to an operator** in one glance.

**Stories**

1. **S1 – Status page telemetry**
   - KPIs: engine uptime, queue health, recent error counts.
   - Table: recent telemetry events.
   - Badge tokens for OK / WARN / CRIT.

2. **A4 – Alerts stream**
   - Chronological list of alerts.
   - Filters: severity, source (risk, engine, infra).
   - Badge tokens and clear text to avoid ambiguity.

3. **P1 – Positions snapshot**
   - Table of open positions per symbol / strategy.
   - PnL, risk bucket, session context.

All three have tests in place; follow-up work is to make the data and UX **worthy of live use**.

---

### EPIC V2.5 – UX, consistency, and tokens

Goal: Make every page feel like one coherent product.

**Stories**

1. **U1 – Token audit**
   - Normalize colours, typography, spacing across pages using token variables.
   - Avoid hard-coded hex colours in page components.

2. **U2 – A3 pattern enforcement**
   - Every main surface:
     - Global shell.
     - Page header.
     - Filter strip.
     - KPIs strip (where applicable).
     - Table.
     - Detail panel or secondary card.

3. **U3 – Mobile / small viewport sanity** `[FOLLOW-UP]`
   - At minimum, ensure no catastrophic breakage at smaller widths.
   - Horizontal scroll on tables is acceptable; broken layouts are not.

---

### EPIC V2.6 – Testing & observability

Goal: Keep the suite green while evolving the dashboard.

**Stories**

1. **TST1 – Maintain green dashboard tests (DONE, KEEPING)**
   - All existing tests passing is a hard gate before merge.
   - Any page refactor must keep or update the unit tests.

2. **TST2 – Incremental test coverage**
   - Add tests where new behaviours are introduced:
     - Filtering logic.
     - PnL formatting variants.
     - Error states.

3. **OBS1 – Log / event hooks** `[FOLLOW-UP]`
   - Wire optional hooks for logging user actions (filter changes etc.) for future observability.

---

### EPIC V2.7 – Cleanup & dead code removal

Goal: Remove confusion and reduce surface area.

**Stories**

1. **CLN1 – Legacy Worklist (once V2 is stable)** `[FOLLOW-UP]`
   - Remove or archive `Worklist.tsx` if V2 fully replaces it.
   - Clean up any unused CSS or components.

2. **CLN2 – Mock & stub rationalisation**
   - Keep only canonical-shape mocks that are still used.
   - Delete dead mocks and stubbed helpers that have real replacements.

3. **CLN3 – Docs alignment**
   - Ensure this file, `REPO_INDEX_V2.md`, and any other dashboard docs describe:
     - Actual file locations.
     - Canonical models currently used.
     - Known follow-ups vs unknown gaps.

---

## 5. Quality gates

Before calling V2 “dashboard ready”:

1. **All tests green** (already true at time of this update).  
2. **Worklist V2 A3 cockpit**:
   - Matches mocks visually to a reasonable standard.
   - Uses canonical ticket + metrics.
   - Works end-to-end with real or canonical-mock data.

3. **Tickets, Markets, Analytics, Strategy Lab, Status, Alerts, Positions**:
   - Share a consistent A3 layout.
   - No broken imports, layouts, or obvious UX regressions.

4. **Docs**:
   - This plan and `REPO_INDEX_V2.md` are consistent with the repo.

---

## 6. How to work on this going forward

Principles for future engineers and AI assistants:

- **Do not start from scratch.** Always inspect:
  - Existing page components.
  - Shared UI atoms.
  - Existing tests.

- **Prefer refactor over rewrite**:
  - If the tests already pass, adjust behaviour/layout incrementally and extend tests.

- **Respect canonical models**:
  - Tickets and analytics must align with the canonical engine contracts.
  - Any mock must match those shapes.

- **Keep tests and docs in sync**:
  - Any non-trivial UI change should either:
    - Update existing tests, or
    - Add new tests that codify the intended behaviour.
  - Update this plan when you substantially change the surfaces.

This plan is the single source of truth for what the **V2 dashboard** is supposed to be and what is **deliberately deferred** vs accidentally missing.


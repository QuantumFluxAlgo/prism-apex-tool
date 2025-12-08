# PRISM APEX – V2 Dashboard Engine Wiring Backlog

Scope: track what’s live in the V2 dashboard (A3-style surfaces) vs what still needs wiring into the canonical engine / API endpoints.

This document assumes:

- Repo: `prism-apex-tool`
- Surfaces: Worklist V2, Tickets, Markets, Analytics, Strategy Lab, Status, Alerts
- Engine contracts exist or will exist for:
  - Canonical worklist / tickets
  - Canonical analytics tickets / KPIs
  - Session metrics
  - PnL (ticks, currency, R-multiple)
  - Risk guardrails / regime

The goal is to:

1. Keep UI and engine wiring work visible and honest.
2. Avoid “stub forever” behaviour – every mock has a tracked path to real data.
3. Provide a clean execution order for the remaining work.

---

## 0. Current UI State (Dec 2025 snapshot)

### 0.1 Worklist V2 (A3 cockpit)

- A3-style surface implemented as `apps/dashboard/src/pages/WorklistV2.tsx`.
- Uses:
  - `ExecutionShell` layout.
  - A3 filter strip (symbol / strategy / side / risk / min score / max age / search).
  - KPI strip (tickets, avg score, risk buckets, latest ticket).
  - Main table (clickable rows).
  - Details panel (ticket context, risk, notes).
- **Data source**: in-memory mock array (`MOCK_WORKLIST_ROWS`) with realistic fields:
  - `ticketId`, `symbol`, `strategy`, `side`, `score`,
  - `riskBucket`, `ageMinutes`, `pnlTicks`, `sessionDate`, `createdAt`, `notes`.

### 0.2 Tickets / Analytics / Strategy Lab / Markets / Status / Alerts

- Tickets page:
  - Front-end only with mocked canonical tickets (test-backed).
- Analytics page:
  - Uses mocked analytics helper for canonical analytics tickets + KPIs.
- Strategy Lab:
  - A3-style surface over **canonical analytics shape**, but currently fed via mocked helper.
  - “Lab-only” semantics are honoured (no order routing).
- Markets, Status, Alerts:
  - UI shells and basic flows present and test-backed.
  - Data either mocked or thinly wired; needs consolidation onto canonical contracts.

**Net of this section:**  
UI is converging on the A3 layout and canonical shapes, but **most surfaces are still running on mocks**. Worklist V2 is now the reference pattern for how an A3 page should feel.

---

## 1. Engine Wiring – Execution Order

The order below is the agreed execution pipeline:

1. **Worklist V2 – real engine wiring (EPIC A)**
2. **Tickets – canonical ticket history (EPIC B)**
3. **Analytics – canonical analytics KPIs + tickets (EPIC C)**
4. **Strategy Lab – real analytics feed behind the lab UI (EPIC D)**
5. **Markets – session/market state from canonical metrics (EPIC E)**
6. **Status / Alerts – proper engine health + guardrails surfacing (EPIC F)**
7. **PnL surface unification and consistency (EPIC G)**

Each epic below is self-contained and can be used as a backlog chunk.

---

## EPIC A – Worklist V2 → Canonical Engine Feed

**Goal:**  
Replace `MOCK_WORKLIST_ROWS` in `WorklistV2.tsx` with a real engine-backed endpoint that returns canonical worklist tickets.

### A1 – Define / confirm canonical Worklist DTO

- DTO fields to confirm against engine:
  - `ticketId`
  - `symbol`
  - `strategy`
  - `side`
  - `sessionDate`
  - `createdAt`
  - `score`
  - `riskBucket`
  - `pnlTicks`
  - `ageMinutes` (or derive from timestamps)
  - `notes` / `context`
- Align naming with:
  - Existing `CanonicalTicket`
  - Existing PnL representation
  - Existing session metrics contracts (if reused).

### A2 – API contract + endpoint

- Add or confirm a dashboard-facing endpoint, e.g.:
  - `GET /v2/worklist`
- Query parameters:
  - `symbol`, `strategy`, `side`, `riskBucket`, `minScore`, `maxAgeMinutes`, `search`
  - Or keep it simple server-side and filter on the client; decision to be captured in this epic.
- Ensure the endpoint returns:
  - Paginated list of worklist tickets in the canonical DTO.
  - Total count, maybe cursor if we need more depth.

### A3 – Wire `WorklistV2` to engine

- Replace `MOCK_WORKLIST_ROWS` with a `useEffect`/hook that calls the real endpoint.
- Preserve the **A3 layout and UX** exactly:
  - Filters work the same, but now they operate on live data.
  - KPIs recalc on real data.
  - Details panel shows real notes/context.

### A4 – Tests & failure modes

- Update/extend tests so:
  - Happy path: engine returns tickets, they render as now.
  - Empty: no tickets → “No tickets match…” state works.
  - Error: engine throws → show operator-friendly error banner (no white screens).
- Ensure test suite covers:
  - Data shape mapping.
  - Risk bucket visualisation (GREEN/AMBER/RED).
  - PnL ticks sign/colour logic.

---

## EPIC B – Tickets → Canonical Ticket History

**Goal:**  
Make Tickets page a real-time / near-real-time canonical ticket history surface.

### B1 – Align tickets DTO with engine

- Confirm canonical ticket history model fields:
  - Ticket identifiers.
  - Symbol, strategy, side.
  - Prices (entry, stop, target).
  - R-multiple.
  - State (created, active, cancelled, filled, etc.).
  - Timestamps.

### B2 – Wire Tickets page to engine

- Replace mocks with `GET /v2/tickets` (or existing equivalent).
- Provide filters for:
  - Symbol, strategy, side.
  - State (optional if engine supports).
  - Time window.

### B3 – Tests

- Ensure UI tests assert:
  - At least one row from the real shape.
  - Filter behaviour.
  - Empty and error states.

---

## EPIC C – Analytics → Canonical Analytics KPIs

**Goal:**  
Move Analytics page off mocks and onto canonical analytics tickets and KPIs.

### C1 – Canonical analytics contract

- Confirm fields for analytics tickets/KPIs:
  - Symbol, strategy, PnL, R-multiple, trade counts, win rate, etc.
- Ensure Strategy Lab and Analytics share the same core contract.

### C2 – Wire Analytics page

- Replace helper-based mock in Analytics tests with real HTTP client for engine (behind a test seam).
- Map canonical analytics responses into the existing tiles and tables.

### C3 – Tests

- Ensure tests validate:
  - KPIs render from real-ish fixtures.
  - Table rows match canonical shape.

---

## EPIC D – Strategy Lab → Real Analytics Feed

**Goal:**  
Keep Strategy Lab strictly read-only, but feed it with the **real analytics contract** used by Analytics.

### D1 – Strategy Lab data hook

- Introduce a shared analytics hook/service:
  - Used by both Analytics and Strategy Lab.
- Strategy Lab selects subsets of analytics data:
  - By preset (ORR, OSB, VWAP-FT).
  - By symbol (ES, NQ, CL, etc.) if needed.

### D2 – Wiring & guardrails

- Make sure the **lab vs live** semantics stay intact:
  - No order routing.
  - Clearly labelled “lab-only” everywhere.

### D3 – Tests

- Strategy Lab tests should assert:
  - KPIs come from the same shape as Analytics.
  - Preset switching changes the KPIs in predictable ways.

---

## EPIC E – Markets → Canonical Session / Market State

**Goal:**  
Turn Markets surface into the operator’s session cockpit over canonical market/session metrics.

### E1 – Contract review

- Confirm engine fields for session/market metrics:
  - Session quality, volatility regime, VWAP, ATR, etc.
- Map them into:
  - Top-level KPIs.
  - Session state table.
  - Detail panels.

### E2 – Wiring

- Replace any placeholders with real engine endpoints (`/v2/markets` or equivalent).
- Align layout with A3 Worklist/Analytics.

---

## EPIC F – Status / Alerts → Engine Health & Guardrails

**Goal:**  
Make Status/Alerts tell the truth about engine health, ingest, guardrail breaches, and operator-facing alerts.

### F1 – Contracts

- Confirm:
  - Health endpoints (engine, ingest, risk).
  - Alert payloads (what guardrail, what severity, what timestamp, what session).

### F2 – Wiring & display

- Replace mocked alerts with engine-backed ones.
- Clear severities (INFO/WARN/CRITICAL) visually differentiated.

---

## EPIC G – PnL & Risk Surface Unification

**Goal:**  
Ensure PnL and risk concepts are **consistent** across Worklist, Tickets, Analytics, Strategy Lab.

### G1 – PnL model

- Decide and document:
  - Canonical PnL units (ticks vs currency).
  - Where R-multiple is computed and how.
  - How open vs closed PnL is expressed.

### G2 – Cross-surface consistency

- Confirm that:
  - Worklist’s `pnlTicks` lines up with Tickets and Analytics.
  - Strategy Lab PnL and R-multiple are computed from the same base model.

---

## 2. Working Rules

1. **No permanent mocks**  
   - Any mock used in UI code must have a tracked story in this document to replace it with an engine-backed call.

2. **Dashboard-first, not engine-first**  
   - We design from what the operator needs to see (A3 surfaces), then adjust engine contracts as needed, not vice versa.

3. **Tests as contract documentation**  
   - UI tests for each surface must:
     - Use fixtures that match the canonical DTOs.
     - Assert at least one real example end-to-end.

4. **Backlog hygiene**  
   - This doc is the single source of truth for:
     - What’s wired.
     - What’s mocked.
     - What’s next.


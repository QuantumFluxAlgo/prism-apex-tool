# PRISM APEX – PnL & R-MULTIPLE MODEL
_Version_: 1.0  
_Last updated_: 2025-12-08  
_Scope_: Canonical definitions for PnL, R multiples, and ticket-level risk fields.

---

## 1. Purpose

This document defines how Prism-Apex represents **risk**, **PnL**, and **R multiples** across:

- Backend: ticket generation, risk engine, analytics.
- Shared types: `CanonicalTicket` in `@prism-apex/shared`.
- Dashboard: Worklist V2, Tickets, Analytics, Markets/Session Context, Strategy Lab.

The goal is to have **one unambiguous contract** so that:

- The numbers you see in Worklist match Analytics, Tickets, and backend reports.
- Any future tests or features use the same semantics.

---

## 2. Core Concepts

### 2.1 “R” – risk unit

**R** is the unit of risk for a trade:

- **1R** = the **planned monetary risk** on the trade (loss if the stop is hit).
- Everything else is expressed as a multiple of that:

  - `+2R` → you made twice your planned risk.
  - `-1R` → you lost exactly your planned risk.
  - `0R` → flat outcome (breakeven after costs, or effectively zero vs risk).

R is defined **per ticket**, not per contract or per account.

---

## 3. CanonicalTicket – Risk & PnL Fields

These fields exist (or must exist) on `CanonicalTicket`:

- **Risk definition**
  - `quantity: number`  
    Contracts / lots for the ticket.
  - `perContractRisk: number`  
    Planned risk **per contract**, in account currency (e.g. USD).  
    Example: 5 handles * $5/tick * 4 ticks/handle = $100 risk/contract → `perContractRisk = 100`.
  - `totalRisk: number`  
    Planned total risk for the ticket in currency.  
    **Canonical formula**:  
    `totalRisk = quantity * perContractRisk`.

- **Planned payoff**
  - `expectedReward: number`  
    Planned **monetary** payoff if target is hit.  
    **Canonical formula** (ideal case):  
    `expectedReward = totalRisk * rrMultiple`.
  - `rrMultiple: number | null`  
    Planned reward–to–risk multiple (R).  
    Example: risk $100 to make $200 → `rrMultiple = 2`.

- **Realised outcome**
  - `pnl: number | null`  
    Realised PnL in currency.  
    Positive for profits, negative for losses, includes all fills for the ticket.
  - `pnlRMultiple: number | null`  
    Realised outcome in R.  
    **Canonical formula** (when `totalRisk > 0`):  
    `pnlRMultiple = pnl / totalRisk`.

If the backend cannot compute a field reliably, it should be `null` rather than faked.

---

## 4. Canonical Relationships & Invariants

These relationships must hold wherever the data is fully populated.

### 4.1 Risk

- `totalRisk = quantity * perContractRisk`
- `totalRisk >= 0`
- If `quantity > 0` and `perContractRisk > 0` then `totalRisk > 0`.

### 4.2 Planned payoff

- If `rrMultiple` and `totalRisk` are both known:

  - `expectedReward ≈ totalRisk * rrMultiple`

  Small rounding differences (e.g. cents) are acceptable; the UI should display rounded values but calculations should be done with full precision.

### 4.3 Realised R

For completed tickets with known PnL:

- If `totalRisk > 0` and `pnl` is known:

  - `pnlRMultiple = pnl / totalRisk`

- If `totalRisk = 0` (e.g. legacy or misconfigured):

  - `pnlRMultiple` **must be null** (undefined R).

### 4.4 Sanity ranges

- Typical R ranges:

  - Planned `rrMultiple` often between `1` and `4`, but system should not hard-cap.
  - Realised `pnlRMultiple` usually between `-2` and `+4` for normal tickets, but can exceed in outliers.

We **do not** clamp these in the model; any clamping is a UI concern (e.g. badges or charts).

---

## 5. Examples

### 5.1 Simple single-contract trade

- `quantity = 1`
- Stop 10 points away, tick value $5/point:
  - `perContractRisk = 50`
  - `totalRisk = 1 * 50 = 50`
- Target is 20 points away:
  - Planned `rrMultiple = 2`
  - `expectedReward = 50 * 2 = 100`

Outcomes:

- Stop hit:
  - `pnl = -50`
  - `pnlRMultiple = -50 / 50 = -1`
- Target hit:
  - `pnl = +100`
  - `pnlRMultiple = 100 / 50 = +2`

### 5.2 Multi-contract trade

- `quantity = 3`
- `perContractRisk = 80`
- `totalRisk = 3 * 80 = 240`
- Planned `rrMultiple = 1.5`
- `expectedReward = 240 * 1.5 = 360`

Outcomes:

- Actual fills yield `pnl = +120`
  - `pnlRMultiple = 120 / 240 = 0.5`

UI should show something like:

- Total risk: `$240`
- Planned: `R 1.5`
- Realised: `R 0.5`, `+$120`

---

## 6. How Each Surface Uses These Fields

### 6.1 Worklist V2

Worklist V2 should show **operator-level “is this ticket worth my attention?” signals**, using:

- From `CanonicalTicket`:
  - `symbol`, `side`, `strategyId`, `status`
  - `quantity`, `totalRisk`, `rrMultiple`
  - `pnl`, `pnlRMultiple` (for completed tickets)
- From `SessionMetricsDto`:
  - `orWidthPoints`, `sessionAtrPoints`, `vwapSlope`, `htfTrendBias`, `volRegime`, `sessionQualityFlag`, `sessionSkipReason`, `hasMajorNewsToday`, `newsLabel`

Core UX rules:

- **Before entry**:
  - Show **planned R** (`rrMultiple`) and risk (`totalRisk`) clearly.
- **After exit**:
  - Show **realised R** (`pnlRMultiple`) and `pnl` clearly.
  - Use consistent colour mapping:

    - `pnlRMultiple > 0.1` → “win”
    - `pnlRMultiple < -0.1` → “loss”
    - `-0.1 ≤ pnlRMultiple ≤ 0.1` → “flat”

Worklist must never invent or reinterpret the PnL model; it only formats and colours.

### 6.2 Tickets

Tickets surface is an **audit log**:

- It may show a cut-down view (symbol, side, strategy, createdAt, status).
- Where available, it should eventually align with Worklist / Analytics by:

  - Displaying risk (`totalRisk`) and outcome (`pnl`, `pnlRMultiple`) in a compact way.
  - Reusing the same helpers and formatting as Worklist for consistency.

### 6.3 Analytics

Analytics is the **numerical truth** for past performance.

It relies heavily on:

- `totalRisk`
- `pnl`
- `rrMultiple`
- `pnlRMultiple`
- `createdAtUtc`
- `completedAtUtc`

Key calculations in `AnalyticsPage` (via `buildAnalyticsSummary`):

- `totalRisk` → sum of `ticket.totalRisk`
- `realizedPnl` → sum of `ticket.pnl` (fallback to 0 on null)
- `avgPlannedR` → mean of `ticket.rrMultiple` for tickets where it’s known
- `avgRealizedR` → mean of `ticket.pnlRMultiple` where known
- `expectancyR` → mean of `ticket.pnlRMultiple` where known (expected R per ticket)
- `winRatePct` → `wins / (wins + losses + flats)` where:
  - `win` if `pnlRMultiple > 0.1`
  - `loss` if `pnlRMultiple < -0.1`
  - `flat` otherwise
- `bestR` / `worstR` → extrema of `pnlRMultiple`
- `avgDurationMinutes` → average `(completedAtUtc - createdAtUtc)` in minutes

All of these assume the PnL model described above.

### 6.4 Markets / Session Context

Markets / Session Context combines **tickets** and **session metrics**:

- Tickets in the selected session show:
  - Risk (`totalRisk`) and outcome (`pnl`, `pnlRMultiple`) per ticket.
- Session header and details show:
  - OR/ATR, VWAP slope, trend, news flags.
- The session-level context never recomputes PnL; it only visualises the context around tickets already using this model.

### 6.5 Strategy Lab

Strategy Lab is allowed to experiment with:

- Hypothetical `CanonicalTicket` sets.
- Different risk scaling or strategy filters.

But it **must not** introduce a new PnL model:

- Even toy/simulated tickets must obey:
  - `totalRisk = quantity * perContractRisk`
  - `pnlRMultiple = pnl / totalRisk` (when `totalRisk > 0`)

---

## 7. Edge Cases

### 7.1 Missing risk

If for any reason a legacy ticket has:

- `totalRisk = 0` or missing, or
- `perContractRisk` missing,

then:

- `pnlRMultiple` must be `null`.
- UI should display:

  - PnL in currency if known (`pnl`), **without** R multiple.
  - A muted badge like “R unknown” is allowed.

### 7.2 Partial exits / scale-in/out

The engine may:

- Handle partial exits internally and emit a single canonical ticket summarising the net outcome, or
- Emit multiple tickets per scale unit.

Regardless:

- Each canonical ticket must still observe:
  - `pnlRMultiple = pnl / totalRisk` (if `totalRisk > 0`).

The details of scale-in/out are outside this document; they must be addressed in the engine design docs.

### 7.3 Currency and futures specifics

This document is **currency-agnostic**:

- All monetary fields are in the configured account currency (currently assumed USD).
- Futures specifics (tick size, point value, etc.) are encapsulated in how the backend calculates `perContractRisk`, `totalRisk`, and `pnl`.

The UI does not redo those calculations; it only displays the provided values.

---

## 8. Testing & Validation

### 8.1 Unit tests

Key tests that depend on this model include (non-exhaustive):

- `apps/dashboard/src/__tests__/WorklistPnLCell.test.tsx`
- `apps/dashboard/src/__tests__/WorklistPnLColumns.test.tsx`
- `apps/dashboard/src/__tests__/pnlDisplay.test.ts`

Whenever the PnL model changes, these tests (and any others touching PnL) must be reviewed.

### 8.2 Cross-surface consistency checks

For any given ticket ID, the following must be **internally consistent**:

- Worklist V2
- Tickets
- Analytics
- Markets / Session Context (where applicable)
- Strategy Lab (if used for historical tickets)

They must all show the **same total risk, R multiples, and PnL** for that ticket.

---

## 9. Change Management

- Any change to PnL/R semantics (e.g. how partials are aggregated, how costs are applied) must update:
  - This document.
  - `CanonicalTicket` type in `@prism-apex/shared`.
  - Relevant API contracts in `apps/api`.
  - All PnL-related UI tests.

- When there is a conflict between:
  - Old tests, and
  - This document + product intent,

**this document wins**. Tests should be updated to reflect the correct model, not the other way round.


# SessionMetrics Data Model

_Last updated: 2025-11-14 • Status: Draft (align with TypeScript types in apps/api)_

## 1. Purpose

`SessionMetrics` describes **per-session, per-symbol intraday analytics** derived from 1-minute OHLCV bars and related market data.

It is the canonical record used by:

- Strategy evaluation (e.g. OR/VWAP behaviours)
- Dashboards and reporting (OR width, ATR regimes, VWAP slope)
- Risk / prop rules (optional)

The model is designed to be:

- **Symbol + session keyed** (one row per symbol per trading session)
- **Derived only** from bar data and config (no manual overrides)
- **Idempotent + recomputable** from source bars

---

## 2. Entity overview

Each `SessionMetrics` record conceptually contains:

- **Identity**
  - `sessionDate`: trading session date (e.g. `2025-11-14`)
  - `symbol`: instrument symbol (e.g. `MESZ5`)
  - `timeframe`: bar timeframe (currently 1-minute, fixed)

- **Status**
  - `status`: `"OK"` | `"ERROR"`
  - `errorCode`: `null` or machine-readable error when `status = "ERROR"` (e.g. `"NO_BARS"`)
  - `errorMessage`: optional human-readable explanation

- **Input coverage**
  - `barCount`: number of bars in the session
  - `hasOpenRange`: boolean flag indicating if the OR window had sufficient bars

- **Volatility & range**
  - `sessionHigh`: highest price of the session
  - `sessionLow`: lowest price of the session
  - `sessionRange`: `sessionHigh - sessionLow`
  - `atr`: average true range over the configured lookback (e.g. N bars)

- **Opening range (OR) metrics**
  - `orStartTime`: timestamp of the OR window start (first bar in session)
  - `orEndTime`: timestamp of the OR window end (default: first 30 minutes)
  - `orHigh`: highest price within OR
  - `orLow`: lowest price within OR
  - `orWidth`: `orHigh - orLow`
  - `orToAtrRatio`: `orWidth / atr` when `atr` is non-null

- **VWAP metrics**
  - `vwapOpen`: VWAP at OR open (or first available bar)
  - `vwapClose`: VWAP at session close
  - `vwapSlope`: numeric slope estimate between `vwapOpen` and `vwapClose`
  - `vwapSlopeClassification`:
    - `"UP"` | `"DOWN"` | `"FLAT"` (based on thresholds on `vwapSlope`)

- **Housekeeping**
  - `createdAt`: timestamp when metrics were first computed
  - `updatedAt`: timestamp when metrics were last recomputed
  - `version`: optional version tag for the computation logic

> Field names here are conceptual. Align them 1:1 with the actual TypeScript interfaces in
> `apps/api/src/jobs/session-metrics` once those are finalised.

---

## 3. Key invariants

1. **Error behaviour**
   - If no bars exist for a given symbol/session:
     - `status = "ERROR"`
     - `errorCode = "NO_BARS"`
     - All numeric metrics (`atr`, `sessionRange`, OR fields, VWAP fields) MUST be `null`.
   - Jobs consuming `SessionMetrics` must be able to branch on `status` / `errorCode` only.

2. **OR window**
   - OR window is a fixed configuration (currently first 30 minutes of the session).
   - OR metrics MUST:
     - Only use bars whose timestamps fall in `[orStartTime, orEndTime)`.
     - Never use bars outside this range for OR calculations.
     - Set `hasOpenRange = false` if there are insufficient bars to compute OR metrics.

3. **VWAP slope classification**
   - Classification is derived from a deterministic threshold function of `vwapSlope`, for example:
     - `|vwapSlope| < ε`  → `"FLAT"`
     - `vwapSlope >= +ε` → `"UP"`
     - `vwapSlope <= -ε` → `"DOWN"`
   - ε is a config value (e.g. in metrics/rules config), not a hard-coded magic number.

4. **Idempotency**
   - For the same input bars and config, repeated runs of the populate job must produce identical `SessionMetrics` rows.
   - Jobs are allowed to overwrite an existing row for the same `(symbol, sessionDate)`; there should be no duplicates.

---

## 4. Relationships

### 4.1 Source bar data

`SessionMetrics` rows are derived from a canonical bars table, for example:

- `bars_intraday_1m` or equivalent.

Linkage:

- `SessionMetrics.symbol` → bar `symbol`
- `SessionMetrics.sessionDate` → bar trading date (not necessarily calendar date if session spans overnight)

No other external dependencies (orders, tickets, PnL) are required.

### 4.2 Downstream consumers

Typical consumers:

- **Strategies / signals**
  - OR breakout strategies may use: `orHigh`, `orLow`, `orWidth`, `orToAtrRatio`
  - Volatility filters may use: `atr`, `sessionRange`

- **Dashboard**
  - Show per-session metrics for symbol selection, OR characteristics, VWAP slope.

- **Reporting**
  - Export `SessionMetrics` rows into CSV/BI tools for research.

---

## 5. Example JSON

### 5.1 OK session example

```json
{
  "sessionDate": "2025-11-14",
  "symbol": "MESZ5",
  "timeframe": "1m",

  "status": "OK",
  "errorCode": null,
  "errorMessage": null,

  "barCount": 390,
  "hasOpenRange": true,

  "sessionHigh": 5234.5,
  "sessionLow": 5180.0,
  "sessionRange": 54.5,
  "atr": 8.2,

  "orStartTime": "2025-11-14T14:30:00Z",
  "orEndTime": "2025-11-14T15:00:00Z",
  "orHigh": 5210.0,
  "orLow": 5198.0,
  "orWidth": 12.0,
  "orToAtrRatio": 1.46,

  "vwapOpen": 5204.2,
  "vwapClose": 5221.7,
  "vwapSlope": 0.35,
  "vwapSlopeClassification": "UP",

  "createdAt": "2025-11-14T20:55:00Z",
  "updatedAt": "2025-11-14T20:55:00Z",
  "version": "v1"
}
```

### 5.2 No-bars example

```json
{
  "sessionDate": "2025-11-14",
  "symbol": "MESZ5",
  "timeframe": "1m",

  "status": "ERROR",
  "errorCode": "NO_BARS",
  "errorMessage": "No intraday bars available for symbol/session",

  "barCount": 0,
  "hasOpenRange": false,

  "sessionHigh": null,
  "sessionLow": null,
  "sessionRange": null,
  "atr": null,

  "orStartTime": null,
  "orEndTime": null,
  "orHigh": null,
  "orLow": null,
  "orWidth": null,
  "orToAtrRatio": null,

  "vwapOpen": null,
  "vwapClose": null,
  "vwapSlope": null,
  "vwapSlopeClassification": null,

  "createdAt": "2025-11-14T20:55:00Z",
  "updatedAt": "2025-11-14T20:55:00Z",
  "version": "v1"
}
```

---

## 6. Operational notes

The populate job for SessionMetrics must:

1. Run under Node 20 (via the Node 20 tool image).
2. Be safe to re-run (idempotent).
3. Log enough context (symbol, session, barCount, status) for runbook triage.

When changing the data model:

- Update this document.
- Update the TypeScript types in `apps/api/src/jobs/session-metrics`.
- Add/adjust Vitest coverage for new fields or invariants.
- Consider a version bump if the change is not backwards compatible.

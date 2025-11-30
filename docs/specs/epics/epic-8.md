# **📘 EPIC 8 — Strategy Lab (Complete Rewritten Version for Unified Ticket Model)**

## **8.1 Background**

The Strategy Lab provides a controlled, isolated environment for
operators to test, tune, and validate strategy parameters before
promoting changes into production. In V1, previews relied on incomplete
derivations, inconsistent handling of tick offsets, and UI-level price
inference. In V2, the Strategy Lab must operate on the same **canonical
ticket model**, **risk sizing**, and **price construction logic** used
by the live system.

The Strategy Lab becomes the authoritative interface for validating
whether a configuration produces viable trades, adheres to risk
constraints, and aligns with expected market-condition filters such as
VWAP slope, OR width, ATR regimes, or session boundaries.

## **8.2 Objectives / Goals**

1.  Provide a deterministic preview environment identical to live
    strategy and risk behaviour.

2.  Display valid absolute entry/stop/target prices derived from unified
    tick logic.

3.  Calculate and display expected risk metrics (quantity, per-contract
    risk, total risk, R-multiple).

4.  Surface full session context (ATR, OR width, VWAP metrics) for
    parameter validation.

5.  Allow operators to adjust strategy parameters without affecting live
    systems.

6.  Ensure Strategy Lab outputs are fully aligned with Worklist,
    Analytics, and Audit conventions.

## **8.3 Functional Requirements**

### **8.3.1 Configurable Parameters**

The lab must allow operators to adjust:

- Target tick distance

- Stop tick distance

- Strategy-specific thresholds (VWAP-touch tolerance, OSB range %, OR
  breakout levels)

- Volatility or session filters

- Time-of-day constraints

- Regime filters (trend, compression, volatility buckets)

All adjustments remain sandbox-only and do not apply to production
config until explicitly deployed.

### **8.3.2 Preview Ticket Generation Using Canonical Model**

Every configuration change triggers the following sequence:

1.  **Strategy Layer  **

    - Candidate ticket is generated using the strategy module with new
      parameters.

2.  **Orchestrator Layer  **

    - Candidate is enriched with session metrics, symbol metadata, and
      tick deltas.

3.  **Risk Engine Layer  **

    - Computes absolute price levels:

      - entry_price

      - target_price

      - stop_price

    - Validates side logic (LONG/SHORT rules).

    - Determines quantity using deterministic risk formula.

    - Computes per-contract and total risk.

    - Computes expected R-multiple.

4.  **Preview Output  **

    - The resulting preview ticket mirrors Worklist format exactly.

Preview results must be **identical** to what the production system
would produce under the same conditions.

### **8.3.3 Visual Strategy Preview**

The Strategy Lab must present:

- Entry, stop, and target prices on a chart

- Tick deltas displayed as secondary metadata

- Risk metrics

- Strategy trigger markers

- Relevant overlays (VWAP, OR, ATR envelopes)

- Contextual regime indicators (trend, slope, compression zones)

The chart component must reuse the same design tokens and styling
conventions as the Market Context page.

### **8.3.4 Parameter Impact Analysis**

The Strategy Lab must show how parameter changes impact expected
behaviour:

- Wider stops → lower quantity → lower risk-per-trade

- Larger targets → higher expected R-multiple

- Narrow OR windows → increased trigger likelihood

- ATR regime shifts → changing risk profiles

- VWAP slope shifts → strategy viability changes

This allows operators to understand the relationship between ticks,
prices, and risk.

### **8.3.5 Multiple Scenario Preview**

The lab must allow:

- Comparison of two parameter sets side-by-side

- Quick switching between presets

- Scenario simulation for different market regimes

- Preview outputs across multiple symbols if needed

### **8.3.6 Backtest and Historical Replay (If Enabled)**

If configured in this version:

- The lab can run micro-backtests on historical windows.

- All replayed trades must be computed using canonical ticket and risk
  logic.

- The operator must be able to inspect historical trade previews with
  identical price and risk formatting.

## **8.4 Validation Rules**

1.  **Canonical Ticket Compliance  **

    - All preview tickets must include:

      - entry_price, stop_price, target_price

      - target_ticks, stop_ticks

      - quantity

      - total_risk and per-contract risk

      - r-multiple

      - strategy metadata

      - session metrics snapshot

2.  **Tick and Price Consistency  **

    - LONG: target \> entry \> stop

    - SHORT: stop \> entry \> target

    - All computed prices must be snapped to tick_size.

3.  **Risk-Sizing Accuracy  **

    - Preview quantity must match Risk Engine logic exactly.

    - Quantity must reflect risk_budget_per_trade and stop distance.

4.  **Configuration Isolation  **

    - No Strategy Lab configuration can impact production.

    - All lab parameter sets must be isolated and tagged.

5.  **No UI-Side Recalculation  **

    - Prices, risk, and ticks must originate from backend canonical
      logic.

    - UI must not “guess” values or derive them independently.

## **8.5 Logging & Observability**

The Strategy Lab must log:

- Parameter changes

- Preview ticket generation events

- Strategy execution snapshot

- Risk calculation times

- Any errors in preview generation

- Data fetch latencies

- Version of configuration preset used

All logs feed into EPIC 9’s System Health dashboard.

## **8.6 Acceptance Criteria**

1.  Parameter changes produce immediate preview tickets using full
    canonical logic.

2.  Preview tickets match the structure and semantics of Worklist
    tickets exactly.

3.  Entry/stop/target prices are accurate, snapped, and directionally
    valid.

4.  Tick deltas appear only as secondary metadata.

5.  Risk sizing and R-multiple derived in the lab match production
    output.

6.  Overlays and regime indicators appear consistently with Market
    Context Page.

7.  No UI-driven inference or recalculation of pricing, ticks, or risk
    occurs.

8.  Operators can save, load, compare, and export configuration presets.

9.  All preview operations are fully logged and observable.

10. Optional backtest/replay features use canonical ticket model
    consistently.


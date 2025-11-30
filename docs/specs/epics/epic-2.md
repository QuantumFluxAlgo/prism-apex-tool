# **📘 EPIC 2 — Strategy Orchestrator (Rewritten for V2 Unified Ticket Model)**

## **2.1 Background**

The Strategy Orchestrator acts as the coordination layer between raw
strategy signal generation (VWAP First Touch, OSB, OR Breakout,
Mean-Reversion modules) and the downstream components that enrich,
validate, size, and publish actionable tickets to the Worklist.  
In V1, strategies emitted partially-formed tickets using tick distances
and relative offsets. In V2, the orchestrator must generate **canonical,
fully structured strategy outputs**, including both **tick deltas** and
**absolute entry/stop/target prices**, providing a stable contract for
risk, UI, audit, and analytics systems.

This epic establishes a deterministic orchestration pipeline, ensuring
that every strategy produces consistent signal objects, adheres to
standard side conventions, implements valid tick logic, and integrates
with session metrics, volatility context, and symbol configs.

## **2.2 Objectives / Goals**

1.  **Standardise strategy outputs across all modules** using a
    canonical ticket candidate schema.

2.  Ensure each strategy produces both:

    - Tick-based distances (target_ticks, stop_ticks)

    - Absolute price levels (entry_price, target_price, stop_price)

3.  Centralise tick-to-price conversion and sign validation to eliminate
    strategy inconsistencies.

4.  Integrate volatility regime, VWAP structure, OR width, ATR, and
    session metrics into each candidate ticket.

5.  Maintain strict isolation: strategies make *signal* decisions, not
    *risk* decisions.

6.  Provide fully traceable strategy signal metadata for audit and
    downstream processing.

7.  Guarantee deterministic, reproducible orchestration across backtests
    and live mode.

## **2.3 Functional Requirements**

### **2.3.1 Unified Candidate Ticket Structure**

Each strategy must produce a complete candidate ticket object
containing:

- symbol

- side (LONG \| SHORT)

- strategy_id

- entry_price

- target_ticks

- stop_ticks

- tick_size

- tick_value

- session_id or date context

- strategy_metadata (VWAP-touch data, OR breakout conditions, OSB
  ranges, etc.)

The orchestrator computes and attaches:

- target_price = entry_price + (target_ticks \* tick_size)

- stop_price = entry_price + (stop_ticks \* tick_size)

- Price snapping to tick_size grid

- Sign enforcement:

  - LONG: target_ticks \> 0, stop_ticks \< 0

  - SHORT: target_ticks \< 0, stop_ticks \> 0

### **2.3.2 Integration with Session Metrics**

For each candidate, orchestrator retrieves:

- ATR and OR-derived volatility bands

- VWAP slope regime

- High/low range compression metrics

- Liquidity heatmap context (if available)

These values are attached as immutable metadata.

### **2.3.3 Strategy-Specific Logic Execution**

Each strategy module must:

- Produce raw signal conditions

- Provide side, suggested entry level, and tick distances

- Validate that internal trigger logic meets configuration and
  market-state requirements

- Never determine size, quantity, or risk—delegated to Guardrails module

### **2.3.4 Error Handling and Veto Rules**

The orchestrator must reject tickets if:

- Tick signs violate side conventions

- Entry_price produces invalid price levels

- target_price == entry_price or stop_price == entry_price

- Missing tick_size or symbol metadata

- Strategy emits non-deterministic or incomplete payloads

All rejections are logged with reason codes.

### **2.3.5 Deterministic Processing Pipeline**

For both live ingestion and backtest replay:

1.  Strategies run in order

2.  Each produces a candidate ticket

3.  Orchestrator enriches and validates the structure

4.  Passes candidates to Risk Engine for sizing and risk authorization

5.  Only risk-approved tickets publish to Worklist

## **2.4 Validation Rules**

1.  **Price Construction Validity  **

    - All price fields must align to tick_size increments.

    - Entry, target, and stop must be numeric, non-zero, and valid
      exchange price levels.

2.  **Side-Constrained Tick Logic  **

    - LONG → target \> entry, stop \< entry

    - SHORT → target \< entry, stop \> entry

3.  **Strategy Trigger Validation  **

    - VWAP Touch: candle penetration logic must be met

    - OSB: structural range and breakout conditions must be satisfied

    - OR Breakout: OR window boundaries and ATR confirmation must be
      present

4.  **Market State Compatibility  **

    - Strategy must not emit tickets outside configured session or
      volatility boundaries

5.  **Metadata Completeness  **

    - Session metrics, ATR, OR width, VWAP slope, and strategy metadata
      must be present for audit

## **2.5 Logging & Observability**

The orchestrator must generate structured logs for every candidate
ticket containing:

- ticket_id (preliminary UUID)

- strategy_id

- side

- entry_price, target_price, stop_price

- target_ticks, stop_ticks

- session_metrics_snapshot

- reason_code for any veto

- processing_timestamp

- latency_ms between signal generation and orchestration completion

All logs must be JSON, schema-stable, and ready for ingestion by EPIC 9
metrics dashboard.

## **2.6 Acceptance Criteria**

1.  All strategies produce unified candidate tickets containing both
    tick deltas and price levels.

2.  Orchestrator derives target_price and stop_price deterministically
    and snaps to tick grid.

3.  Any invalid candidate is rejected with structured reason codes.

4.  Each approved candidate contains full session metrics enrichment.

5.  All produced signals are reproducible in backtest and live
    environments.

6.  Downstream systems (Risk Engine, Worklist, Analytics, Strategy Lab)
    accept orchestrator outputs without transformation.

7.  Full audit traces exist for every candidate, veto, and approved
    ticket.


# **📘 EPIC 4 — Worklist (Rewritten for Unified Ticket Model)**

## **4.1 Background**

The Worklist is the operator-facing queue of approved trade tickets. In
V1, the Worklist displayed partially derived strategy signals and
inconsistently mixed tick deltas with implied price levels. In V2, the
Worklist becomes the authoritative, execution-ready view of all approved
tickets, showing **absolute entry, target, and stop prices** backed by
internally consistent tick logic.

This epic defines the Worklist as the final destination of risk-approved
tickets before manual execution. It ensures operators have immediate
access to clear, unambiguous ticket information that can be directly
entered into a trading platform without mental conversion or
interpretation.

## **4.2 Objectives / Goals**

1.  Provide a clean, unified surface for all actionable tickets.

2.  Display **entry_price**, **target_price**, and **stop_price** as
    primary data.

3.  Present tick deltas as secondary metadata for context only.

4.  Incorporate strength scores, volatility metadata, and strategy
    context.

5.  Show risk sizing outputs (quantity, per-contract risk, total risk).

6.  Guarantee Worklist entries are always validated, sized, and
    operator-ready.

7.  Ensure full alignment with the canonical ticket model for downstream
    audit and analytics.

## **4.3 Functional Requirements**

### **4.3.1 Worklist Data Inputs**

The Worklist receives only **Risk Engine–approved** tickets, each
containing:

- entry_price

- target_price

- stop_price

- target_ticks, stop_ticks

- quantity

- per_contract_risk_ccy, total_risk_ccy

- strategy_id

- symbol, side

- r_multiple

- session_metrics_metadata

- risk_engine_decision = APPROVED

No partially enriched or unvalidated tickets may enter the Worklist.

### **4.3.2 Worklist Display Columns**

The main grid must display:

- **Symbol  **

- **Side (LONG/SHORT)  **

- **Entry Price  **

- **Target Price  **

- **Stop Price  **

- **Quantity  **

- **Risk (\$)  **

- **R Multiple  **

- **Strategy  **

- **Strength Score  **

- **Timestamp  **

Tick deltas are displayed only as:

- Subtext: e.g., “(+20 ticks)”

- Tooltip metadata if needed

Absolute price levels remain the primary operator reference.

### **4.3.3 Ticket Strength & Metadata**

The Worklist must present:

- Strategy strength scores

- Volatility regime (from Session Metrics)

- OR width, ATR, or VWAP data when provided

- Strategy-specific annotations (e.g., VWAP-touch confirmation)

This information is contextual; it does not override core execution
fields.

### **4.3.4 Operator Experience Requirements**

The operator must be able to:

- Filter by symbol, strategy, side, and risk

- Sort by time, strength score, R multiple, risk, or price levels

- Expand a ticket row to view full metadata, including ticks and session
  context

- Access detailed risk breakdown (stop_distance × tick_value × quantity)

### **4.3.5 Ticket State Management**

Worklist ticket lifecycle states:

- active

- expired (time-bound or market-condition bound)

- cancelled

- invalidated (strategy or risk veto after initial approval)

Expired or invalidated tickets remain visible but marked clearly.

### **4.3.6 No Recalculation Rules**

Once a ticket enters the Worklist:

- No recalculation of prices

- No re-evaluation of tick logic

- No adjustment of quantity or risk values

- Ticket remains immutable unless explicitly invalidated

This ensures strict integrity and audit consistency.

## **4.4 Validation Rules**

1.  **Price Validation  **

    - Entry, target, and stop prices must be present and snapped to tick
      grid.

    - Target \> Entry \> Stop for LONG; Stop \> Entry \> Target for
      SHORT.

2.  **Quantity and Risk Validation  **

    - Quantity \> 0 and derived from Risk Engine.

    - total_risk_ccy must match Risk Engine output exactly.

3.  **Strategy Metadata Integrity  **

    - Strength score present if applicable.

    - Strategy metadata complete and non-null.

4.  **Timestamp and Session Validation  **

    - Ticket must be tagged with creation timestamp.

    - Must match valid trading session constraints from Risk Engine.

5.  **Immutability  **

    - Any mismatch between displayed values and Risk Engine enriched
      values triggers automatic invalidation.

## **4.5 Logging & Observability**

Every ticket displayed must produce an immutable audit log containing:

- Ticket ID

- Entry/Target/Stop prices

- Tick deltas

- Side

- Quantity

- Total risk (\$)

- R multiple

- Strength score

- Strategy metadata

- Ticket timestamps

- Ticket lifecycle transitions

- Invalidation reason (if applicable)

Worklist view state changes are not logged; ticket data changes are
logged.

## **4.6 Acceptance Criteria**

1.  All Worklist tickets display **absolute prices** as primary fields.

2.  Tick distances appear only as secondary metadata.

3.  All entries are enriched, validated, and sized by the Risk Engine.

4.  Sorting, filtering, and drill-downs work across prices, quantities,
    and metadata.

5.  Each ticket is immutable once added.

6.  All fields align with the canonical ticket model.

7.  Invalid or expired tickets are clearly marked without ambiguity.

8.  No operator sees raw tick logic or partial strategy outputs in the
    Worklist.

    - 


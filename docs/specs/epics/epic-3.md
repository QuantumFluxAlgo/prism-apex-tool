# **📘 EPIC 3 — Risk Engine & Guardrails (Rewritten for Unified Ticket Model)**

## **3.1 Background**

The Risk Engine is responsible for validating and authorising all
candidate tickets emitted by the Strategy Orchestrator. In V1, risk
logic used tick distances but did not consistently generate or validate
absolute price levels. In V2, the system adopts a unified contract:
strategies emit tick deltas and an entry price, and the Risk Engine
computes and validates **absolute entry, target, and stop prices**.

The Risk Engine ensures every ticket is risk-compliant, sized correctly,
and aligned with account rules, symbol constraints, and system
guardrails. The output from this module is a fully enriched,
execution-ready ticket passed to the Worklist.

## **3.2 Objectives / Goals**

1.  Validate candidate tickets against configured risk and account
    rules.

2.  Enforce strict tick-sign logic for LONG and SHORT trades.

3.  Compute and validate absolute target and stop price levels based on
    tick deltas.

4.  Snap all prices to valid tick increments and reject invalid
    constructions.

5.  Determine contract quantity using deterministic position sizing
    logic.

6.  Reject or downgrade any ticket that violates stop/target conventions
    or risk limits.

7.  Produce an auditable risk decision and reason code for every ticket.

## **3.3 Functional Requirements**

### **3.3.1 Canonical Price Construction**

The Risk Engine must compute final price levels:

- target_price = entry_price + (target_ticks × tick_size)

- stop_price = entry_price + (stop_ticks × tick_size)

All computed prices must be snapped to the nearest valid tick.

### **3.3.2 Tick Sign Enforcement**

- LONG trades:

  - target_ticks \> 0

  - stop_ticks \< 0

  - target_price \> entry_price

  - stop_price \< entry_price

- SHORT trades:

  - target_ticks \< 0

  - stop_ticks \> 0

  - target_price \< entry_price

  - stop_price \> entry_price

Invalid sign combinations must be rejected with reason codes.

### **3.3.3 Position Sizing**

Quantity must be derived deterministically based on:

- abs(stop_ticks) × tick_value = per_contract_risk

- risk_budget_per_trade (configuration-driven)

- max_contracts_per_trade

- max_open_risk_ccy (if configured)

Sizing formula:

- max_size = floor(risk_budget_per_trade / per_contract_risk)

- quantity = min(max_size, max_contracts_per_trade)

If quantity \< 1, ticket is rejected.

### **3.3.4 Rule and Guardrail Validation**

The Risk Engine must enforce:

- Price validity against symbol min/max limits

- Session and time-of-day constraints

- Volatility gating (optional)

- Risk-per-trade constraints

- Open-risk constraints if enabled

- Strategy-specific guardrails where defined

### **3.3.5 Enrichment of Ticket Before Output**

Approved tickets must include:

- entry_price

- target_price

- stop_price

- target_ticks

- stop_ticks

- quantity

- per_contract_risk_ccy

- total_risk_ccy

- r_multiple (abs(target_ticks) / abs(stop_ticks))

- risk_validation_metadata

- risk_engine_decision (approved/rejected)

### **3.3.6 Rejection Handling**

If any guardrail fails:

- Ticket must be marked rejected

- A structured reason_code must be attached

- No partial records are forwarded

- All rejections must be audit-compliant

## **3.4 Validation Rules**

1.  **Price Construction  **

    - All constructed prices must align to tick grid.

    - entry_price, target_price, and stop_price must be distinct.

2.  **Side Logic  **

    - LONG: target above entry, stop below entry.

    - SHORT: target below entry, stop above entry.

3.  **Risk Budget  **

    - quantity \>= 1 or reject.

    - total_risk_ccy \<= risk_budget_per_trade or reject.

4.  **Symbol Rules  **

    - Price levels within market-valid range.

    - Tick size retrieved and applied from symbol config.

5.  **Duplicate or invalid state  **

    - Reject if required metadata is missing or corrupted.

## **3.5 Logging & Observability**

Risk Engine must log:

- Ticket ID, strategy ID, symbol, side

- entry_price, target_price, stop_price

- target_ticks, stop_ticks

- quantity

- per_contract_risk_ccy and total_risk_ccy

- r_multiple

- all guardrail checks and pass/fail results

- reason_code for rejections

- timestamp and latency metrics

Logs must be structured JSON and consumable by the system health
console.

## **3.6 Acceptance Criteria**

1.  Risk Engine produces consistent, deterministic sizing for all
    tickets.

2.  Absolute entry/target/stop prices are computed and validated
    correctly.

3.  All ticks adhere to side-dependent sign conventions.

4.  Rejected tickets contain structured reason codes and complete
    metadata.

5.  Approved tickets include all pricing, sizing, and risk attributes
    required by Worklist, Analytics, Strategy Lab, and Audit.

6.  No invalid price constructions reach the Worklist.

7.  All risk decisions are fully auditable.

    - 


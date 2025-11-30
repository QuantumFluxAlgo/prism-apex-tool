# **📘 EPIC 5 — Audit & Analytics (Rewritten for Unified Ticket Model)**

## **5.1 Background**

The Audit & Analytics layer provides transparency, traceability, and
performance understanding across all system-generated trades. In V1,
analytics relied on inconsistent intermediate fields and incomplete
ticket structures. In V2, the system adopts a unified canonical ticket
model with explicit absolute price levels and deterministic risk sizing.

This epic ensures that every approved ticket, every vetoed ticket, and
every executed trade can be fully reconstructed, analysed, and
validated. The Analytics Engine delivers robust reporting across
performance, risk exposure, strategy behaviour, and historical operator
decision-making.

## **5.2 Objectives / Goals**

1.  Deliver a complete, immutable audit trail for every candidate,
    approved, rejected, or expired ticket.

2.  Surface all canonical ticket model fields (entry, stop, target
    prices; ticks; risk; quantity).

3.  Provide analytics across risk, R-multiples, and execution outcomes.

4.  Enable strategy-level and session-level performance evaluation.

5.  Provide data to the UI (Worklist, Strategy Lab, Reports) via a
    stable API.

6.  Support export for external performance review (CSV/JSON).

7.  Provide operator-ready views that are consistent across all UI
    touchpoints.

## **5.3 Functional Requirements**

### **5.3.1 Canonical Audit Record Generation**

The system must persist a complete audit object for every ticket state:

- ticket_id

- symbol, side

- strategy_id

- entry_price, target_price, stop_price

- target_ticks, stop_ticks

- tick_size, tick_value

- quantity

- per_contract_risk_ccy, total_risk_ccy

- r_multiple

- session_metrics_snapshot

- risk_engine_decision

- risk_engine_reason_code

- strategy_metadata

- timestamp_created

- timestamp_updated

- lifecycle_state (candidate / approved / invalidated / expired)

Audit objects must be immutable once written.

### **5.3.2 Analytics Data Processing**

The Analytics Engine must compute:

- Realised P&L

- Unrealised P&L where applicable

- R-multiple achieved per trade

- Expected vs actual volatility impact

- Strategy win/loss rates

- Average stop distance and target distance (in ticks and price)

- Average R-multiple per strategy

- Session-level performance metrics

- Total daily and session risk exposure

These metrics must support both real-time dashboards and historical
reports.

### **5.3.3 Integration with Canonical Ticket Model**

Analytics must consume the same ticket structure used by:

- Worklist

- Strategy Lab

- Risk Engine

- System Health Dashboard (EPIC 9)

All analytic computations must tie directly to canonical fields to
ensure no discrepancies across UI layers.

### **5.3.4 Reporting & Export**

The system must provide:

- Daily trade summary reports

- Strategy-level breakdowns

- Performance attribution

- Risk exposure summaries

- Operator trade behaviour reports (acceptance, rejection, execution
  pacing)

Exports must be available in:

- CSV (for Excel reviews)

- JSON (for advanced analysis)

### **5.3.5 UI Integration Requirements**

The Analytics UI (Reports Page V2) must display:

- Entry/target/stop prices

- Quantity

- Actual realised R-multiple

- Entry-to-exit path

- Per-contract risk and total risk

- Strategy-level summaries

- Symbol-level summaries

- High-level session performance charts

All values must originate directly from persisted audit objects — no
recalculation or derivation in the UI.

### **5.3.6 Performance Considerations**

Analytics queries must support:

- Efficient time-window filtering

- Strategy and symbol filtering

- Large-volume replay analysis (backtests)

- Real-time incremental updates

## **5.4 Validation Rules**

1.  **Audit Completeness  **

    - All canonical fields must exist before audit write.

    - Missing or null critical fields must trigger rejection.

2.  **Immutability  **

    - Audit entries cannot be edited after insertion.

    - Any correction requires an appended record with reference to
      original ID.

3.  **Price and Risk Consistency  **

    - entry_price, target_price, stop_price must meet side conventions.

    - r_multiple must equal abs(target_ticks)/abs(stop_ticks).

    - total_risk must equal quantity × per_contract_risk_ccy.

4.  **Lifecycle Accuracy  **

    - All transitions must be logged with timestamps.

    - Invalid transitions (e.g., “approved → candidate”) must be
      blocked.

5.  **Analytics Verifiability  **

    - All calculated metrics must trace back to audit source fields.

    - No metrics may be derived from reconstructed or inferred values.

## **5.5 Logging & Observability**

All analytics and audit operations must log:

- Ticket ID

- Operation type (audit_write, analytics_compute, export_generate)

- Strategy ID and symbol

- r_multiple, realised P&L

- Risk exposure

- Data source integrity checks

- Error and veto codes

- Duration and performance metrics

EPIC 9 must surface monitoring for:

- Audit write latency

- Analytics computation load

- Export failures

- Data integrity mismatches

## **5.6 Acceptance Criteria**

1.  All audit objects include full canonical ticket model fields.

2.  Analytics uses only canonical ticket fields — no UI-side
    computation.

3.  The Reports Page displays accurate price levels, risk metrics, and
    performance summaries.

4.  All metrics reconcile across Worklist, Strategy Lab, and Audit.

5.  Exported files contain complete, accurate ticket-level data.

6.  Session-level and symbol-level analytics function across all date
    ranges.

7.  Audit, analytics, and reporting behaviour is fully reproducible in
    backtest and live mode.

8.  Operator sees consistent, unambiguous values across all UI surfaces.


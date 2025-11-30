# **📘 EPIC 9 — System Health, Observability & Status Console (Rewritten for Unified Ticket Model)**

## **9.1 Background**

The System Health, Observability & Status Console provides real-time
visibility into system operations, performance, risk posture, and data
integrity across all services.  
In V1, observability focused on ingestion pipelines, basic uptime, and
partial strategy state.  
In V2, with the introduction of the **canonical ticket model**,
**deterministic risk engine**, and **absolute pricing logic**,
observability requirements expand significantly.

The Status Console must validate that every service—Strategy
Orchestrator, Risk Engine, Worklist, Audit, Analytics, Lab, and Market
Context Page—operates consistently and produces outputs aligned with the
canonical model. It must also expose performance, schema integrity, risk
posture, and end-to-end latency across the entire ticket generation
pipeline.

## **9.2 Objectives / Goals**

1.  Provide a unified, operator-facing view of system health across all
    modules.

2.  Monitor correctness and consistency of canonical ticket data
    (prices, ticks, risk).

3.  Detect and alert on data mismatches or invalid price/tick
    constructions.

4.  Surface latency, uptime, and performance metrics across ingestion,
    orchestration, and risk layers.

5.  Ensure all downstream systems—Worklist, Strategy Lab, Analytics—use
    canonical, validated ticket objects.

6.  Provide traceability and observability for debugging and audit
    reinforcement.

7.  Display risk posture, open exposure, veto rates, and operational
    anomalies.

## **9.3 Functional Requirements**

### **9.3.1 Real-Time Service Health Monitoring**

The console must display the health status of:

- Strategy Orchestrator

- Risk Engine & Guardrails

- Session Metrics service

- Ingestion pipelines

- Worklist Publishing Service

- Analytics Engine

- Audit Writer

- Strategy Lab computation layer

- UI delivery endpoints

Each service must publish:

- healthy/unhealthy state

- uptime

- last heartbeat timestamp

- error counts

- recent failures

- average latency

- version/build metadata

### **9.3.2 Canonical Ticket Model Integrity Checks**

The system must continuously audit that active tickets adhere to
canonical model constraints:

- entry_price, stop_price, target_price are present and valid

- tick deltas match derived price differences

- LONG and SHORT directional rules are respected

- quantity aligns with risk sizing

- r-multiple calculations are correct

- per-contract risk and total risk are consistent

Any mismatches must automatically flag warnings or critical alerts.

### **9.3.3 Pipeline Latency & Throughput Monitoring**

The console must measure and display latency for each stage:

- Bar ingestion → Strategy trigger

- Strategy → Orchestrator

- Orchestrator → Risk Engine

- Risk Engine → Worklist

- Worklist → Audit

- Audit → Analytics

- UI render time for Market Context, Worklist, Lab, and Reports

Latency dashboards must include averages, 95th percentiles, and min/max
windows.

### **9.3.4 Risk Posture & Exposure Monitoring**

The console must expose key risk metrics:

- Total open risk (as computed by canonical ticket fields)

- Risk budget utilisation

- Daily risk cap thresholds

- Veto counts by guardrail type

- Strategy-level ticket rejection distribution

- Per-symbol risk exposure

This ensures real-time alignment with account compliance and guardrails.

### **9.3.5 Data Pipeline Integrity**

The Status Console must detect and report on:

- Missing session metrics

- Inconsistent symbol metadata

- Out-of-date tick_size or tick_value

- Failed price-snapping operations

- Session boundary mismatches

- Any deviation from canonical schemas

### **9.3.6 Operational Alerts & Notifications**

Alerts must be categorised as:

- **Critical** — system is not producing valid canonical tickets, or
  risk logic failing

- **Warning** — latency spikes, partial data outages, temporary
  ingestion gaps

- **Informational** — service restarts, deploy events, configuration
  loads

Alerts must be accessible in the console UI and exportable for audit.

### **9.3.7 Historical Observability**

The console must store historical logs of:

- Service health states

- Ticket validation errors

- Risk veto patterns

- Latency and throughput statistics

- Canonical data mismatches

- Daily risk posture

Operators must be able to search historical metrics and export them.

### **9.3.8 Integration with Audit & Analytics**

Because Analytics (EPIC 7) and Audit (EPIC 5) rely on canonical ticket
fields, the System Health Console must:

- Validate that all audit objects contain required fields

- Show audit write failures or delays

- Show Analytics computation lag or API underperformance

This creates end-to-end traceability from signal generation to operator
consumption.

## **9.4 Validation Rules**

1.  **Canonical Field Validation  **

    - Every active ticket must contain absolute prices, tick deltas, and
      risk metrics.

    - Any deviation must trigger automated error logging.

2.  **Directional Price Logic  **

    - LONG: target \> entry \> stop

    - SHORT: stop \> entry \> target

    - Violations produce critical alerts.

3.  **Latency Thresholds  **

    - Each processing stage must define thresholds for warning and
      critical states.

4.  **Data Completeness  **

    - All Session Metrics fields must be present.

    - Missing ATR/OR values for active sessions are considered warnings.

5.  **Schema Integrity  **

    - Canonical ticket schema must match versioned definitions.

    - Any schema mismatch triggers a compatibility alert.

6.  **Risk Compliance  **

    - Open risk must never exceed configured caps.

    - Violations produce critical alerts.

## **9.5 Logging & Observability**

The console must log:

- Service state changes

- Ticket validation failures

- Price/tick mismatches

- Risk veto events

- Processing latency

- Data ingestion dropouts

- API response degradation

- Deployment events

- Configuration loads and updates

All logs must be JSON, timestamped, structured, and indexed.

## **9.6 Acceptance Criteria**

1.  The Status Console displays real-time health for all major services.

2.  Canonical ticket model integrity checks are continuously executed.

3.  Any invalid absolute price/tick combinations are flagged
    immediately.

4.  Risk posture reflects real-time exposure using canonical ticket
    fields.

5.  Latency and throughput metrics are visible and meet defined
    thresholds.

6.  Operators can export observability data for external review.

7.  Historical logs are retained and searchable.

8.  All observability is consistent with Audit, Analytics, Worklist, and
    Strategy Lab.

9.  The UI clearly differentiates healthy, warning, and critical system
    states.

10. The console is responsive, accurate, and reliable under load.


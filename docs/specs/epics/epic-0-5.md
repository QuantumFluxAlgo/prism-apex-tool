## **📘 EPIC 0.5 — Signal Generation Stability & Determinism**

*Bar-close strategies → stable signals → tickets (for Worklist & Tickets
UI)*

**Goal:  **
Make the existing strategy + ticketizer jobs **deterministic, fast, and
auditable**, so that on every 1-minute bar-close you get:

- Correct, **non-duplicated** signals

- Clean tickets feeding Worklist/Tickets

- Latency low enough that the UI feels “near real-time”

- Behaviour predictable enough for risk, analytics, and Strategy Lab

This epic **reuses** your current strategy engine and ticketizer. We’re
not building a new engine, we’re tightening and formalising the one you
already have.

### **0.5.1 Existing Implementation to Reuse**

All work in this epic must **build on and not duplicate** these
components:

**Jobs / Strategy Engine / Ticketizer**

- apps/api/src/jobs/strategies.ts  
  – Main job that runs strategies (ORR / OSB / VWAP-FT) over
  bars/metrics.

- apps/api/src/jobs/ticketizer.ts  
  – Converts strategy outputs into tickets.

- apps/api/src/jobs/manager.ts

- apps/api/src/jobs/scheduler.ts  
  – How jobs are orchestrated (timing, symbols, scheduling).

**Signals / Engine Routes**

- apps/api/src/routes/signals.ts

- apps/api/src/routes/strategy-engine.ts

- apps/api/src/routes/enginePreview.ts

**Shared Libraries / Types**

- @prism-apex/strategies (from your monorepo packages)

- apps/api/src/jobs/session-metrics/\* (metrics consumed by strategies)

- apps/api/src/store/tickets.ts (ticket write path shared with EPIC 2)

Later Codex Terminal scripts should **only wire into these**; any “new
engine” is a bug.

### **0.5.2 Background**

Currently:

- Strategies **already run** against SessionMetrics and bars.

- Ticketizer **already writes** tickets.

- Worklist/Tickets currently **see output** from this pipeline.

But:

- Timing of when strategies run relative to bar-close / ingest is not
  crisply defined.

- Idempotency and duplicate protection are implicit, not guaranteed by
  contract.

- Arbitration between strategies is scattered, not centralised or
  well-logged.

- Latency (bar-close → ticket written) is not measured.

- Error handling and retries are not formally specified.

This epic fixes that so:

- **Profit**: signals are consistent and reproducible; backtests match
  live behaviour.

- **Risk**: you don’t get double tickets or missed tickets due to job
  races.

- **Tooling**: analytics and Strategy Lab can depend on a stable engine.

- **UI**: Worklist updates predictably per bar-close, not randomly.

### **0.5.3 Objectives / Goals**

1.  Ensure **strategies run exactly once per bar-close per symbol**, in
    a controlled window after Yahoo ingest + SessionMetrics completion.

2.  Ensure **no duplicate signals/tickets** for the same (symbol,
    strategy, barTimestamp).

3.  Make cross-strategy **arbitration rules explicit and centralised**.

4.  Measure and, if needed, improve **bar-to-ticket latency** in Docker.

5.  Make error handling and retries predictable and observable.

## **STORY 0.5.1 — Deterministic Bar-Close Scheduling**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/strategies.ts

- apps/api/src/jobs/scheduler.ts

- apps/api/src/jobs/manager.ts

- apps/api/src/jobs/session-metrics/\* (for dependency order)

### **Background**

Right now the strategies job is scheduled and runs, but:

- Exact timing vs Yahoo ingest + SessionMetrics is not formalised.

- We need a guarantee: **“do not run this bar’s strategies until bars +
  metrics for that bar are ready.”  **

### **Functional Requirements**

1.  **Define “bar-close run window”  **

    - For Yahoo 1m bars, choose a simple rule:

      - e.g. schedule strategy job at bar_timestamp + small_offset (e.g.
        +5s) to allow ingest and SessionMetrics to complete.

    - Document this in code comments + a short doc section.

2.  **Enforce dependencies:  **

    - strategies.ts should only run after:

      - Ingest job for that bar/session runs (EPIC 0).

      - SessionMetrics job for that bar/session runs (EPIC 1).

    - This can be as simple as:

      - Running SessionMetrics job first in scheduler.ts sequence.

      - Then strategies job.

    - No fancy DAG required, just **ordered jobs** and documented
      expectation.

3.  **Single-run per bar per symbol:  **

    - Ensure that for each (symbol, barTimestamp):

      - strategies.ts is invoked once, or

      - Re-runs are idempotent and do not produce duplicates (handled in
        next story).

### **Validation Rules**

- For a test symbol/day:

  - Number of strategy executions per bar equals number of bars.

- Job logs must clearly indicate:

  - strategy_run_for_symbol=X at bar=YYYY-MM-DDTHH:MMZ.

### **Acceptance Criteria**

- In a Golden Day replay, you can see:

  - A stable, 1:1 mapping between bar-close timestamps and strategy
    runs.

- No second engine or extra scheduler is introduced; we only adjust
  scheduler.ts / manager.ts and document ordering.

## **STORY 0.5.2 — Idempotency & Duplicate Signal Prevention**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/strategies.ts

- apps/api/src/jobs/ticketizer.ts

- apps/api/src/store/tickets.ts

- Any ticket identity/index constraints in DB migrations

### **Background**

Strategies and ticketizer already exist, but:

- Identity of a signal/ticket is implicit.

- We must prevent duplicate tickets when:

  - Jobs are retried.

  - Strategies are re-run for debugging.

  - Schedulers misfire.

### **Functional Requirements**

**Define canonical signal/ticket identity in code:  
  **
For example:  
  
type SignalIdentity = {

symbol: string;

strategy: string;

barTimestamp: string; // or Date

};

1.  - Where barTimestamp is the bar-close or signal timestamp stored in
      DB.

2.  **Ticket store check in ticketizer.ts / store/tickets.ts:  **

    - Before creating a new ticket:

      - Query by (symbol, strategy, barTimestamp) (and maybe side/dir if
        needed).

    - If one exists:

      - Do not insert a second ticket.

      - Optionally log a “duplicate prevented” info log.

3.  **Optional DB-level support:  **

    - If appropriate, add a **unique index** at DB level on (symbol,
      strategy, bar_timestamp) to enforce no duplicates.

    - Only if it doesn’t break existing use-cases.

### **Validation Rules**

- Re-running strategies.ts + ticketizer.ts for the same Golden Day data
  set:

  - Must not increase ticket count.

- Manual “double-run” through Codex Terminal produces:

  - “0 new tickets inserted” after first run.

### **Acceptance Criteria**

- You can confidently re-run the strategy/ticket jobs for testing or
  replay without corrupting data.

- Tickets for a given bar/strategy are unique unless explicitly allowed
  (e.g., separate long/short, if that’s how your engine works – then
  identity adds direction).

## **STORY 0.5.3 — Centralised Cross-Strategy Arbitration**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/strategies.ts

- apps/api/src/jobs/ticketizer.ts

- apps/api/src/store/tickets.ts

- Any existing arbitration utilities in @prism-apex/strategies

### **Background**

You already have multiple strategies (ORR, OSB, VWAP-FT) and some notion
of which one “wins” when they fire around the same bar. Today:

- Arbitration logic is likely embedded in multiple places.

- Tickets do not always carry explicit “arbitrated out” reasons.

### **Functional Requirements**

**Central arbitration function  
  **
Define a function (in a shared module) used by strategies.ts /
ticketizer.ts:  
  
type StrategySignal = { /\* existing shape \*/ };

type ArbitrationResult = {

primary: StrategySignal \| null;

suppressed: { signal: StrategySignal; reason: string }\[\];

};

function arbitrateSignals(signalsForBar: StrategySignal\[\]):
ArbitrationResult;

1.  Rules (examples to codify):

    - Prefer higher score.

    - If equal, prefer less risk / simpler structure.

    - Optionally prefer “core” strategy (e.g. ORR) over experimental
      ones when score is within tolerance.

2.  **Ticket writing based on arbitration:  **

    - primary → becomes a PENDING ticket (subject to risk in later EPIC
      3).

    - suppressed → tickets written as:

      - status = ARBITRATED_OUT.

      - reason_category = "ARBITRATED_OUT".

      - reason_summary telling the operator why (e.g. “Lower score than
        ORR on same bar”).

3.  **UI integration (dependency):  **

    - Worklist (EPIC 4) must only show primary tickets.

    - Tickets page (EPIC 5) must show suppressed ones with reason.

### **Validation Rules**

- For any (symbol, barTimestamp):

  - At most **one primary** ticket across strategies.

- Suppressed tickets are always labelled and never appear in Worklist.

### **Acceptance Criteria**

- For a test day where ORR and OSB both fire on the same bar:

  - Worklist shows only the arbitrated winner.

  - Tickets page shows the loser with status=ARBITRATED_OUT.

## **STORY 0.5.4 — Bar-to-Ticket Latency Measurement**

**Type:** NEW behaviour, built on existing jobs  
**Key files/folders to use:**

- apps/api/src/jobs/strategies.ts

- apps/api/src/jobs/ticketizer.ts

- apps/api/src/jobs/session-metrics/\*

- Logging/config modules (apps/api/src/lib/\*)

### **Background**

Right now you “feel” it’s slow. We need facts.

We want a clear picture of:

bar_persisted_at → metrics_done_at → strategies_started_at →
strategies_completed_at → ticket_written_at

### **Functional Requirements**

1.  **Instrument key timestamps:  
      **
    Add lightweight timing in:

    - session-metrics job → metrics_done_at.

    - strategies.ts → strategies_started_at, strategies_completed_at.

    - ticketizer.ts → ticket_written_at per batch.

2.  **Log latency metrics:  
      **
    For each bar/strategy batch log:

    - symbol, session, barTimestamp.

    - Derived latencies:

      - metrics_latency_ms = metrics_done_at - bar_persisted_at.

      - strategy_latency_ms = strategies_completed_at - metrics_done_at.

      - ticket_latency_ms = ticket_written_at - strategies_completed_at.

      - total_pipeline_ms = ticket_written_at - bar_persisted_at.

3.  **Optional summary endpoint (v1):  **

    - Add a simple debug route in apps/api/src/routes/status.ts or a new
      routes/debugPipeline.ts to return the latest latency stats.

### **Validation Rules**

- Logging must be guardable by an env flag to avoid spam in prod (e.g.
  PIPELINE_LATENCY_LOG=1).

- Timestamps must be monotonic and correctly ordered.

### **Acceptance Criteria**

- On your Mac/Docker, you can see numbers like:

  - “Bar→Ticket: 350ms” for typical runs.

- You can identify whether the bottleneck is:

  - Metrics, strategies, or ticket writes.

## **STORY 0.5.5 — Error Handling & Safe Retries**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/strategies.ts

- apps/api/src/jobs/ticketizer.ts

- apps/api/src/jobs/manager.ts / scheduler.ts

- Existing logging/alerting in apps/api/src/routes/alerts.ts,
  telemetry.ts

### **Background**

If a strategy job or ticketizer fails:

- You risk missing tickets for that bar.

- Or partially writing corrupt data.

- Currently this behaviour is not clearly defined or surfaced to
  UI/analytics.

### **Functional Requirements**

1.  **Failure outcome policy:  **

    - If SessionMetrics fails for a bar:

      - Do not run strategies for that bar.

      - Log a clear “metrics failure” event.

    - If strategies fail:

      - Do not write any PENDING tickets for that bar.

      - Optionally write ERROR tickets with reason “ENGINE_ERROR”.

    - If ticketizer fails mid-batch:

      - Either:

        - Rollback batch (if transactional), or

        - Mark the batch as failed and make it re-runnable.

2.  **Retry policy:  **

    - For transient errors (e.g. DB connection blip):

      - Retry strategies/ticketizer once or twice with small delay.

    - For persistent errors:

      - Stop retries and log as ERROR with enough context.

3.  **Visibility:  **

    - Ensure errors feed into:

      - alerts.ts / telemetry.

      - System/Status page (EPIC 9) as “Strategy Engine degraded /
        errors last N minutes”.

### **Validation Rules**

- A simulated failure in strategies must:

  - Not crash the job manager permanently.

  - Produce an alert/log entry.

  - Not produce partial PENDING tickets.

### **Acceptance Criteria**

- You can intentionally “break” a strategy in dev and see:

  - Clean failure handling.

  - No dirty tickets.

  - A clear signal in logs/Status page.

## **EPIC 0.5 – Done Definition (Against Your V2 Principles)**

When EPIC 0.5 is complete:

- **Profit-driven:  **

  - Signals are deterministic, reproducible, and bar-close aligned →
    backtests match live.

- **Smart risk & tickets:  **

  - No duplicate or missing tickets due to job races; risk logic
    (EPIC 3) sits on predictable inputs.

- **Excellent calculations & tooling:  **

  - Latency and errors are measured and observable; Strategy Lab and
    Analytics can trust the pipeline.

- **Glossy, modern UI:  **

  - Worklist/Tickets refresh smoothly after each bar-close, driven by a
    stable engine instead of opaque delays.


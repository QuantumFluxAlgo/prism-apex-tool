## **📘 EPIC 0 — Ingestion Engine Stability (Yahoo 1m, Session-Aware)**

**Goal:  **
Make the existing Yahoo + jobs pipeline **bulletproof, observable, and
fast enough** that bar-close strategy and Worklist can operate
confidently and near real-time (given 1m bars).

This epic is **not** about inventing a new ingest system. It’s about
tightening and documenting what’s already in this branch so later work
(signals, tickets, risk, UI) sits on solid ground.

### **0.1 Existing Implementation to Reuse**

All work in this epic **must reuse and extend** these components:

- **Ingest / Yahoo / Jobs  **

  - apps/ingest/\*

  - apps/ingress-yahoo-dev/\*

  - apps/api/src/jobs/feed.ts

  - apps/api/src/jobs/scheduler.ts

  - apps/api/src/jobs/session-metrics/\*  
    (batch / runtime / golden-days / session flags)

- **Routes exposing market/metrics  **

  - apps/api/src/routes/market.ts

  - apps/api/src/routes/metrics.ts

  - apps/api/src/routes/sessionMetrics.ts

- **Docs / Runbooks  **

  - docs/PRISM_APEX_DELIVERY_PLAN.md

  - docs/runbooks/\* (anything about ingest/metrics)

Codex Terminal scripts later should **only adjust/harden** these; no
parallel pipeline.

### **0.2 Background**

Everything profit-related (good signals, good risk, good analytics)
depends on:

- Bars arriving correctly and on time.

- Sessions being tagged consistently.

- Metrics (VWAP/OR/ATR) having accurate raw inputs.

Right now:

- Yahoo ingest works, but its **behaviour, performance, and guarantees**
  are not fully documented or enforced.

- SessionMetrics jobs assume certain ingest behaviour.

- In Docker, you’ve seen **bar → ticket feel slow**, and we don’t yet
  know whether ingest is a bottleneck.

This epic:

- Turns the current ingest + jobs into a **well-understood subsystem**
  with:

  - Clear behaviour.

  - Clear performance characteristics.

  - Clear failure modes.

That’s critical to:

- **Profit** → bad bars = bad signals = bad trades.

- **Smart risk** → risk logic is useless if the underlying data is
  junk/laggy.

- **UI** → Worklist and Market charts cannot look “V2 glossy” if the
  data is inconsistent.

### **0.3 Objectives / Goals**

1.  **Document & normalise the Yahoo ingest pipeline** that already
    exists.

2.  Guarantee **idempotency & bar integrity** (no dupes, no silent
    gaps).

3.  Make **session alignment** canonical and explicit.

4.  Measure and improve **latency** in Docker so:

    - From ingest start to bars persisted is predictable and fast
      enough.

5.  Expose enough **logging & metrics** that System/Reports pages can
    show ingest health clearly.

## **STORY 0.1 — Document & Normalise the Existing Yahoo Ingest Pipeline**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/ingest/\*

- apps/ingress-yahoo-dev/\*

- apps/api/src/jobs/feed.ts

- apps/api/src/jobs/scheduler.ts

- Any referenced config/env for symbol lists and ranges

### **Background**

The pipeline is already there, but it’s tribal knowledge. We need it
formalised so:

- You and your colleague know **what runs where**.

- Codex Terminal scripts later know **which job to call** instead of
  inventing new ones.

### **Functional Requirements**

1.  **Pipeline inventory & docs  **

    - Identify:

      - The main entrypoints (e.g. CLI or job functions) used to ingest
        Yahoo data.

      - How Docker compose starts these jobs.

      - How dev ingress (apps/ingress-yahoo-dev) is intended to be used.

    - Add a short doc:

      - Either docs/runbooks/INGEST_YAHOO.md or a section in
        PRISM_APEX_DELIVERY_PLAN.md.

      - Describe “How to run Yahoo ingest for a symbol/date range in
        dev”.

2.  **Idempotent ingest behaviour  **

    - Confirm the existing code:

      - Does **not** create duplicate rows when re-run for the same
        (symbol, timestamp).

    - If any part is non-idempotent:

      - Fix inserts to use UPSERT or “insert if not exists”.

3.  **Explicit “run once” mode for dev  **

    - Provide a single, documented command (via feed.ts / scheduler.ts
      / CLI) to:

      - Ingest specific symbol(s)

      - For a specific date or date range

    - This command is what Codex Terminal scripts will call.

### **Validation Rules**

- Running the same ingest job twice for the same symbol + date range:

  - Must leave the bar count unchanged (no duplicates).

- No new ingest binaries/scripts are introduced; everything routes
  through the existing job trees.

### **Logging & Observability**

- Existing logs should:

  - Report symbols processed.

  - Date ranges.

  - Number of bars written/updated.

If they don’t, extend the job logging in apps/api/src/jobs/feed.ts to
include that.

### **Acceptance Criteria (Concrete)**

- There is a doc telling your colleague how to:

  - “Ingest 1 day of ES via Yahoo into dev using Docker.”

- You can run:

  - That command twice for the same day and confirm row counts in the
    bars table remain stable.

- No new ingest module or service is created; we only tweak and document
  existing code.

## **STORY 0.2 — Gapfill & Bar Integrity (Build on Session-Metrics Golden Days)**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/\*

  - Especially golden-days/\*, session-flags-service.ts, integrity
    checks

- Any bar tables referenced by these jobs

### **Background**

You already have **Golden Day fixtures** in session-metrics, which
implies:

- You care about gaps and anomalies.

- You have some checking already.

We want to **piggyback** on that, not duplicate it, and ensure bars used
for metrics/signals are:

- Continuous where expected.

- Explicitly flagged if synthetic (gapfilled).

### **Functional Requirements**

1.  **Gap detection via existing session-metrics tools  **

    - Reuse session-metrics jobs to detect missing 1m bars in a session.

    - Extend them (if needed) to:

      - Emit a clear flag or metric for gaps.

      - Record how many synthetic bars were created.

2.  **Synthetic bar flagging  **

    - Where gapfill is already implemented:

      - Ensure synthetic bars have is_synthetic (or equivalent
        boolean/enum) at DB or DTO level.

    - Ensure SessionMetrics and later overlays can see that.

3.  **Integrity checking harness  **

    - Extend existing Golden Day tests so they:

      - Assert bar counts and continuity for those days.

      - Assert is_synthetic is set only where expected.

### **Validation Rules**

- Golden Days must pass without surprise gaps.

- Synthetic bars must never be mistaken for real ones in later analytics
  (flag is essential).

### **Logging & Observability**

- SessionMetrics logs (or ingest logs) should report:

  - gaps_detected=N

  - synthetic_bars_created=M

### **Acceptance Criteria**

- For known incomplete Golden Day(s):

  - N \> 0 gaps reported.

  - M synthetic bars flagged.

- For complete days:

  - N == 0, M == 0.

- Market/Worklist/Analytics can, in future, avoid treating synthetic
  bars as true market events if needed.

## **STORY 0.3 — Canonical Session Alignment (Using Existing Session-Metrics Logic)**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/\*

  - batch.ts

  - session-flags-service.ts

  - Any “session” helpers they use

- apps/api/src/routes/sessionMetrics.ts

### **Background**

The session concept is already baked into SessionMetrics. We don’t want
a second “session definition” elsewhere.

We just need to:

- Make sure this logic is treated as **law**,

- And that bars/tickets/metrics all refer back to the same session key
  concept.

### **Functional Requirements**

1.  **Single source of truth for session definitions  **

    - Confirm the existing session rules (e.g. ES RTH start/end).

    - Document them in:

      - docs/runbooks/SESSIONS.md (or similar), referencing the job
        code.

2.  **Session key usage  **

    - Ensure the same session_key or (symbol, sessionDate) is used
      consistently in:

      - SessionMetrics jobs.

      - Tickets store / queries that join metrics.

      - Any analytics that group by session.

3.  **Bar→session mapping check  **

    - Use or extend existing jobs to verify:

      - Every bar used by SessionMetrics has a clear session assignment.

      - No bar is assigned to multiple sessions.

### **Validation Rules**

- All SessionMetrics queries should be by session key, not ad-hoc WHERE
  ts BETWEEN ....

- Tickets route that enriches with metrics must go through the canonical
  session key mapping.

### **Acceptance Criteria**

- A dev can answer “What is a session?” by reading a short doc and the
  code points to the same rules.

- A simple diagnostic query / function can, for a given bar, show which
  session it belongs to and which SessionMetrics row is used.

## **STORY 0.4 — Ingest Latency & Throughput Profiling (Docker)**

**Type:** NEW behaviour, built on existing jobs  
**Key files/folders to use:**

- apps/api/src/jobs/feed.ts

- apps/api/src/jobs/scheduler.ts

- apps/ingest/\* and apps/ingress-yahoo-dev/\*

- apps/api/src/routes/health.yahoo.ts / status.ts if useful for
  surfacing metrics

### **Background**

You’ve said clearly:

> *“It feels slow in Docker. I need the whole system to do all the
> functions and generate tickets as close to real time as we can.”*

We can’t fix what we don’t measure.

This story instruments existing jobs to tell us:

- How long Yahoo ingest actually takes.

- Whether ingest is the bottleneck or whether latency is further
  downstream.

### **Functional Requirements**

1.  **Timing instrumentation in jobs  **

    - Surround the main Yahoo ingest path in feed.ts / related jobs
      with:

      - ingest_start_at

      - ingest_end_at

    - Calculate:

      - ingest_duration_ms

      - bars_processed

      - bars_per_second

2.  **Profiling scenarios  **

    - In Docker, run:

      - 1-day ingest for a single symbol.

      - 5–10 day ingest for a single symbol.

    - Capture timings.

3.  **Targets (initial, not hard constraints)  **

    - 1 day / 1 symbol: target \< 5s.

    - 1 week / 1 symbol: target \< 30s.

4.  If current performance is worse:

    - Identify obvious hot spots (DB indexing, batch sizes, network
      waits).

5.  **Surface metrics  **

    - Option A: log them in structured log lines (preferred).

    - Option B: optionally expose a small GET /health.yahoo extension
      that includes last-run stats.

### **Validation Rules**

- Instrumentation must not materially slow down ingest.

- Measurements must be repeatable (similar results across runs).

### **Acceptance Criteria**

- You have concrete numbers for:

  - “1 day ES ingest = X ms, Y bars, Z bars/s”.

- If ingest is not the bottleneck, you can stop blaming it and look at
  strategy/ticket jobs instead.

- If ingest *is* the bottleneck, you have specific candidates to tweak
  (batch writes, indices).

## **EPIC 0 – Done Definition (Context for Profit / Risk / UI)**

When EPIC 0 is complete:

- The **Yahoo ingest + jobs pipeline you already have** is:

  - Documented.

  - Idempotent.

  - Session-aware.

  - Measured.

- We have **hard data** on ingest latency in Docker and a clean way to
  adjust it.

This directly supports your V2 principles:

- **Profit-driven:** clean, timely data → fewer garbage signals and
  mispriced trades.

- **Smart risk:** risk rules aren’t fighting bad inputs.

- **Excellent calculations:** SessionMetrics / analytics trust the bar
  layer.

- **Glossy UI:** Market, Worklist, Reports pages read from a **solid
  foundation** instead of “maybe ok” data.

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

## **📘 EPIC 1 — Session Metrics & Context Pipeline**

*VWAP / OR / ATR / Regime / Volatility context for signals, Worklist,
Tickets, Market, Analytics*

**Goal:  **
Take the **existing SessionMetrics subsystem** and turn it into a
**single, canonical context layer** that:

- Computes VWAP/OR/ATR/Regime once.

- Stores and exposes them cleanly.

- Serves **Worklist**, **Tickets**, **MarketData**, **Analytics**, and
  **Strategy Lab**.

- Directly supports profit-focused decisions, risk insight, and a
  polished V2 UI.

This epic **reuses** your current session-metrics engine. We are not
rebuilding it; we’re formalising it and wiring it cleanly into the rest
of the platform.

### **1.1 Existing Implementation to Reuse**

All work in this epic must **build on** these components:

**Session Metrics Jobs / Engine**

- apps/api/src/jobs/session-metrics/

  - batch.ts

  - populate-session-metrics.ts

  - session-flags-service.ts

  - golden-days/\* (fixtures & tests)

  - Any shared helpers in this folder.

**Routes / API**

- apps/api/src/routes/sessionMetrics.ts

- apps/api/src/routes/metrics.ts

- apps/api/src/routes/market.ts

**Consumers**

- apps/api/src/routes/tickets.ts

  - Enrichment logic that attaches session metrics to tickets rows.

- apps/api/src/store/tickets.ts

  - Where ticket DTOs are shaped.

- apps/dashboard/src/pages/MarketData.tsx

- apps/dashboard/src/pages/Worklist.tsx (and backups)

- apps/dashboard/src/pages/Reports.tsx

Codex Terminal work later must **not** create another metrics engine. It
should **extend these**.

### **1.2 Background**

You already:

- Compute session metrics (VWAP, OR, ATR, flags) in session-metrics
  jobs.

- Use them in:

  - Tickets routes for context.

  - Market/metrics routes for some charts and stats.

  - Golden-day tests to validate data quality.

What’s missing to hit your V2 goals:

- A **clean, consistent per-bar metrics series** (VWAP, ATR, regime, OR
  context) that the MarketData page and Worklist can consume.

- A **context snapshot service** for signals / tickets / Worklist rows.

- A **single Market overlay API** tailored to the UI designs.

- Stronger **consistency validation** so SessionMetrics and strategies
  never diverge.

Done right, this epic:

- **Improves profit** by making context precise and reliable (no “blind
  trades”).

- **Supports risk** by giving risk engine and operator full awareness of
  volatility/regime/OR/VWAP context.

- **Boosts tooling & UI** by enabling rich overlays, tooltips, and tags
  that look deliberate and premium.

### **1.3 Objectives / Goals**

1.  Treat apps/api/src/jobs/session-metrics/\* as the **canonical
    session context engine**.

2.  Provide **per-bar metrics series**: VWAP, ATR, regime, OR context in
    a reusable structure.

3.  Provide a **Context Snapshot Service**:

    - contextFor(symbol, ts) → all tags used in Worklist/Tickets.

4.  Provide **Market overlay endpoints** tailored to the MarketData
    page.

5.  Tighten **Golden Day validation** to guard against regressions.

## **STORY 1.1 — Canonical SessionModel & SessionMetrics Ownership**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/batch.ts

- apps/api/src/jobs/session-metrics/session-flags-service.ts

- apps/api/src/jobs/session-metrics/\*

- apps/api/src/routes/sessionMetrics.ts

- docs/PRISM_APEX_DELIVERY_PLAN.md (for adding a short section)

### **Functional Requirements**

1.  **Declare session-metrics the canonical source of session
    definitions:  **

    - RTH rules for ES/NQ (start/end times) used in:

      - SessionMetrics job.

      - Any other session logic must reference these rules (no
        duplicated calendars).

2.  **Document session model:  **

    - Add a short “Session Model” section to
      docs/PRISM_APEX_DELIVERY_PLAN.md (or a dedicated
      docs/SESSIONS.md), explaining:

      - How a session is identified (symbol + date, or session_key).

      - Which job populates it.

      - How these metrics are expected to be used by API routes.

3.  **Ensure all SessionMetrics code uses a consistent session_key /
    (symbol, sessionDate) pattern**:

    - Align query filters in batch.ts, sessionMetrics.ts, market.ts to
      the same model.

### **Validation Rules**

- No alternate session-logic helpers are introduced outside
  session-metrics without explicitly referencing it.

- Tickets and Market routes use the same session identification
  semantics as SessionMetrics.

### **Acceptance Criteria**

- A dev can answer “What is a session and where is it defined?” with one
  doc and the session-metrics code.

- No divergent session logic appears elsewhere in the API.

## **STORY 1.2 — Per-Bar VWAP / ATR / OR Context / Regime Series**

**Type:** EXTEND / HARDEN existing logic  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/batch.ts

- apps/api/src/jobs/session-metrics/populate-session-metrics.ts

- apps/api/src/jobs/session-metrics/session-flags-service.ts

- Any per-bar metrics table or JSON fields currently written

- DB migrations if needed (to store per-bar series cleanly)

### **Functional Requirements**

1.  **VWAP per bar:  **

    - Ensure for each session (symbol + session_date):

      - A VWAP time series is computed for each 1m bar from session open
        to close.

    - If not already stored, add:

      - Either a session_metrics_bars table or a JSONB field in the
        existing table capturing \[{ ts, vwap, atr, regime, orContext
        }\].

2.  **ATR per bar:  **

    - Compute ATR(N) (e.g. 20) per bar and store alongside VWAP.

    - Map ATR to volatility buckets (e.g. low/medium/high).

3.  **OR context per bar:  **

    - Using existing OR metrics (first 30 minutes):

      - For each subsequent bar label:

        - inside, above_range, below_range (or equivalent).

4.  **Regime per bar:  **

    - Use existing slope/flags logic in session-flags-service.ts to:

      - Produce a per-bar regime tag:

        - trend_up, trend_down, chop, or_breakout (or your chosen set).

5.  **Storage shape:  **

    - Choose a single representation (table or JSONB) that:

      - Can be queried efficiently for a session.

      - Is simple for Market & Worklist to consume.

### **Validation Rules**

- Per-bar series must cover all bars in the session with no gaps except
  known missing bars (EPIC 0 gapfill rules).

- Regime and OR context tags must be consistent with existing Golden
  Days.

### **Acceptance Criteria**

- For a Golden Day:

  - You can query per-bar metrics and see VWAP, ATR, OR context, and
    regime for each bar.

- MarketData page will be able to overlay VWAP/ATR/OR/regime using this
  series with no extra computations.

## **STORY 1.3 — Context Snapshot Service for Worklist & Tickets**

**Type:** NEW THIN SERVICE over existing metrics  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/\* (data source)

- New service module, e.g.:

  - apps/api/src/services/context/contextSnapshotService.ts

- Consumers:

  - apps/api/src/routes/tickets.ts

  - apps/api/src/store/tickets.ts

  - Future /worklist route (EPIC 4)

### **Functional Requirements**

**Implement a context snapshot API in code (service-level):  
  **
A function like:  
  
type ContextSnapshot = {

sessionKey: string;

regime: string;

volatilityBucket: string;

atr: number \| null;

vwapDeviation: number \| null; // e.g. % or z-score

vwapPosition: "above" \| "below" \| "inside_band";

orContext: "inside" \| "above_range" \| "below_range";

};

async function getContextSnapshot(symbol: string, ts: Date):
Promise\<ContextSnapshot \| null\>;

1.  - Uses SessionMetrics data for the relevant session and bar
      timestamp.

    - Reuses the per-bar series from Story 1.2.

2.  **Integrate into Tickets pipeline:  **

    - Modify apps/api/src/routes/tickets.ts (and/or store/tickets.ts)
      to:

      - Attach ContextSnapshot to ticket DTOs used by:

        - Tickets page.

        - Worklist feed (EPIC 4).

3.  **Future-proof for Strategy Lab & Analytics:  **

    - Ensure ContextSnapshot structure is generic enough to be reused
      by:

      - Strategy Lab scenario views.

      - Analytics breakdowns by volatility/regime.

### **Validation Rules**

- For any ticket with (symbol, timestamp):

  - getContextSnapshot must return non-null context if data exists for
    that session.

- Null is allowed only if:

  - The bar is outside session or metrics incomplete.

### **Acceptance Criteria**

- Tickets API can return context fields:

  - regime, volatility, vwap position, OR context, ATR, sessionKey.

- Later Worklist endpoint can consume these directly without
  recomputing.

## **STORY 1.4 — Market Overlay API for VWAP / ATR / OR / Regime**

**Type:** EXTEND / HARDEN existing routes  
**Key files/folders to use:**

- apps/api/src/routes/market.ts

- apps/api/src/routes/metrics.ts

- apps/api/src/routes/sessionMetrics.ts

- apps/api/src/jobs/session-metrics/\* (data source)

- Consumer:

  - apps/dashboard/src/pages/MarketData.tsx

### **Functional Requirements**

**Single overlay endpoint:  
  **
Extend or add under market.ts:  
  
GET /market/overlays

?symbol=ES

&sessionDate=YYYY-MM-DD

1.  

**Response DTO (example structure):  
  **
{

"symbol": "ES",

"sessionDate": "2025-01-14",

"vwapSeries": \[

{ "ts": "...", "vwap": 123.45, "vwapDeviation": 0.7 }

\],

"atrSeries": \[

{ "ts": "...", "atr": 5.3, "volatilityBucket": "high" }

\],

"orRange": {

"startTs": "...",

"endTs": "...",

"high": 124.1,

"low": 120.7

},

"regimeSeries": \[

{ "ts": "...", "regime": "trend_up" }

\]

}

2.  

3.  **Consumption in MarketData page:  **

    - apps/dashboard/src/pages/MarketData.tsx must use this overlay DTO
      for:

      - VWAP line + bands.

      - OR region shading.

      - Regime/ATR overlays.

4.  **Profit & risk relevance:  **

    - Overlays must accurately signal:

      - Trend vs chop.

      - Breakout vs range.

      - Volatility regime.

### **Validation Rules**

- Overlays must line up with raw candle data (no time drift).

- For Golden Days, overlays must match expected OR and regime patterns.

### **Acceptance Criteria**

- MarketData charts render:

  - VWAP line and OR range correctly for a known test day.

- You can visually confirm:

  - Regime shading and volatility markers match what you’d expect for
    trend/chop days.

## **STORY 1.5 — Consistency & Golden Day Validation for Context**

**Type:** EXTEND existing tests  
**Key files/folders to use:**

- apps/api/src/jobs/session-metrics/golden-days/\*

- Applicable tests in apps/api/\_\_tests\_\_ or apps/api/tests that
  already exercise SessionMetrics.

- New tests wiring ContextSnapshot and Market overlays where sensible.

### **Functional Requirements**

1.  **Extend Golden Day fixtures to include:  **

    - Expected VWAP/ATR/OR/regime patterns at key timestamps.

    - Expected context snapshots for a handful of bars.

2.  **Add assertions:  **

    - For chosen timestamps:

      - getContextSnapshot(symbol, ts) returns the expected
        regime/volatility/OR/VWAP position.

    - Overlay endpoint returns values matching fixture data:

      - OR high/low.

      - VWAP at certain bars.

      - Regime tags.

3.  **Tie into CI:  **

    - Ensure these tests run in default test suite for apps/api.

### **Validation Rules**

- Changes to SessionMetrics logic that alter these behaviours must:

  - Fail tests, forcing explicit review and fixture updates.

### **Acceptance Criteria**

- You have at least:

  - 1 trend-up Golden Day.

  - 1 chop Golden Day.

  - 1 OR-breakout Golden Day.

- For each, session metrics + overlays + context snapshots all match the
  documented expectations.

## **EPIC 1 – Done Definition (Against Your V2 Principles)**

When EPIC 1 is complete:

- **Profit-driven:  **

  - Every signal/ticket/Worklist row is backed by rich, accurate context
    (VWAP, OR, ATR, regime), helping you filter for the best trades and
    avoid low-quality setups.

- **Smart risk & ticket generation:  **

  - Risk calculations (EPIC 3) and guardrails can use volatility and
    regime context directly, instead of flying blind.

  - Tickets clearly encode the session context at creation time.

- **Excellent calculations & tooling:  **

  - The metrics engine is centralised, tested with Golden Days, and
    exposes per-bar series and context snapshots for Market, Analytics,
    and Strategy Lab.

- **Glossy, sexy modern UI:  **

  - The MarketData page can render VWAP/ATR/OR/regime overlays cleanly.

  - Worklist and Tickets can show consistent context pills/tags, giving
    the UI a deliberate, premium feel.

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

# **📘 EPIC 6 — Market Context Page (Rewritten for Unified Ticket Model)**

## **6.1 Background**

The Market Context Page provides an operational, real-time view of price
action, session structure, and market regime to support operator
situational awareness. In V1, the page functioned primarily as a chart
and overlay viewer, without consistent integration to ticketing outputs.

In V2, the Market Context Page must align with the unified pricing and
ticket model. This includes:

- absolute entry/stop/target markers

- consistent side logic

- properly derived tick metadata

- aligned session metrics (ATR, OR width, VWAP context)

- clear visual representation of strategy signals and volatility
  environment

This page does **not** perform risk or strategy logic. It exists to
**visualise context**, **validate conditions**, and **support operator
decision-making**.

## **6.2 Objectives / Goals**

1.  Provide operators with high-clarity, high-signal visual overlays for
    intraday decision support.

2.  Display market structure indicators: VWAP, OR range, ATR-based
    bands, volatility regimes.

3.  Visualise strategy signals and their absolute entry, stop, and
    target levels using canonical ticket data.

4.  Ensure chart markers and overlays align precisely with unified tick
    and price logic.

5.  Offer consistent UI/UX with the Worklist, Strategy Lab, and Reports
    pages.

6.  Maintain a clean, unobstructed view suitable for operational
    monitoring.

## **6.3 Functional Requirements**

### **6.3.1 Market Structure Overlays**

The page must display:

- VWAP and standard deviation bands

- OR High, OR Low, and OR Width

- ATR-based range envelopes

- Session boundaries (RTH, ETH, user-configured sessions)

- Trend/slope indicators where applicable

These overlays must derive from the Session Metrics service using the
same canonical data as Epics 1 and 2.

### **6.3.2 Ticket Markers (Canonical Model Integration)**

The chart must support visual markers for tickets:

- Entry price (primary marker)

- Stop price (protective marker)

- Target price (reward marker)

- Side-indicated coloration (Long = green; Short = red)

- Optional subtext showing tick deltas (e.g. “+20 ticks”)

All price levels must be snapped to the symbol’s tick grid before
rendering.

Markers must reflect **Risk Engine–approved** tickets only.

### **6.3.3 Strategy Signal Visualization**

When strategies emit candidate signals (before risk approval), the page
may optionally display:

- Preliminary signal markers in a muted color

- VWAP-touch points

- OSB boundaries and breakout signals

- OR breakout triggers

These indicators help operators validate how signals align to market
structure.

### **6.3.4 Contextual Metadata Panel**

A side-panel must display contextual metrics:

- ATR, OR width, volatility regime

- VWAP slope and regime classification

- Session directional bias

- Recent ticket history (absolute prices and sizing metadata)

- Strategy metadata attached to tickets

The panel must use canonical fields from Strategy Orchestrator and Risk
Engine outputs.

### **6.3.5 Operator Interaction**

Operators must be able to:

- Toggle overlays (VWAP, OR, ATR, etc.)

- Toggle ticket markers on/off

- Zoom, pan, and view historic context

- Hover over markers to see absolute entry/stop/target data + tick
  deltas

- Expand contextual metadata on demand

No editing or ticket approval happens on this page.

## **6.4 Validation Rules**

1.  **Price Markers  **

    - All marker prices must align to canonical ticket fields.

    - Entry, stop, and target markers must appear in correct directional
      order:

      - LONG → Target \> Entry \> Stop

      - SHORT → Stop \> Entry \> Target

2.  **Overlay Accuracy  **

    - VWAP, OR, ATR values must match Session Metrics service.

    - No UI-side recalculation of market structure values.

3.  **Signal Integrity  **

    - Strategy signals displayed must map directly to orchestrator
      outputs.

    - No synthetic or inferred signals permitted.

4.  **State Consistency  **

    - Ticket markers must not display for invalidated or expired
      tickets.

    - Context metadata must match the exact session of the displayed
      chart.

## **6.5 Logging & Observability**

The Market Context Page must log:

- Overlay load events

- Ticket marker rendering events

- Metadata panel load time

- Session Metrics retrieval success/failure

- Any discrepancies between canonical ticket data and rendered markers

- Latency metrics for data fetching

These logs are consumed by EPIC 9 (System Health & Observability).

## **6.6 Acceptance Criteria**

1.  All overlays display correct, real-time market structure
    fundamentals.

2.  Entry/stop/target markers render with correct absolute prices and
    correct side logic.

3.  Tick deltas are visible only as secondary metadata (hover or
    subtext).

4.  No UI-side recalculation of prices or risk sizing takes place.

5.  All displayed tickets originate from Risk Engine–approved records.

6.  Operators can toggle overlays and markers without UI degradation.

7.  All marker positions and metadata match the canonical ticket model
    exactly.

8.  Performance remains responsive under full session data load.

# **📘 EPIC 7 — Analytics Engine & Analytics UI (Reports Page V2)**

*(Rewritten for Unified Ticket Model: Absolute Entry/Stop/Target +
Deterministic Risk + Canonical Audit Data)*

## **7.1 Background**

The Analytics Engine and Reports Page provide the core performance
insights for operators and stakeholders. In V1, analytics relied on
incomplete or loosely defined ticket data, with inconsistent sourcing of
stop/target levels, ambiguous tick handling, and partial risk fields.  
In V2, with the introduction of the **canonical ticket model**, the
Analytics Engine must operate exclusively on complete, risk-approved,
immutable audit records.

This epic establishes a robust architecture for computing trade
performance, risk exposure, session outcomes, strategy behaviour, and
operator decision performance. The Reports UI must present this
information clearly and consistently using absolute entry/stop/target
prices and deterministic risk fields.

## **7.2 Objectives / Goals**

1.  Build a reliable Analytics Engine using canonical ticket data.

2.  Ensure all metrics use absolute prices, validated tick deltas, and
    deterministic risk outputs.

3.  Provide operators with clear session, symbol, and strategy-level
    performance insight.

4.  Enable historical reporting, daily summaries, and multi-day
    analytics.

5.  Ensure seamless integration with Audit, Worklist, and Strategy Lab.

6.  Deliver Reports Page V2 with consistent V2 UX design and pricing
    clarity.

## **7.3 Functional Requirements**

### **7.3.1 Canonical Data Source Integration**

Analytics must use the canonical audit objects generated by EPIC 5,
including:

- entry_price, stop_price, target_price

- target_ticks, stop_ticks

- quantity

- total_risk_ccy, per_contract_risk_ccy

- r_multiple

- realised_pnl

- strategy_id, symbol

- timestamps and lifecycle states

- Session Metrics snapshots (ATR, OR width, VWAP regime)

No analytics calculation may rely on recalculated or inferred price or
risk values.

### **7.3.2 Core Analytic Metrics**

Analytics Engine must compute:

- Realised P&L per trade

- Realised R-multiple

- Win rate, loss rate, break-even rate

- Average R-multiple

- Average per-contract risk

- Average stop size and target size (ticks & prices)

- Per-strategy performance

- Per-symbol performance

- Per-session summaries

- Expected vs actual R distribution

- Maximum favourable excursion (MFE)

- Maximum adverse excursion (MAE)

### **7.3.3 Session & Daily Summaries**

Session summaries must include:

- Total trades

- Total realised P&L

- Session-level win/loss breakdown

- Largest winner, largest loser

- Net risk deployed

- Volatility-regime correlation metrics

- Strategy contribution pie chart

Daily summaries must support multi-day and weekly review.

### **7.3.4 Strategy-Level Analytics**

The system must produce:

- Trade count by strategy

- Strategy-specific win/loss rates

- Average R per strategy

- Stop/target distribution

- Regime-based performance (VWAP slope, OR width, ATR bucket)

- Historical strategy performance trends

### **7.3.5 Reports Page V2 UI Requirements**

The Reports Page must present:

- A clean summary at the top (P&L, win rate, R-multiple metrics)

- A trade table showing:

  - Entry/stop/target prices

  - Realised P&L

  - R-multiple

  - Quantity

  - Strategy

  - Side

  - Session metrics snapshot

- Interactive filters (symbol, strategy, date range, session)

- A performance chart using canonical fields

- Export button for CSV/JSON

- Drill-down modal showing:

  - All canonical ticket fields

  - MAE/MFE

  - Tick distances

  - Price path visualisation

Pricing and risk data must match Worklist, Audit, and Strategy Lab
without any divergence.

### **7.3.6 Performance & Data Handling**

Analytics Engine must:

- Support incremental real-time updates

- Handle high-volume historical analysis

- Support backtest replay output

- Provide efficient indexing for timestamps, symbols, strategies, and
  sessions

- Maintain consistent performance under load

## **7.4 Validation Rules**

1.  **Canonical Data Validation  **

    - All analytic inputs must originate from immutable audit records.

    - No UI-side computation of prices, ticks, or risk.

2.  **P&L Validation  **

    - P&L must be computed using entry and exit price differences × tick
      value × quantity.

    - All realised values must reconcile with audit data.

3.  **R-Multiple Validation  **

    - Realised R must equal (realised_pnl / per_contract_risk_ccy).

4.  **Lifecycle Integrity  **

    - Only tickets with valid lifecycle states participate in analytics.

    - Cancelled/expired tickets can be included only in designated
      categories.

5.  **Filter & Query Integrity  **

    - All filters must operate on canonical fields.

    - No partial fields or inconsistent states.

## **7.5 Logging & Observability**

Analytics must log:

- Analytics computation events

- Session summary generation

- Export requests

- Query performance metrics

- Any mismatches between P&L calculation and source data

- Errors in data retrieval or data corruption events

Logs must integrate with EPIC 9 System Health Dashboard.

## **7.6 Acceptance Criteria**

1.  All analytics derive exclusively from canonical ticket model data.

2.  Reports Page V2 displays accurate entry/stop/target prices, risk
    values, and realised performance.

3.  Strategy, symbol, and session filtering behaves consistently.

4.  All rows and metrics reconcile perfectly with Worklist and Audit.

5.  Exported files match UI values with no discrepancies.

6.  Performance charts reflect correct P&L, risk, and R distributions.

7.  Operators can seamlessly analyse historical and real-time
    performance.

8.  No analytics rely on inferred or recalculated price/risk logic.

9.  The engine functions identically for backtest and live trade data.

    - 

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

# **📘 EPIC 10 — UI V2 Polish (Rewritten for Unified Ticket Model)**

## **10.1 Background**

The V2 UI aims to deliver a cohesive, modern, operator-focused interface
across all pages of the Prism Apex Tool. In V1, UI components were
inconsistent in styling, data formatting, price representations, and
dependency alignment across Worklist, Market Context, Strategy Lab, and
Reports.  
With V2, the UI must adopt a unified design foundation, fully aligned
with the **canonical ticket model**, displaying **absolute
entry/stop/target prices**, consistent tick metadata, and deterministic
risk metrics across all surfaces.

This epic defines the cross-application refinements required to deliver
a polished, professional, standards-driven UI that improves operator
clarity, reduces cognitive load, and eliminates divergence between
pages.

## **10.2 Objectives / Goals**

1.  Standardise all UI components under a unified V2 design system.

2.  Display absolute pricing (entry/target/stop) consistently across all
    pages.

3.  Ensure tick deltas appear only as secondary metadata, not primary UI
    elements.

4.  Deliver consistent rendering of risk metrics, session metrics, and
    ticket metadata.

5.  Improve readability, spacing, typography, and colour system across
    all modules.

6.  Ensure UI responsiveness and performance under high-frequency
    updates.

7.  Remove behavioural inconsistencies between Worklist, Lab, Market
    Context, and Reports.

## **10.3 Functional Requirements**

### **10.3.1 Unified Visual Design System**

All pages must adopt:

- A single typography scale

- Consistent colour palette for LONG/SHORT, risk, and metadata

- Unified grid spacing and layout rules

- Harmonised card, table, and modal components

- Standardised iconography for strategy, risk, and state indicators

These design tokens must be centrally defined and reused across all
pages.

### **10.3.2 Absolute Price Representation Standards**

All operator-facing surfaces must:

- Display **entry_price**, **target_price**, **stop_price** as primary
  values

- Display tick deltas as secondary metadata (subtext or hover)

- Use consistent numeric formatting

- Visually differentiate stop vs target price markers

- Enforce correct directional semantics:

  - LONG: target above entry above stop

  - SHORT: stop above entry above target

This requirement applies to Worklist, Market Context, Strategy Lab,
Reports, and any auxiliary UI component.

### **10.3.3 Unified Risk Display Components**

Create a single standard component for risk metrics, displaying:

- Quantity

- Per-contract risk (currency)

- Total risk (currency)

- R-multiple

- Tick distances (secondary)

This component must be visually identical wherever risk is shown
(Worklist, Lab, Reports).

### **10.3.4 Table & Grid Polish**

All tables must support:

- Fixed column hierarchy (Symbol, Side, Entry, Target, Stop, Qty, Risk,
  R)

- Consistent cell alignment and spacing

- Clean hover/active row states

- Uniform sorting and filtering icons

- Sticky headers for long datasets

- Equalised column widths for pricing fields

The Worklist table becomes the UI reference standard.

### **10.3.5 Chart Polish & Consistency**

Charts used in Market Context and Strategy Lab must:

- Use the same price marker styles (entry/target/stop)

- Maintain consistent colour and line rules

- Use a single time-axis formatting standard

- Provide unified tooltip structure

- Support overlay toggles using shared UI controls

Expected markers must snap to grid visually and follow canonical values.

### **10.3.6 Metadata Panel Refinement**

Metadata panels across pages must use:

- Standardised card layouts

- Consistent grouping of metrics (ATR, OR width, VWAP slope, regime)

- Uniform typography and spacing

- Canonical field ordering

Operators must immediately recognise metadata components regardless of
page.

### **10.3.7 Modal & Detail View Standardisation**

All modals (ticket detail, preview, trade breakdown) must adopt:

- A uniform header/footer structure

- Standard spacing and padding

- Consistent “Details” and “Metadata” sections

- Canonical ordering of ticket fields

- Shared risk component embedding

Modal content must match table and chart data exactly.

### **10.3.8 Performance & Data Handling Requirements**

The UI must:

- Handle high-frequency data updates efficiently

- Avoid unnecessary recalculation or re-rendering

- Defer heavy analytics to backend systems

- Cache data where appropriate

- Apply debouncing to avoid jittering

- Maintain sub-100ms interaction responsiveness

### **10.3.9 Platform Consistency Rules**

Across all pages:

- Price, tick, and risk fields must always come from backend canonical
  data

- No UI-side reconstruction of values

- No mismatches between Worklist, Reports, or Lab

- Styling must remain consistent even under dark mode/light mode if
  applicable

## **10.4 Validation Rules**

1.  **Canonical Formatting Compliance  **

    - Absolute prices displayed in all primary positions.

    - Tick deltas used only for supplementary metadata.

2.  **Styling Consistency  **

    - Every table, chart, panel, and modal must follow design tokens.

3.  **Risk Display Accuracy  **

    - R-multiple, risk metrics, and tick distances must match canonical
      backend values exactly.

4.  **Component Reuse  **

    - All V2-standard components must replace legacy UI fragments.

5.  **Latency & Performance  **

    - UI interactions remain responsive under load.

6.  **Cross-Page Data Consistency  **

    - The same ticket ID must show identical values across Worklist,
      Lab, Context, and Reports.

## **10.5 Logging & Observability**

UI must log:

- Rendering failures

- Invalid or missing fields from API responses

- Latency spikes and slow component mounts

- Mismatches between expected and received canonical ticket fields

- Operator interaction metrics (optional)

- Any inconsistent formatting or schema drift detection

Logs must be visible in the System Health Console (EPIC 9).

## **10.6 Acceptance Criteria**

1.  All pages adhere to V2 visual and interaction standards.

2.  Absolute entry/stop/target prices are consistent across every UI
    surface.

3.  Tick deltas are displayed only as secondary metadata.

4.  Risk components show accurate, canonical Risk Engine values.

5.  All tables, charts, panels, and modals use standardised styling.

6.  UI shows no discrepancies between Worklist, Lab, Reports, or
    Context.

7.  All visual components are consistent, clear, and operator-focused.

8.  Performance remains responsive under full load.

9.  No UI-side price or risk derivation exists anywhere.

10. The UI provides a polished, professional, production-ready operator
    experience.

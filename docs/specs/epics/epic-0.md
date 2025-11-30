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


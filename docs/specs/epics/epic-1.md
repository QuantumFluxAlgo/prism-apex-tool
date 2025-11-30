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


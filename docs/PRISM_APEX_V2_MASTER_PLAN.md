PRISM APEX – V2 MASTER PLAN (A3 DASHBOARD SURFACES)
===================================================

_Last updated: 2025-12-11_

0\. Purpose & governance
------------------------

This document defines the **Prism Apex V2 Operator Dashboard** (A3 surfaces), the **current implementation status**, and the **delivery roadmap** to a production-ready A3 UX across all operator surfaces.

It is written for a new engineer + AI assistant so they can:

*   See exactly what is **already working (true today)**.
    
*   Understand the **target A3 UX pattern** for every dashboard.
    
*   Know which pieces are **deliberately follow-up work**, not accidents.
    
*   Keep all changes aligned with the **canonical engine / ticket / analytics / strategy model**.
    

### 0.1 Source-of-truth hierarchy

There is a strict hierarchy of truth:

1.  docs/PRISM\_APEX\_SOT.md– **System-of-truth** for:
    
    *   Architecture: ingest → engine → risk → ticketizer → dashboards.
        
    *   Canonical contracts: tickets, session metrics, strategy config, jobs.
        
    *   Engines & jobs: session-metrics, risk-engine-v2, ticketizer, strategy engines.
        
    *   Strategy families: ORR / OSB / VWAP\_FT and their config/DTOs.
        
    *   Deletion/cleanup rules.
        
2.  docs/REPO\_INDEX\_V2.md– **Repo X-ray**:
    
    *   Where each feature/module actually lives.
        
    *   Classification of V2 vs legacy vs dev tooling.
        
    *   Pointers back into SOT (§ numbers, contracts, jobs).
        
3.  docs/PRISM\_APEX\_V2\_MASTER\_PLAN.md (this file)– **Delivery roadmap and status tracker** for:
    
    *   V2 A3 dashboard surfaces.
        
    *   How they consume the SOT-defined engine/strategy/risk stack.
        
    *   Epics, stories, and progress.
        

> **Rule:** If this plan ever conflicts with PRISM\_APEX\_SOT.md, **SOT wins** and this file must be updated.If paths in this file disagree with REPO\_INDEX\_V2.md, **REPO\_INDEX\_V2** is the ground truth for file locations.

### 0.2 Related documents

*   PRISM\_APEX\_SOT.md – system blueprint: ingest → engine → risk → ticketizer → dashboards, with canonical contracts and deletion rules.
    
*   REPO\_INDEX\_V2.md – repo index: directories, modules, and their classification.
    
*   PRISM\_APEX\_ORR\_V3\_DESIGN.md – ORR maths and design intent.
    
*   PRISM\_APEX\_OSB\_DESIGN.md – OSB maths and design intent.
    
*   PRISM\_APEX\_VWAP\_FT\_DESIGN.md – VWAP First Touch maths and design intent.
    
*   docs/ui/PRISM\_APEX\_UI\_DESIGN\_SYSTEM.md – A2/A3 design tokens and UX patterns.
    

1\. Product frame (high level)
------------------------------

Prism Apex is an **operator-assisted trading and risk platform**.

*   It is **not** an auto-trader.
    
*   The dashboard is a **read-only + ticket surface** over:
    
    *   **Ingest:** Yahoo 1m bars and other feeds.
        
    *   **Engine:** session metrics, strategy orchestration, guardrails.
        
    *   **Strategies:** opening-range family (ORR / OSB) and VWAP First Touch (VWAP\_FT) as defined in their design docs.
        
    *   **Risk:** risk-engine-v2 guardrails and guards.
        
    *   **Tickets:** canonical ticket model (ORR / OSB / VWAP\_FT / internal strategies).
        
    *   **Analytics:** canonical analytics tickets and PnL views.
        

### 1.1 Non-negotiables

*   The dashboard **does not place trades**.
    
*   Output is **tickets + analytics + telemetry** for a human operator.
    
*   Safety > cleverness – every surface exists to help an operator make a clear **yes/no** risk decision.
    
*   All dashboard work must respect:
    
    *   Canonical models in @prism-apex/shared.
        
    *   API contracts in apps/api as described in PRISM\_APEX\_SOT.md.
        

2\. Architecture snapshot (UI side)
-----------------------------------

This section describes the **UI topology** and the **canonical building blocks** the V2 dashboard must use.

### 2.1 Key dashboard pages

All live dashboard pages are under:

*   apps/dashboard/src/pages
    
*   apps/dashboard/src/layouts/ExecutionShell.tsx
    

**Canonical V2 surfaces:**

*   WorklistV2.tsx – V2 operator cockpit (A3 worklist surface).
    
*   Tickets.tsx – canonical ticket history.
    
*   MarketData.tsx – session / markets context cockpit (A3 shell).
    
*   Analytics.tsx – analytics & PnL over canonical analytics tickets.
    
*   StrategyLab.tsx – strategy lab surface, driven by canonical analytics tickets.
    
*   Status.tsx – system status / telemetry.
    
*   Alerts.tsx – alert stream.
    
*   Positions.tsx – positions / exposure snapshot (synthetic now, broker-backed later).
    
*   layouts/ExecutionShell.tsx – global shell (header, env badges, background).
    
*   App.tsx – top-level router and page wiring.
    

**Legacy / non-V2 surfaces** (reference only):

*   Worklist.tsx and Worklist\*.bak\* – V1 Worklist variants.
    
*   Demo/auxiliary surfaces:
    
    *   DemoPnL.tsx
        
    *   Downloads.tsx
        
    *   Placeholder.tsx
        
    *   Reports.tsx
        
    *   StrategyConfig.tsx
        

> **Rule:** Only the **V2 pages listed above** are canonical going forward. Legacy pages are for reference and cleanup only (see EPIC V2.7).

### 2.2 Shared UI primitives (stabilised)

Shared UI primitives live under:

*   apps/dashboard/src/ui
    
*   apps/dashboard/src/components
    

#### Atoms / layout

*   ui/Card.tsxCard, CardHeader, CardBody for A3 surface framing.
    
*   ui/Button.tsxPrimary/secondary button styles.
    
*   ui/Badge.tsxCompact label chips (env, modes, statuses, regimes).
    
*   ui/Kpi.tsxKPI tile (label + value, optional delta).
    
*   ui/Tooltip.tsxHover hints.
    

#### Data surfaces

*   ui/DataTable.tsx – generic typed table abstraction:
    
    *   Props: columns, rows, rowKey, loading, emptyMessage.
        
    *   **Important:** rows must always be an array (empty is fine).
        
*   ui/FiltersBar.tsx – A2/A3-style compact filter strip used on Worklist, Tickets, Analytics, and other cockpit pages.
    

#### Feature components

*   components/WorklistPnLCell.tsx – visual PnL cell using Badge + Tooltip.
    
*   utils/pnlDisplay.ts – PnL formatting logic (unit-tested).
    

**Rules:**

*   These primitives are **canonical** for V2 dashboard work.
    
*   Page-local bespoke CSS blobs are **discouraged** unless there is a strong, documented reason.
    
*   All V2 pages must use the A2/A3 tokens defined in:
    
    *   docs/ui/PRISM\_APEX\_UI\_DESIGN\_SYSTEM.md
        
    *   apps/dashboard/src/index.css
        

### 2.3 API helper layer (dashboard side)

API helpers live under:

*   apps/dashboard/src/lib/apiBase.ts
    
*   apps/dashboard/src/lib/api.ts
    

#### apiBase.ts (canonical HTTP base)

*   Resolves API\_BASE from:
    
    *   VITE\_API\_BASE
        
    *   VITE\_API\_URL
        
    *   VITE\_BACKEND\_BASE
        
*   resolveApiUrl() – handles relative vs absolute URLs safely.
    
*   fetchJson() – tolerant, normalised fetch wrapper:
    
    *   Centralised error handling.
        
    *   Normalised JSON/text parsing.
        
    *   **Single entrypoint** for HTTP on the dashboard.
        

#### api.ts (canonical dashboard API helpers)

*   fetchTickets(...) – canonical ticket history (/api/tickets).
    
*   buildCanonicalTicketFromRow(...) – maps TicketRow -> CanonicalTicket.
    
*   fetchWorklistCanonicalTickets(...) – constrained worklist feed wrapper (/api/worklist).
    
*   fetchAnalyticsCanonicalTickets(...) – canonical analytics ticket feed.
    
*   fetchSessionMetrics(...) / fetchSessionMetricsBatch(...) – session metrics helpers for Worklist, Analytics, and (future) Markets.
    
*   makeSessionMetricsKey(symbol, sessionDateUtc) – stable keying for metrics maps.
    

> **Rule:** These helpers are the **only allowed HTTP surface** for V2 dashboard code. Any new API integration must go through apiBase.ts + api.ts, and must respect contracts defined in PRISM\_APEX\_SOT.md §3.

3\. Engine, risk, and strategy dependencies (non-negotiable)
------------------------------------------------------------

V2 dashboards **must** use the existing engine stack as defined in PRISM\_APEX\_SOT.md. No “shadow engines” or duplicated maths in the browser.

### 3.1 Session metrics

*   **Jobs:** apps/api/src/jobs/session-metrics/\*
    
*   **Contracts:** SessionMetricsDto / CanonicalSessionMetrics (see SOT §2).
    
*   **Purpose:** PnL, drawdown, exposure, volatility-style stats per session.
    
*   **Consumers:** Risk engine, Analytics, Markets, Worklist KPIs.
    

### 3.2 Risk engine V2

*   **Core:** apps/api/src/risk/risk-engine-v2.ts, apps/api/src/risk/guards/\*
    
*   **Inputs:**
    
    *   Strategy engine signals (ORR/OSB/VWAP\_FT).
        
    *   Session metrics (PnL, drawdown, exposure).
        
    *   Account/risk config.
        
*   **Outputs:**
    
    *   Guarded, size-approved actions ready for ticketization.
        
*   **Contracts:** Guard reasons/status must be representable in CanonicalTicket / CanonicalApprovedTicketView.
    

### 3.3 Ticket pipeline

*   **Jobs:** apps/api/src/jobs/ticketizer.ts
    
*   **Services:** apps/api/src/services/tickets/\*
    
    *   engineTicketsOrchestrator.ts
        
    *   engineTicketsStore.ts
        
    *   engineTickets.ts
        
*   **Routes:** apps/api/src/routes/tickets.ts, /api/worklist
    
*   **Contracts:**
    
    *   CanonicalTicket
        
    *   CanonicalApprovedTicketView
        
    *   CanonicalTicketStatus
        
    *   CanonicalTicketSource
        
*   **Consumers:** Worklist V2, Tickets, Analytics, Positions (synthetic now).
    

### 3.4 Strategy stack (ORR / OSB / VWAP\_FT)

#### Strategy config contracts

*   **DTOs / types:** apps/api/src/dto/strategy-config/types.ts
    
    *   StrategyConfigId, StrategyCode (OSB, ORR, VWAP\_FT, etc.)
        
    *   BaseStrategyConfig (symbol, session, sizing, risk caps, etc.)
        
    *   Strategy-specific DTOs:
        
        *   ORRConfigDto
            
        *   OSBConfigDto
            
        *   VWAPFTConfigDto
            
*   **Config service & routes:**
    
    *   apps/api/src/services/strategy-config/index.ts
        
    *   apps/api/src/routes/strategy-config.ts
        
*   **Config sources:**
    
    *   configs/strategies/\*.json (ORR/OSB/VWAP\_FT runtime configs)
        

These DTOs and JSON configs are the **canonical source** for what each strategy’s configuration looks like.

#### Opening Range family – ORR / OSB

*   **Design docs:**
    
    *   PRISM\_APEX\_ORR\_V3\_DESIGN.md
        
    *   PRISM\_APEX\_OSB\_DESIGN.md
        
*   **Engine implementations:**
    
    *   apps/api/src/strategy/orr/orr-v3.ts (+ tests)
        
    *   apps/api/src/strategy/osb/osb.ts (+ tests)
        
*   **Strategy engine integration:**
    
    *   apps/api/src/services/strategy-engine/index.ts
        
    *   apps/api/src/services/strategy-engine/orr.ts
        
    *   apps/api/src/services/strategy-engine/osb.ts
        
*   **Config DTO & validation:**
    
    *   apps/api/src/dto/strategy-config/orr.ts
        
    *   apps/api/src/dto/strategy-config/osb.ts
        
    *   apps/api/src/services/strategy-config/validators/orr.ts
        
    *   apps/api/src/services/strategy-config/validators/osb.ts
        
*   **JSON configs:**
    
    *   configs/strategies/opening-session-breakout.json
        
    *   configs/strategies/opening-session-breakout.example.json
        
*   **Signals & indicators (packages):**
    
    *   packages/signals/src/osb.ts
        
    *   packages/strategies/src/osbBreakout.ts (+ tests)
        
    *   apps/api/src/lib/orrGate.ts
        
    *   Operator-risk wiring in API + dashboard.
        

#### VWAP First Touch (VWAP\_FT)

*   **Design doc:**
    
    *   PRISM\_APEX\_VWAP\_FT\_DESIGN.md
        
*   **Engine implementation:**
    
    *   apps/api/src/strategy/vwap-ft/vwap-ft.ts (+ tests)
        
*   **Strategy engine integration:**
    
    *   apps/api/src/services/strategy-engine/vwapft.ts
        
    *   Wiring in apps/api/src/services/strategy-engine/index.ts
        
*   **Config DTO & validation:**
    
    *   apps/api/src/dto/strategy-config/vwapft.ts
        
    *   apps/api/src/services/strategy-config/validators/vwapft.ts
        
*   **JSON configs:**
    
    *   configs/strategies/vwap-first-touch.json
        
    *   configs/strategies/vwap-first-touch.example.json
        
*   **Indicators & signals:**
    
    *   packages/indicators/src/vwap.ts (+ tests)
        
    *   packages/data-yahoo/src/vwap.ts (+ tests)
        
    *   packages/signals/src/vwapFT.ts
        
    *   packages/strategies/src/vwapFirstTouch.ts (+ tests)
        

> **Rule:** V2 must **consume** these strategies via the SOT-defined engine + risk + ticketization path. No new strategy code should live in the dashboard.

### 3.5 Ingest & replay

*   Yahoo bars + indicators:
    
    *   packages/data-yahoo/\*
        
    *   packages/indicators/\*
        
*   Strategy layer:
    
    *   packages/strategies/\*
        
    *   packages/signals/\*
        
*   Engine replay / backfill CLIs:
    
    *   Tools referenced in PRISM\_APEX\_SOT.md §4 (engine replay, backfill, etc.)
        

4\. Current implementation & progress tracking
----------------------------------------------

This section captures the **true state** of the V2 dashboard on the active branch and provides a **lightweight progress view** tied to the epics in §5.

### 4.1 Dashboard test suite

*   **Vitest (dashboard suite):**
    
    *   **11/11 test files, 28/28 tests passing.**
        

Coverage includes:

*   Page-level tests:
    
    *   Alerts
        
    *   Analytics
        
    *   App
        
    *   MarketData
        
    *   Positions
        
    *   Status
        
    *   StrategyLab
        
    *   Tickets
        
*   Component / utility tests:
    
    *   WorklistPnLCell
        
    *   WorklistPnLColumns
        
    *   pnlDisplay
        

**Status:** ✅ Green**Dependency:** EPIC V2.6 (keep green as behaviour evolves).

### 4.2 Worklist / WorklistV2

**Location**

*   apps/dashboard/src/pages/WorklistV2.tsx
    
*   apps/dashboard/src/hooks/useWorklistTickets.ts
    
*   apps/dashboard/src/lib/worklistMock.ts
    

**Current (TRUE)**

*   WorklistV2.tsx is the **canonical V2 operator cockpit**.
    
*   Uses useWorklistTickets over /api/worklist with canonical-shape mock fallback.
    
*   Layout: A3 header, filters, KPIs, main table, details panel.
    
*   PnL columns wired via WorklistPnLCell + pnlDisplay.
    
*   Tests for PnL cells/columns are green.
    

**Progress checklist**

*   A3 layout shell implemented.
    
*   Hook to /api/worklist with tolerant parsing and canonical mock fallback.
    
*   Filters delegated to API where appropriate (currently mostly client-side).
    
*   Strategy-specific narratives for ORR/OSB/VWAP\_FT in detail panel.
    
*   Full visual QA vs A2 mocks.
    

**Linked epics:**

*   EPIC V2.1 – Worklist V2 A3 Cockpit
    
*   EPIC V2.5 – UX, consistency and tokens
    

### 4.3 Tickets

**Location**

*   apps/dashboard/src/pages/Tickets.tsx
    
*   apps/dashboard/src/lib/api.ts
    

**Current (TRUE)**

*   Tickets is an A3-style **ticket history / audit surface**, backed by /api/tickets.
    
*   Uses fetchTickets(...) + buildCanonicalTicketFromRow(...).
    
*   A3 header, filters, KPIs, table, detail panel.
    
*   Tests cover loading, happy-path, empty, and error states.
    

**Progress checklist**

*   Tickets A3 surface wired to /api/tickets.
    
*   Canonical ticket mapping via buildCanonicalTicketFromRow(...).
    
*   Advanced scopes/time windows (session/week/month).
    
*   Ticket error codes / guardrail reasons surfaced.
    
*   Stronger integration paths to Analytics (clickthrough/drilldown).
    

**Linked epics:**

*   EPIC V2.2 – Tickets & Markets
    
*   EPIC V2.3 – Analytics & Strategy Lab
    

### 4.4 Analytics

**Location**

*   apps/dashboard/src/pages/Analytics.tsx
    
*   apps/dashboard/src/lib/api.ts
    

**Current (TRUE)**

*   Analytics is an **A3 analytics cockpit** over canonical analytics tickets.
    
*   Uses:
    
    *   fetchAnalyticsCanonicalTickets(...)
        
    *   fetchSessionMetricsBatch(...) + makeSessionMetricsKey(...)
        
*   Time windows, filters, summary KPIs, row-card layout, detail panel all present.
    
*   Tests exercise shell and helper wiring.
    

**Progress checklist**

*   Canonical analytics tickets wired in.
    
*   Session metrics overlay for context.
    
*   Regime/session pivots (symbol, strategy, volatility regime, session regime).
    
*   R-distribution and expectancy charts.
    
*   Deep cross-link into Worklist/Tickets.
    

**Linked epics:**

*   EPIC V2.3 – Analytics & Strategy Lab
    

### 4.5 Markets (Session / Market Context)

**Location**

*   apps/dashboard/src/pages/MarketData.tsx
    

**Current (TRUE)**

*   A3 **Session Context** cockpit with structural shell:
    
    *   Header, filters row, overlay toggles, chart shell, detail panel.
        
*   Content is **synthetic**; no live session metrics call yet.
    
*   Tests verify header, filters, shell, and debug copy.
    

**Progress checklist**

*   A3 shell and layout implemented.
    
*   Live session metrics from /api/session-metrics / batch helpers.
    
*   Per-symbol metrics cards (OR/ATR, VWAP slope, trend/regime, news flags).
    
*   Cross-links into Worklist/Tickets for symbol+session.
    

**Linked epics:**

*   EPIC V2.2 – Tickets & Markets
    
*   EPIC V2.3 – Analytics & Strategy Lab
    

### 4.6 Strategy Lab

**Location**

*   apps/dashboard/src/pages/StrategyLab.tsx
    

**Current (TRUE)**

*   Uses canonical analytics helper to drive **Lab KPIs**.
    
*   Strategy preset strip (e.g. ORR / OSB / VWAP\_FT), lab vs live mode toggle.
    
*   Tests validate basic behaviour.
    

**Progress checklist**

*   Base Lab shell and KPIs using analytics tickets.
    
*   Per-preset table of lab tickets.
    
*   “Config snapshot” panel aligned with strategy config DTOs and JSON configs.
    
*   Lab vs live comparison view.
    

**Linked epics:**

*   EPIC V2.3 – Analytics & Strategy Lab
    

### 4.7 Status

**Location**

*   apps/dashboard/src/pages/Status.tsx
    

**Current (TRUE)**

*   A3 **System Status** cockpit:
    
    *   KPIs for healthy/degraded/down.
        
    *   Table of components and status.
        
*   Currently built on synthetic but realistic status data.
    
*   Tests validate key copy and KPIs.
    

**Progress checklist**

*   A3 Status cockpit shell.
    
*   Wire to /api/status, /api/system.jobs, /api/system.telemetry.
    
*   Clear mapping of jobs, queues, external APIs, infra health.
    
*   Operator guidance copy for degradation/failure modes.
    

**Linked epics:**

*   EPIC V2.4 – System, Alerts, Positions
    

### 4.8 Alerts

**Location**

*   apps/dashboard/src/pages/Alerts.tsx
    

**Current (TRUE)**

*   A3 **Alerts cockpit** with synthetic-but-realistic feed.
    
*   Severity, state, source model; KPI strip; filters; table.
    
*   Tests validate structure and basic behaviour.
    

**Progress checklist**

*   A3 Alerts cockpit shell and filters.
    
*   Wire to canonical alerts feed /api/system.alerts.
    
*   Align severity/state model with risk engine and telemetry.
    
*   Session/account-aware filtering.
    

**Linked epics:**

*   EPIC V2.4 – System, Alerts, Positions
    

### 4.9 Positions

**Location**

*   apps/dashboard/src/pages/Positions.tsx
    

**Current (TRUE)**

*   A3 **Positions** surface with synthetic placeholder.
    
*   Loading card + KPIs + table with placeholder row.
    
*   Tests assert presence of Loading… and “Active positions” copy.
    

**Progress checklist**

*   Positions A3 shell with synthetic narrative.
    
*   Synthetic positions from ticket history (aggregate open tickets).
    
*   Broker-backed positions post-integration (Tradovate and others).
    
*   Detail panel for exposure, session context, guardrails.
    

**Linked epics:**

*   EPIC V2.4 – System, Alerts, Positions
    
*   Future integration epics (broker / Tradovate)
    

5\. Epics and stories (Option C approach)
-----------------------------------------

We are explicitly following **Option C**:

> Ship **minimal but real** surfaces now, then iterate into richer features.

Anything marked \[FOLLOW-UP\] is _intentionally deferred work_, not a gap.

For each epic we track coarse status:

*   **Status values:** NOT STARTED, IN PROGRESS, DONE (BASELINE)
    
*   Use the checklists under each epic to update progress as work lands.
    

### EPIC V2.1 – Worklist V2 A3 Cockpit (Primary)

**Goal:** One **serious operator cockpit** that a CEO can look at and understand, fully aligned with SOT §4 (engine → risk → tickets).

**Status:** IN PROGRESS (baseline cockpit implemented; refinement required)

#### Must use

*   /api/worklist backed by:
    
    *   CanonicalTicket / CanonicalApprovedTicketView.
        
    *   Ticket pipeline described in PRISM\_APEX\_SOT.md §4.
        
*   Worklist KPIs derived from SessionMetricsDto where applicable.
    
*   Strategy metadata aligned with strategy-config DTOs for ORR/OSB/VWAP\_FT.
    

#### Stories

1.  **W1 – A3 layout shell for Worklist V2** ✅– Refine header, filters bar, KPIs, table, and detail panel strictly against A2 Worklist spec and tokens.
    
2.  **W2 – Canonical Worklist table wiring** ✅– Ensure columns are strictly canonical (CanonicalTicket / worklist DTO), with no ad-hoc fields.
    
3.  **W3 – Operator filters (API-aware)** ☐ \[FOLLOW-UP\]– Move filtering semantics into /api/worklist where it belongs; keep client filters as light overlays.
    
4.  **W4 – Strategy-aware detail panel** ☐– Add richer guardrail and narrative explanations per strategy:
    
    *   ORR / OSB (opening range family).
        
    *   VWAP FT (mean-reversion / continuation logic).
        
5.  **W5 – Visual QA vs A2 mocks** ☐– Iterate until mocks and live surface are recognisably the same product (spacing, typography, chips, table headers).
    

### EPIC V2.2 – Tickets & Markets Surfacing

**Goal:** Tickets and Markets use the same A3 structure as Worklist and are backed by canonical feeds and metrics as per SOT §3–4.

**Status:** IN PROGRESS (Tickets baseline done; Markets shell only)

#### Must use

*   Tickets:
    
    *   /api/tickets returning CanonicalApprovedTicketView.
        
    *   Ticket rows generated exclusively via the SOT-defined ticket pipeline.
        
*   Markets:
    
    *   Session metrics from session-metrics jobs (SessionMetricsDto).
        
    *   OR/ATR/VWAP/trend/regime definitions taken from SOT, not redefined in the dashboard.
        

#### Stories

1.  **T1 – Tickets A3 layout + wiring** ✅– Tickets page uses shared A3 layout and /api/tickets via fetchTickets(...).
    
2.  **T2 – Advanced ticket scopes & windows** ☐ \[FOLLOW-UP\]– Time windows (session/week/month), scopes (live, archive, lab), aligned with engine session identifiers.
    
3.  **M1 – Markets cockpit shell** ✅– A3 Session Context shell with filters, overlay toggles, shell, and detail panel.
    
4.  **M2 – Markets metrics wiring** ☐– Wire fetchSessionMetricsBatch(...) and metrics routes; symbol set driven by strategy configs (configs/strategies).
    
5.  **M3 – Markets cross-links** ☐– Jump from Markets → Worklist/Tickets filtered by symbol + session.
    

### EPIC V2.3 – Analytics & Strategy Lab (Canonical Analytics Tickets)

**Goal:** Stable Analytics & Strategy Lab surfaces built on **canonical analytics ticket feeds** consistent with SOT §2–5.

**Status:** IN PROGRESS (Analytics baseline done; Lab baseline done)

#### Must use

*   Analytics:
    
    *   fetchAnalyticsCanonicalTickets(...).
        
    *   fetchSessionMetricsBatch(...) for context overlays.
        
*   Strategy Lab:
    
    *   Strategy config DTOs + JSON configs for ORR/OSB/VWAP\_FT.
        
    *   Analytics tickets shaped exactly as per SOT.
        

#### Stories

1.  **A1 – Analytics baseline cockpit** ✅– Current implementation: filters, KPIs, row-cards, detail panel.
    
2.  **A2 – Regime/session pivots** ☐– Pivots and aggregations by symbol, strategy, volatility regime, session regime.
    
3.  **A3 – Visualisations** ☐ \[FOLLOW-UP\]– R-distribution, expectancy over time, and session metrics trend charts (with stable test contract).
    
4.  **SL1 – Strategy Lab shell + KPIs** ✅– Presets, mode toggle, Lab KPIs using analytics tickets.
    
5.  **SL2 – Config snapshot & lab table** ☐– For each strategy preset:
    
    *   Table of lab tickets.
        
    *   “Config snapshot” panel derived from strategy DTOs and JSON configs.
        
6.  **SL3 – Lab vs live comparison** ☐– Comparison view between lab and live performance for the same strategy + regime.
    

### EPIC V2.4 – System, Alerts, Positions

**Goal:** Status, Alerts, and Positions are **operator-useful at a glance**, wired into SOT-defined jobs, system status, and eventual broker positions.

**Status:** IN PROGRESS (all shells implemented; wiring outstanding)

#### Must use

*   System:
    
    *   /api/status, /api/system.jobs, /api/system.telemetry once implemented.
        
*   Alerts:
    
    *   /api/system.alerts, with severity/state aligned with risk engine and system telemetry.
        
*   Positions:
    
    *   Short term: synthetic positions from CanonicalTicket history.
        
    *   Medium term: broker-backed positions (e.g. Tradovate) reconciled against engine.
        

#### Stories

1.  **S1 – Status cockpit shell** ✅– Current A3 system status page.
    
2.  **S2 – Status live wiring** ☐– Wire to real status/jobs/telemetry endpoints as per SOT.
    
3.  **AL1 – Alerts cockpit shell** ✅– Current synthetic alerts with severity/state filters.
    
4.  **AL2 – Canonical alerts feed** ☐– Wire to /api/system.alerts and align severity model with SOT.
    
5.  **P1 – Synthetic positions from tickets** ☐– Aggregate open/non-completed tickets into synthetic positions surface.
    
6.  **P2 – Broker-backed positions** ☐ \[FOLLOW-UP\]– Integrate real broker positions and reconcile against tickets and risk engine rules.
    

### EPIC V2.5 – UX, consistency, and tokens

**Goal:** Every page feels like **one coherent product** that matches the A2/A3 design system.

**Status:** IN PROGRESS

#### Stories

1.  **U1 – Token audit** ☐– Eliminate stray hex colours; normalise typography/spacing using PRISM\_APEX\_UI\_DESIGN\_SYSTEM.md tokens.
    
2.  **U2 – A3 pattern enforcement** ☐– Enforce shell → header → filters → KPIs → table → details pattern across all main surfaces.
    
3.  **U3 – Small viewport sanity** ☐ \[FOLLOW-UP\]– Graceful degradation on smaller viewports; horizontal scroll acceptable but broken layouts are not.
    

### EPIC V2.6 – Testing & observability

**Goal:** Keep the suite green while evolving the dashboard and make it observable.

**Status:** IN PROGRESS (tests green; observability pending)

#### Stories

1.  **TST1 – Maintain green dashboard tests** ✅– Any refactor keeps tests passing or updates them alongside behaviour changes.
    
2.  **TST2 – Incremental coverage** ☐– New behaviours (filters, error states, metrics variants, charts) gain tests.
    
3.  **OBS1 – Event hooks** ☐ \[FOLLOW-UP\]– Instrument key user actions (filter changes, drilldowns) for later observability.
    

### EPIC V2.7 – Cleanup & dead code removal

**Goal:** Reduce confusion and surface area by removing or archiving legacy surfaces and mocks.

**Status:** IN PROGRESS (first cleanup pass done)

#### Stories

1.  **CLN1 – Legacy Worklist** ☐ \[FOLLOW-UP\]– Archive/remove V1 Worklist variants once V2 is fully adopted and covered by tests.
    
2.  **CLN2 – Mock & stub rationalisation** ☐– Keep only canonical-shape mocks still in use; delete or quarantine dead ones per PRISM\_APEX\_SOT.md deletion rules.
    
3.  **CLN3 – Docs alignment** ☐– Keep this plan, PRISM\_APEX\_SOT.md, and REPO\_INDEX\_V2.md in lockstep with actual code and models.
    

6\. Quality gates (“dashboard ready”)
-------------------------------------

Before calling V2 “dashboard ready”:

1.  **Tests**
    
    *   Dashboard suite green (currently true).
        
    *   Additional coverage for new features / charts.
        
2.  **Worklist V2 A3 cockpit**
    
    *   End-to-end path via /api/worklist or canonical mock from engine pipeline.
        
    *   Visual parity with A2 mocks.
        
    *   Strategy-aware narratives (ORR/OSB/VWAP\_FT).
        
3.  **Tickets, Markets, Analytics, Strategy Lab, Status, Alerts, Positions**
    
    *   All use coherent A3 structure (shell → header → filters → KPIs → table → details).
        
    *   No broken imports or runtime errors under normal engine conditions.
        
    *   Live or canonical-mock data paths wired through the SOT-defined stack.
        
4.  **Docs**
    
    *   PRISM\_APEX\_SOT.md describes architecture, contracts, strategy families, and deletion rules.
        
    *   REPO\_INDEX\_V2.md accurately maps repo to features.
        
    *   This Master Plan accurately reflects current status and next work.
        

7\. V3 direction (beyond this plan)
-----------------------------------

V2 is:

> **Make the existing SOT-defined engine stack fully productionised and operator-usable** for ORR/OSB/VWAP\_FT.

V3 builds **on top of the same SOT**, not around it:

*   Additional strategies and strategy families.
    
*   Portfolio-level and multi-account risk views.
    
*   Deeper analytics:
    
    *   Factor attribution.
        
    *   Scenario analysis.
        
    *   Engine replay tools integrated in the UI.
        
*   Operator workflows:
    
    *   Playbooks and overrides.
        
    *   Multi-ticket actions.
        
    *   Runbook-style guidance.
        

> **Rule:** No V3 work should fork or bypass the canonical engine/risk/ticket stack. V3 extends the SOT; it does not replace it.

8\. Ways of working (for future engineers + AI assistants)
----------------------------------------------------------

Principles:

*   **Do not start from scratch.**
    
    *   Inspect existing pages, UI atoms, tests, and SOT first.
        
*   **Prefer refactor over rewrite.**
    
    *   If tests already pass, evolve behaviour/layout incrementally and update tests in lockstep.
        
*   **Respect canonical models (SOT-first).**
    
    *   PRISM\_APEX\_SOT.md is the system-of-truth.
        
    *   REPO\_INDEX\_V2.md is the map.
        
    *   This Master Plan sequences work and tracks progress.
        
*   **Keep tests and docs in sync.**
    
    *   Any non-trivial UI change:
        
        *   Must update or add tests that codify intended behaviour.
            
        *   Must update this plan and, if relevant, SOT + REPO\_INDEX.
            
*   **Use engine & strategy stack, do not duplicate it.**
    
    *   All PnL/metrics/strategy logic must ultimately resolve back to:
        
        *   Session-metrics jobs.
            
        *   Risk-engine-v2.
            
        *   Ticketizer + canonical ticket model.
            
        *   Strategy engines and configs as described in SOT and strategy design docs.

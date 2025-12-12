UPGRADE\_DASHBOARD.md
=====================

Delivery process (tight + epic-scoped)
--------------------------------------

1.  **Codex Terminal reads ONLY the current Epic section being delivered** (not the whole document) and performs a **repo-first check** to identify existing functionality (hooks, services, DTOs, routes, scoring, filters, UI components) that must be reused.
    
2.  Codex Terminal produces an **Epic OUTCOME REPORT**: what exists, what’s missing, what’s mismatched (page ↔ API), and what decisions are required.
    
3.  Where decisions are needed, Codex Terminal asks **targeted questions**. We decide using the **expert panel** (trading systems + market structure + execution + data + risk + quant + monorepo + SRE).
    
4.  Codex Terminal implements all stories under the Epic **in one delivery batch**, keeping changes minimal and reversible.
    
5.  Codex Terminal updates this document in-repo: mark stories complete, record any repo-evidence corrections, and log deletions/renames.
    
6.  After all Epics are done (except the final cleanup epic), we run the **V2 docker compose** end-to-end smoke checks. Then we do the final epic.
    

Repo-evidence baseline for this plan (from Epic-1 recon output)
---------------------------------------------------------------

*   Dashboard pages present: Alerts, Analytics, MarketData, Positions, Status, StrategyLab, Tickets, WorklistV2 (apps/dashboard/src/pages/\*.tsx)
    
*   API route modules present: apps/api/src/routes/\* including worklist.ts, tickets.ts, strategy-config.ts, strategies.config.ts, session-metrics.ts, system.\*.ts, telemetry.ts, operator-risk.ts, operatorSizing.ts, reports.dashboard.ts, analytics.ts
    
*   Contract drift detected:
    
    *   Dashboard references endpoints like /api/system, /api/markets, and several malformed paths ending with . or trailing /.
        
    *   API exposes granular endpoints such as /api/system/alerts, /api/system/jobs, /api/system/telemetry, /api/symbols/v2, /api/strategies/config, /api/session-metrics, /api/analytics/summary, /api/telemetry/\*, etc.
        

**Expert panel decision:** treat the “missing endpoints” list as **mostly client-side contract bugs** (bad endpoint strings + use of non-existent aggregators like /api/system) rather than server gaps. Fixing client contracts first reduces blast radius and avoids inventing redundant server endpoints.

EPIC: A3 Dashboard Contract Hardening (Client ↔ API Truth)
==========================================================

Problem statement
-----------------

*   Dashboard pages are not consistently wired to the **actual API surface**; some call non-existent endpoints (e.g., /api/system, /api/markets) and/or malformed URLs (trailing . or inconsistent slashes).
    
*   Operators see inconsistent or misleading data, which directly harms time-to-action and decision quality.
    
*   Engineering is slowed by hidden coupling and “stringly-typed” endpoint usage.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Data-to-glass correctness** (pages render without fallback/mocked/empty states when API is healthy).
    
*   Secondary KPIs:
    
    *   **Time to first meaningful render** per page (P50/P95)
        
    *   **Client contract error rate** (4xx/5xx caused by wrong paths)
        
*   Baseline: UNVERIFIED until instrumentation added.
    
*   Target: ≥ 99% successful page data loads in steady-state; zero calls to non-existent endpoints.
    
*   Measurement approach: client telemetry + API access logs by route + synthetic e2e smoke.
    

Scope
-----

### In scope

*   Replace ad-hoc endpoint strings with canonical client functions in apps/dashboard/src/lib/\*
    
*   Normalize endpoint usage across all pages to match API routes already present
    
*   Remove/stop calling non-existent aggregators (e.g., /api/system) and switch to /api/system/\* endpoints
    
*   Ensure Worklist scoring + filters reuse existing backend scoring/filtering surfaces (no reinvention)
    

### Out of scope

*   Creating new “umbrella” server endpoints like /api/system unless repo evidence proves a need
    
*   Refactoring strategy/risk math logic (only wiring/contract fixes here)
    

Assumptions
-----------

*   API routes under /api/\* are the canonical operator-facing surface.
    
*   Dashboard should not depend on legacy top-level routes unless explicitly documented.
    

Constraints
-----------

*   Security/compliance: no auth changes in this epic unless required for endpoint access parity.
    
*   Performance: avoid increasing request fan-out without caching/coalescing.
    
*   Availability/SLO: changes must fail-safe with clear operator messaging.
    
*   Backward compatibility: preserve existing endpoints; fix client first.
    
*   Supported platforms/versions: V2 docker compose local + server profiles.
    

Dependencies
------------

*   Upstream: apps/api route truth; existing DTOs under apps/api/src/routes/dto/\* and shared contracts in packages/shared
    
*   Downstream: all dashboard pages + hooks relying on lib/api.ts wrappers
    

Risks & mitigations
-------------------

*   Risk: switching endpoints increases request count and hurts UX.
    
    *   Impact: medium
        
    *   Likelihood: medium
        
    *   Mitigation: introduce request coalescing per page and cache stable resources (symbols/config) in hooks.
        
*   Risk: hidden reliance on legacy endpoints breaks unknown flows.
    
    *   Impact: medium
        
    *   Likelihood: low
        
    *   Mitigation: e2e smoke tests per page before merge.
        

UX / API contract (if applicable)
---------------------------------

*   UX notes / wireframes link: UNVERIFIED
    
*   API endpoints/events (existing targets):
    
    *   /api/system/alerts, /api/system/jobs, /api/system/telemetry
        
    *   /api/symbols/v2, /api/strategies/config, /api/strategy-config/:strategy
        
    *   /api/session-metrics, /api/analytics/summary
        
    *   /api/telemetry/account, /api/telemetry/positions, /api/telemetry/fills
        
    *   /api/worklist, /api/tickets, /api/tickets/:id/complete, /api/tickets/:ticketId/operator-action
        
*   Data model changes: none expected (contract-only)
    

Delivery plan
-------------

### Milestones

1.  Build canonical dashboard API client map (functions per endpoint) and remove endpoint string drift
    
2.  Convert each page to use canonical client functions (one-by-one) with minimal layout change
    
3.  Add basic telemetry/console-safe diagnostics for contract errors
    

### Story breakdown

*   ST-001: Canonicalize dashboard API client functions (no new endpoints)
    
*   ST-002: Remove malformed endpoint strings (trailing . / bad slashes) across dashboard
    
*   ST-003: Replace /api/system usage with /api/system/{alerts,jobs,telemetry}
    
*   ST-004: Replace /api/markets usage with existing market/symbol/session endpoints (repo truth)
    
*   ST-005: Add epic-scoped page load diagnostics (client-side)
    

Acceptance criteria (Epic-level)
--------------------------------

*   No dashboard page calls endpoints that do not exist in apps/api/src/routes
    
*   All eight pages load meaningful data when API is healthy (no silent empty states)
    
*   E2E smoke covers page navigation + key data widgets
    
*   No new server endpoints added unless explicitly justified by repo evidence
    

Rollout
-------

*   Feature flag: optional (page-by-page route switch), otherwise incremental commits.
    
*   Ramp plan: merge behind branch; validate in V2 compose; then push.
    
*   Rollback trigger thresholds: spike in 404/500 per page; broken Worklist load.
    
*   Comms plan: internal only.
    

Test strategy
-------------

*   Unit: client API function tests (light)
    
*   Integration: API route contract tests (existing suite)
    
*   E2E: dashboard smoke (existing Playwright)
    
*   Performance: basic P95 page load timing
    
*   Security: none changed
    

Definition of Done
------------------

*   Code merged + reviewed
    
*   Tests passing
    
*   This doc updated with completed stories + final endpoint map notes
    
*   V2 compose smoke passes
    

EPIC: Worklist V2 — Market-Leading Operator Cockpit (Scoring + Actions + Risk)
==============================================================================

Problem statement
-----------------

*   Worklist is the primary operator surface; if scoring, ranking, and action clarity are off, operator throughput and profitability degrade.
    
*   Current UI is not consistently A3 inside ExecutionShell, and contract usage shows drift (/api/worklist. / mixed ticket endpoints).
    
*   You explicitly confirmed a **score calculator exists** and must be used (not ignored).
    

Outcome (measurable)
--------------------

*   Primary KPI: **Time to action** (ticket appears → operator completes action).
    
*   Secondary KPIs:
    
    *   **False-positive reduction** (operator rejects/flags vs actioned)
        
    *   **Operator throughput** (actioned tickets / hour, per session)
        
*   Baseline: UNVERIFIED until instrumented.
    
*   Target: materially improved vs baseline; measured over multiple sessions.
    
*   Measurement approach: operator-action logs + ticket lifecycle telemetry.
    

Scope
-----

### In scope

*   Ensure Worklist ranking uses existing score/quality logic (backend or shared package) with transparent explanations
    
*   A3 cockpit layout: filters + KPI strip + ranked table + details panel (consistent components)
    
*   Tight action affordances: copy OCO, complete ticket, operator action logging
    
*   Risk strip integration using existing operator-risk endpoints
    

### Out of scope

*   New strategy logic
    
*   Auto-execution / auto-trading
    

Assumptions
-----------

*   Worklist should source canonical tickets from /api/worklist and ticket details/actions from /api/tickets\*.
    
*   Scoring already exists in repo (must be surfaced, not rebuilt).
    

Constraints
-----------

*   Security/compliance: operator actions must be auditable.
    
*   Performance: ranking/scoring must not freeze UI.
    
*   Availability/SLO: degrade gracefully if scoring metadata missing.
    
*   Backward compatibility: preserve ticket DTO shape.
    

Dependencies
------------

*   Upstream: ticket scoring / quality filters; operator risk; tickets store/actions
    
*   Downstream: operator workflow and downstream “Tickets” page consistency
    

Risks & mitigations
-------------------

*   Risk: score explanation misleads operators.
    
    *   Impact: high
        
    *   Likelihood: medium
        
    *   Mitigation: show score components + guardrail reasons using existing reason enums/fields.
        
*   Risk: UI polish distracts from functional clarity.
    
    *   Impact: medium
        
    *   Likelihood: medium
        
    *   Mitigation: cockpit-first hierarchy: ranking, risk, clarity before visuals.
        

UX / API contract (if applicable)
---------------------------------

*   API endpoints:
    
    *   /api/worklist
        
    *   /api/tickets
        
    *   /api/tickets/:ticketId/operator-action
        
    *   /api/tickets/:id/complete
        
    *   /api/operator-risk/daily, /api/operator-risk/audit
        
    *   /api/operator-sizing (if used for previews)
        
*   Data model changes: only if score breakdown is missing from ticket views (repo evidence required)
    

Delivery plan
-------------

### Milestones

1.  Confirm and reuse scoring function(s) + quality filters driving ranking
    
2.  Align Worklist API usage + detail panel correctness
    
3.  A3 styling pass for Worklist only (no global restyle yet)
    

### Story breakdown

*   ST-101: Wire Worklist ranking to existing ticket score calculator + display score breakdown
    
*   ST-102: Worklist A3 cockpit layout standardization (ExecutionShell-consistent)
    
*   ST-103: Risk strip integration (daily + audit) into Worklist workflow
    
*   ST-104: Operator action UX + audit trail (no new semantics)
    
*   ST-105: Remove endpoint drift (/api/worklist. etc.) and use canonical client wrappers
    

Acceptance criteria (Epic-level)
--------------------------------

*   Ranking uses existing score logic (proven by file reference in implementation notes during delivery)
    
*   Operator can action a ticket and see confirmation + persisted audit
    
*   Layout is fully A3 consistent inside ExecutionShell
    
*   No new scoring algorithm introduced
    

EPIC: Tickets — Lifecycle, History, Quality Filters, Operator Actions
=====================================================================

Problem statement
-----------------

*   Tickets page must be the canonical lifecycle view; current usage appears shallow (only /api/tickets) and likely misses history, quality filters, and action audit.
    
*   Contract drift shows intent to call /tickets/history, /tickets/live etc. but API provides /api/tickets plus operator-action/complete routes.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Operator confidence** proxy = reduced back-and-forth between pages to validate a ticket.
    
*   Secondary KPIs: fewer manual exports; fewer “unknown state” tickets.
    
*   Baseline: UNVERIFIED
    
*   Target: measurable reduction in operator friction.
    

Scope
-----

### In scope

*   Align Tickets page to actual API contract (tickets list + complete + operator action)
    
*   Add quality filter bar using existing filters endpoint/logic
    
*   Present lifecycle states clearly with A3 styling consistent with Worklist
    

### Out of scope

*   Rewriting ticket schema
    
*   Introducing new ticket states unless already modeled
    

Dependencies
------------

*   Upstream: tickets store; ticketQualityFilters route/logic; operator-actions route
    

Delivery plan / Story breakdown
-------------------------------

*   ST-201: Tickets page uses canonical ticket list contract + pagination/filters as supported
    
*   ST-202: Ticket Quality Filters integration (reuse existing endpoint/DTO)
    
*   ST-203: Operator action + completion UX parity with Worklist
    
*   ST-204: A3 styling alignment for Tickets cockpit
    

EPIC: Strategy Lab — Config, Drift/Freeze/Promotion Surfaces (Operator-Safe)
============================================================================

Problem statement
-----------------

*   StrategyLab page detection found no direct endpoints, implying indirection or incomplete wiring.
    
*   API exposes strategy config endpoints (/api/strategies/config, /api/strategy-config/:strategy, history, preview). Dashboard must surface these in a controlled operator UX.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Config change safety** (all changes audited; no silent config mutation).
    
*   Secondary KPI: **Time to validate** a config change (preview/impact visible).
    
*   Baseline/Target: UNVERIFIED until tracked.
    

Scope
-----

### In scope

*   Wire StrategyLab to existing strategy config endpoints
    
*   Ensure operator workflows are guarded (preview before apply; explicit warnings)
    
*   A3 styling + consistent components (same buttons/cards as other pages)
    

### Out of scope

*   New strategy logic
    
*   Config editor rewrite if existing components already exist
    

Delivery plan / Story breakdown
-------------------------------

*   ST-301: Strategy config fetch + render using existing client wrappers
    
*   ST-302: Strategy config history + audit visibility (if API supports)
    
*   ST-303: Strategy-engine preview integration (read-only preview)
    
*   ST-304: A3 cockpit layout for StrategyLab (config + warnings + preview)
    

EPIC: Market Data — Symbols, Sessions, Ingest Health, Coverage
==============================================================

Problem statement
-----------------

*   MarketData page references /api/markets but API surface indicates /market/sessions, /market/symbols, and /api/symbols/v2 exist.
    
*   Operators need a reliable “data truth” cockpit: session status, symbol coverage, ingest freshness, and gaps.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Data freshness / gap rate** (bars on time; missing bars visible fast).
    
*   Secondary KPI: **Mean time to detect ingest break**.
    
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Replace /api/markets usage with existing routes and DTOs
    
*   Add explicit freshness indicators and symbol coverage widgets
    
*   A3 styling consistent with Worklist/Tickets
    

### Out of scope

*   Re-architecting ingest pipeline
    
*   New data vendor integration
    

Delivery plan / Story breakdown
-------------------------------

*   ST-401: MarketData contract alignment to /api/symbols/v2 + session endpoints
    
*   ST-402: Yahoo/ingest health widgets wired to existing health endpoints
    
*   ST-403: Coverage + gap indicators (reuse any existing computations if present)
    
*   ST-404: A3 cockpit layout for MarketData
    

EPIC: Analytics — Session Metrics, Profitability Signals, Operator KPIs
=======================================================================

Problem statement
-----------------

*   Analytics page currently detects /api/tickets. (malformed) and appears under-wired vs API (/api/analytics/summary, /api/session-metrics).
    
*   For a prop platform, analytics must be operator-actionable: session context, risk regime, ticket yield, false positives.
    

Outcome (measurable)
--------------------

*   Primary KPI: **False-positive reduction** (actioned vs rejected ratio improvements).
    
*   Secondary KPIs:
    
    *   **Ticket yield** (tickets that become high-quality opportunities)
        
    *   **Latency from bar close → ticket surfaced** (data-to-decision)
        
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Wire analytics to session-metrics + analytics summary endpoints
    
*   Provide session-level operator KPIs in an A3 layout
    
*   No new math unless missing and required (repo evidence)
    

### Out of scope

*   New PnL model rewrite
    
*   Backtesting engine expansion
    

Delivery plan / Story breakdown
-------------------------------

*   ST-501: Analytics contract alignment to /api/analytics/summary + /api/session-metrics
    
*   ST-502: Session KPI strip (risk regime, volatility, quality distribution)
    
*   ST-503: Ticket yield + false positive widgets (reuse existing metrics if present)
    
*   ST-504: A3 cockpit layout for Analytics
    

EPIC: System — Status, Jobs, Telemetry, Alerts (SRE-Grade Operator View)
========================================================================

Problem statement
-----------------

*   Alerts/Status pages call /api/system but API provides /api/system/alerts, /api/system/jobs, /api/system/telemetry.
    
*   Operator and SRE need a single truth: what’s running, lag, failures, job health, alert acknowledgements.
    

Outcome (measurable)
--------------------

*   Primary KPI: **MTTD** (mean time to detect) pipeline failures.
    
*   Secondary KPI: **MTTR** (mean time to recover) via guided runbooks/actions.
    
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Replace /api/system with explicit system endpoints
    
*   Show job lifecycle + last run + failure reason + safe “run job” controls if already supported
    
*   Alerts panel: ack/peek flows if present
    
*   A3 styling consistent across System pages
    

### Out of scope

*   New observability stack
    
*   Changing job semantics/schedules unless required
    

Delivery plan / Story breakdown
-------------------------------

*   ST-601: Status page contract alignment to /api/status, /api/ops/status, /api/system/telemetry
    
*   ST-602: Jobs cockpit wired to /api/system/jobs (+ run controls only if present/guarded)
    
*   ST-603: Alerts cockpit wired to /api/system/alerts + /alerts/ack|peek if used
    
*   ST-604: A3 cockpit layout for Status + Alerts
    

EPIC: Positions — Account, Fills, Live Risk Posture (Operator-Only)
===================================================================

Problem statement
-----------------

*   Positions page currently references /api/tickets but API exposes telemetry endpoints: /api/telemetry/account, /api/telemetry/positions, /api/telemetry/fills.
    
*   Without correct positions/fills/account state, operators can’t safely action tickets.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Risk posture correctness** (operator sees accurate exposure + daily loss posture).
    
*   Secondary KPI: reduction in “surprise exposure” incidents.
    
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Wire Positions page to telemetry endpoints and operator-risk daily posture
    
*   Present exposure, fills, and account health with A3 clarity
    
*   No new execution integration
    

### Out of scope

*   Order placement
    
*   Tradovate client rewrites
    

Delivery plan / Story breakdown
-------------------------------

*   ST-701: Positions contract alignment to /api/telemetry/\* endpoints
    
*   ST-702: Risk posture strip (daily loss, hard stops) reuse existing operator risk endpoints
    
*   ST-703: A3 cockpit layout for Positions
    

EPIC: A3 UI Consistency — Shared Components, Tokens, Page Templates (Non-Functional Polish With Guardrails)
===========================================================================================================

Problem statement
-----------------

*   Pages visually diverge and are not consistently A3 inside ExecutionShell.
    
*   Inconsistency increases operator cognitive load and slows action.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Time-to-action improvement** attributable to UX consistency.
    
*   Secondary KPI: reduced operator misclick/error rate (proxy via action reversals).
    
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Standardize use of existing ui/\* components (Buttons, Cards, DataTable, FiltersBar, KPI)
    
*   Enforce A3 tokens and layout patterns across all pages
    
*   Keep page-specific widgets custom to the data they present
    

### Out of scope

*   Full redesign; “make it pretty” without measurable operator utility
    

Delivery plan / Story breakdown
-------------------------------

*   ST-801: Define “A3 page template contract” inside dashboard (layout + spacing + common header)
    
*   ST-802: Refactor pages to conform to template while preserving page-specific content
    
*   ST-803: Eliminate duplicated styling implementations (prefer shared components)
    

EPIC: FINAL — Repo Cleanup, Deletions, Doc Consolidation, and V2 Compose E2E Validation
=======================================================================================

Problem statement
-----------------

*   After functional alignment, the repo contains legacy/archived surfaces, drifted docs, and dead paths that increase risk and slow delivery.
    
*   Cleanup must happen last to avoid deleting something needed mid-flight.
    

Outcome (measurable)
--------------------

*   Primary KPI: **Lower regression rate** (fewer accidental breakages from dead code coupling).
    
*   Secondary KPI: faster onboarding (fewer conflicting docs).
    
*   Baseline/Target: UNVERIFIED
    

Scope
-----

### In scope

*   Remove or archive unused dashboard pages/components discovered during prior epics
    
*   Remove dead API routes only if proven unused and not required by external callers
    
*   Update docs (and delete docs if needed) to reflect repo truth
    
*   Run full V2 docker compose end-to-end tests + smoke suite
    

### Out of scope

*   Large-scale refactors not required by evidence
    

Delivery plan / Story breakdown
-------------------------------

*   ST-901: Dead-code and dead-route audit with proof (ripgrep + import graph + runtime hits)
    
*   ST-902: Safe deletions + archive strategy (reversible)
    
*   ST-903: Docs alignment and deletions where needed
    
*   ST-904: V2 docker compose E2E validation + rollback instructions verified

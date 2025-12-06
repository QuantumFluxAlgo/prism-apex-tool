PRISM APEX – V2 Dashboard Productionisation Plan
Scope: A2 dashboard surfaces (Worklist V2, Tickets, Markets, Analytics, Strategy Lab, System, Alerts) on top of the canonical ticket + session metrics + audit model.
This is Phase 4–5 on top of the existing engine/ingest/risk work (EPIC 0–10).

1. Context & Assumptions
Backend engine, ingest, session metrics, Strategy Orchestrator, Risk Engine, and canonical ticket/audit model are treated as functionally present from earlier phases (EPIC 0–10).
The canonical interfaces we must respect on the UI side:
CanonicalTicket
CanonicalApprovedTicketView
SessionMetricsDto
Worklist V2 already exists and uses:
CanonicalTicket
getWorklistV2CanonicalTickets() as mock fallback
A2 ExecutionShell, FiltersBar, DataTable, and detail panel patterns
Goal of this plan:
Productionise the V2 dashboard.
Ensure every page uses the canonical model.
Make it deployable via Docker with clear environment profiles.
2. Status Snapshot (High-Level)
Update these checkboxes as work is delivered.

 EPIC V2.1 – Worklist V2 Production Hardening
 EPIC V2.2 – Tickets Page V2 (Audit-Facing)
 EPIC V2.3 – Markets & Analytics UI Integration
 EPIC V2.4 – Strategy Lab V2 UI (Canonical Model)
 EPIC V2.5 – System / Status / Alerts Console
 EPIC V2.6 – A2 UI Polish & Consistency
 EPIC V2.7 – Dockerised Deployment & Environments

Phase 3 (Dec 2025 snapshot)
- Tickets V2 page implemented as canonical A2 surface using fetchTickets + useTicketsHistory.
- Dashboard helper fetchJson hardened to tolerate mock responses (tests now exercise real /api/tickets flow).
- Worklist V2 now consumes canonical tickets via fetchWorklistCanonicalTickets(...) wrapper over /api/tickets; Tickets and Analytics share the same CanonicalTicket mapping from TicketRow.
- Analytics page implemented as canonical A2 surface using fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...); KPIs, PnL-over-time, and regime breakdown share the same CanonicalTicket contract.
- Markets page implemented as canonical session surface using /api/symbols + /api/session-metrics; overlays panel and quality/news cards read from live session metrics payload.

3. EPIC V2.1 — Worklist V2 Production Hardening
Goal
Turn the current Worklist V2 into the production Worklist for canonical, risk-approved tickets (API or mock) with stable filters, columns, and details, aligned to the canonical ticket + session metrics model.

Stories
 V2.1.1 – Canonical Ticket Wiring & Fallback Contract

Introduce useWorklistTickets() hook returning CanonicalTicket[] plus a mode flag (api vs mock).
Primary path: Worklist tickets from /api/tickets (or dedicated /api/worklist) returning rows with canonicalApproved.
Fallback: getWorklistV2CanonicalTickets() when API/DB is unavailable.
Outcome: Worklist runs against real API or mock without code changes.
 V2.1.2 – Filters & Query Mapping

Map filters (symbol, strategy, score, risk bucket, age, text search) to:
Query params the backend understands, and/or
Deterministic client-side filters when backend support is limited.
Ensure no visible filter is a no-op.
Outcome: operator can trust that each filter actually changes the dataset.
 V2.1.3 – Column Set & Cell Design Finalisation

Lock the grid column set to the canonical model:
Symbol, side, entry/target/stop prices, RR, risk $, score, strength, regime/context tags, age/time-left, status.
Absolute prices are primary; tick deltas and tags are secondary data.
Outcome: Worklist grid fully matches the V2 spec and canonical ticket model.
 V2.1.4 – Detail Panel & SessionMetrics Integration

Finalise the right-hand detail panel using SessionMetricsDto:
Risk breakdown.
VWAP/OR/ATR/regime snapshot.
Session flags, notes, and risk decision summary.
No UI-side recalculation of metrics beyond formatting.
Outcome: selecting a row shows a complete execution context built from canonical + session metrics.
 V2.1.5 – Empty/Error/Latency States

Implement explicit A2-styled states for:
Loading.
No tickets.
API errors (with clear copy around mock fallback if applicable).
Outcome: predictable operator experience when backend is slow or failing.
 V2.1.6 – Worklist V1 Decommission / Quarantine

Locate and either delete or quarantine legacy Worklist components under a legacy/ namespace.
Outcome: only Worklist V2 drives the operator workflow; no split-brain.
4. EPIC V2.2 — Tickets Page V2 (Audit-Facing)
Goal
Replace the shallow Tickets.tsx stub with a full V2 Tickets view aligned with canonical ticket/audit data, reusing Worklist primitives.

Stories
 V2.2.1 – Tickets API Contract & Hook

Standardise on fetchTickets(...) + TicketRow / buildCanonicalTicketFromRow in lib/api.ts.
Introduce useTicketsHistory() hook:
Inputs: date range, symbol, strategy, status, reason filters.
Output: canonical tickets plus audit fields (completedBy, notes, risk decision, outcome).
Outcome: reusable way to pull ticket history for UI and analytics.
 V2.2.2 – Tickets FiltersBar Integration

Use FiltersBar for:
Date range.
Symbol.
Strategy.
Status (open, complete, arbitrated, invalidated).
Reason category + text search.
Outcome: Tickets filters feel identical to Worklist/Analytics filters.
 V2.2.3 – Tickets Grid & Detail Layout

Grid columns:
Time, symbol, side, strategy, entry & exit prices, risk $, R multiple, status, reason, account.
Detail panel:
Full audit snapshot (risk decision, session metrics snapshot, notes, operator action).
Outcome: Tickets provides a credible, operator- and audit-friendly view of realised trades.
 V2.2.4 – Worklist/Tickets Cohesion

Ensure any ticket visible in Worklist ends up in Tickets with identical canonical fields.
Enable deep-link from Worklist row → Tickets detail by ticketId.
Outcome: consistent story between “what I saw before executing” and “what audit records”.
 V2.2.5 – Legacy Tickets UI Decommission

Remove the current stub Tickets.tsx implementation that manually calls fetch().
Ensure only the new Tickets V2 is wired in App.tsx.
Outcome: single tickets surface, bound to canonical+audit contracts.
5. EPIC V2.3 — Markets & Analytics UI Integration
Goal
Make Markets and Analytics real A2 views using canonical overlays, audit data, and analytics outputs, with robust mock support.

Stories
 V2.3.1 – Market Overlays Wiring

Align MarketData page with overlay endpoints (symbol + sessionDate → VWAP/ATR/OR/regime series).
Render:
Candles.
VWAP line/bands.
OR high/low.
Regime/ATR overlays.
Outcome: Markets shows a credible session structure view instead of placeholders.
 V2.3.2 – Ticket Markers on Market Chart

Overlay canonical tickets on the market chart:
Entry/stop/target markers.
Colour by side.
Tooltips with RR, risk, context tags.
Outcome: operator can visually see where tickets sit relative to VWAP/OR/ATR.
 V2.3.3 – Analytics Summary Blocks

Add A2 cards on Analytics for:
Daily P&L.
R-multiple stats.
Win rate.
Include by-symbol and by-strategy summarisation.
Outcome: Analytics becomes a usable performance console, not a skeleton.
 V2.3.4 – Trade Table & Drill-Down

Reuse Tickets table pattern in Analytics:
Same canonical fields.
Extra metrics: MAE/MFE, realised R, etc.
Outcome: Analytics supports both top-level metrics and trade-level drill-down.
 V2.3.5 – Mock Data Harness for Offline Mode

Provide a clean toggle (env or dev-only) to run Markets/Analytics from fixtures only.
Outcome: easy demo and development without live DB.
6. EPIC V2.4 — Strategy Lab V2 UI (Canonical Model)
Goal
Turn Strategy Lab into a first-class A2 page using the canonical ticket/risk model for previews, clearly separated from production configs.

Stories
 V2.4.1 – Strategy Config Browser & Editor

Left: list of strategies/config presets.
Middle: editable parameter form (ticks, filters, volatility conditions, time windows).
Outcome: clean A2 UI for modifying strategy parameters in a sandbox.
 V2.4.2 – Preview Tickets Wiring

Connect to preview/backtest endpoint returning canonical preview tickets.
Show preview results in:
Table (Worklist-style).
Optional chart overlay on Markets.
Outcome: Strategy Lab previews show what Worklist would show under those parameters.
 V2.4.3 – Parameter Impact & Summary Panel

Right-hand panel:
Average stop/target.
Expected RR.
Risk per trade.
Hit-rate proxies.
Outcome: clear visibility of how configuration changes impact risk and trade characteristics.
 V2.4.4 – Presets & Scenario Comparison

Save/load presets.
Simple diff view for comparing two configs.
Outcome: reproducible and comparable strategy configurations.
7. EPIC V2.5 — System / Status / Alerts Console
Goal
Surface engine/ingest/strategy/risk/latency health into System/Status and Alerts tabs using A2 patterns.

Stories
 V2.5.1 – Service Health Grid

System page: grid of services (Ingest, SessionMetrics, Strategies, Ticketizer, Risk, Audit, Analytics, Lab, UI).
Show:
Healthy/warning/critical.
Last heartbeat.
Error counts.
Outcome: quick visual read of which part of the pipeline is broken.
 V2.5.2 – Pipeline Latency Panel

Render bar→ticket pipeline latency metrics:
Ingest → metrics → strategies → ticketizer → audit.
Outcome: no guessing where latency lives.
 V2.5.3 – Risk Posture & Exposure Card

Display:
Current open risk vs budget.
Daily risk usage.
Veto/rejection rates by guardrail.
Outcome: System doubles as live risk posture snapshot.
 V2.5.4 – Alerts Feed

Alerts tab: timeline of critical/warning events.
Basic filtering by service and severity.
Outcome: single feed for “what went wrong and when”.
8. EPIC V2.6 — A2 UI Polish & Consistency
Goal
Enforce a consistent A2 visual language across all pages, with a single way to display prices and risk, and explicit alignment between UI specs, mocks, and the live dashboard.

Stories
 V2.6.1 – A2 Design Tokens & Component Audit

Codify A2 tokens (colours, typography, spacing, radii, shadows) in docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md and apps/dashboard/src/index.css / theme.
Audit existing components and pages against:
UI specs in docs/ui/specs/.
The A2 mocks under worklist-mock/, tickets-mock/, markets-mock/, analytics-mock/, strategy-lab-mock/, system-mock/.
Refactor obvious outliers to use shared tokens and primitives (Card, Badge, Button, Tabs, DataTable, FiltersBar, Kpi).
Outcome: a documented, enforced A2 design system that matches the mocks and is consumed by UI primitives.

 V2.6.2 – Table & Card Standardisation

Ensure all tables share the same base patterns and class names via DataTable (headers, hover, zebra/row treatment) using A2 tokens.
Align card headers, body spacing, and typography across pages via Card and Card subcomponents.
Outcome: all pages clearly belong to the same product and use the same base card/table patterns.

 V2.6.3 – Price/Risk Display Component

Introduce a single reusable component for:
Entry/target/stop prices.
Tick deltas (secondary).
Quantity, per-contract risk, total risk, R.
Ensure WorklistV2, Tickets, Markets overlays, Analytics and StrategyLab all use this component instead of ad-hoc price/risk markup.
Outcome: risk display is identical throughout the app.

 V2.6.4 – UI-Level Canonical Integrity Checks

Add guards at UI boundaries (data hooks/adapters) to fail fast if API responses violate core assumptions (e.g. invalid price ordering, missing required fields, obviously broken risk math).
Surface failures as A2-styled error states with enough context for ops to triage.
Outcome: the UI won’t silently render nonsensical ticket data.

 V2.6.5 – Per-Page Mock Parity Checklists

For each canonical V2 page (WorklistV2, Tickets, Markets, Analytics, StrategyLab, Status/System, Alerts), define and execute a “mock parity checklist”:
Layout and sections match the corresponding docs/ui/specs/*.md file.
Visual treatment (shell, cards, tables, pills, KPIs) matches the corresponding *-mock/index.html.
No structural use of raw Tailwind colour classes (bg-slate-*, text-slate-*, etc.) on canonical pages; only A2 tokens or UI primitives.
Outcome: when compared side-by-side with mocks, each page is visually consistent and obviously part of the A2 dashboard.
9. EPIC V2.7 — Dockerised Deployment & Environments
Goal
Provide a single Docker-based way to run the full V2 system (API + dashboard + backing services) locally and in staging, with clear environment profiles.

Stories
 V2.7.1 – Compose Stack Normalisation

Define/update docker-compose (or equivalent) to start:
Postgres (if used).
API.
Dashboard.
Any ingest/job containers.
Correctly wire API_BASE and CORS.
Outcome: docker compose up is the default way to run the full stack.
 V2.7.2 – Env Profiles (SIM / DEV / DEMO)

Wire env vars for:
SIM vs DEMO vs DEV.
Feature toggles for mocks vs real APIs.
Outcome: environment switching is configuration, not code editing.
 V2.7.3 – Health Checks & Readiness

Add health/readiness endpoints and Docker healthchecks:
API / dashboard containers report ready before being considered “up”.
Outcome: deployments know when the system is actually usable.
 V2.7.4 – Basic Deploy Runbook

Short doc:
“How to run the full V2 stack in Docker on a new machine.”
Outcome: any dev/ops can spin up V2 without tribal knowledge.
10. Suggested Execution Order
EPIC V2.1 – Worklist V2 Hardening
EPIC V2.2 – Tickets V2
EPIC V2.7 – Dockerised Deployment & Envs
EPIC V2.3 – Markets & Analytics
EPIC V2.4 – Strategy Lab V2
EPIC V2.5 – System / Status / Alerts
EPIC V2.6 – A2 UI Polish & Consistency
This file is the source of truth for V2 dashboard progress. Update the checkboxes as you deliver each story.

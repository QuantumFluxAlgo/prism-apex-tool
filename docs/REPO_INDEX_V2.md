Prism Apex – V2 Repo Index (Snapshot-Based)
This document describes the structure of the prism-apex-tool monorepo as of the current V2 snapshot. It is intended to be the canonical map for architecture, data flows, and key modules used by the Prism Apex V2 dashboard and engine.

Status flags:
CANONICAL – Production source of truth for V2.
MOCK – Demo/fallback only. Must not be used as primary runtime source.
TEST_FIXTURE – Golden test data, benchmarks, or backtests. Not for runtime wiring.
LEGACY – V1/deprecated or non-V2 surfaces. Do not extend; only touched during cleanup/migrations.
When code or architecture changes, this file must be updated in the same PR.

1. Monorepo Top-Level Structure
Important top-level entries (non-exhaustive for small files, exhaustive for key domains):

apps/ – All runtime services and UIs (API, dashboard, ingest, ingress, tickets helper).
packages/ – Shared domain libraries (rules, strategies, ticketizer, shared contracts, etc.).
types/ – Global TypeScript declaration files used across the monorepo.
docs/ – Architecture, design, specs, EPIC docs, V2 dashboard plan, and build audits.
config/ – Product, contract, roll, and session configuration JSON.
infra/ – Nginx and systemd deployment artefacts and sample env files.
analytics-mock/, markets-mock/, tickets-mock/, worklist-mock/, system-mock/, strategy-lab-mock/ – MOCK HTTP servers for local/demonstration-only dashboards.
scripts/, tools/, bin/ – Local utility scripts and tools.
backups/, tmp/, various *.bak files – Local backups and non-canonical variants.
Root configs:
Dockerfile, docker-compose*.yml
pnpm-workspace.yaml, pnpm-lock.yaml, package.json
eslint / vitest / tsconfig* / vite / playwright configs
Top-level docs:
README.md, OPERATIONS.md, AGENTS.md, TECH-SPEC.md, TESTING.md, PORTS.md, INTEGRATIONS-TRADOVATE.md, GLOSSARY.md, etc.
2. Apps (Runtime Services & UIs)
2.1 apps/api – Fastify API Service (CANONICAL)
Path: apps/api

Responsibilities:

HTTP/WS API for dashboard and operational tooling.
Hosts engines for ingest, session metrics, strategies, ticketizer, and risk coordination via jobs.
Exposes tickets, worklist, analytics, system status, and integration endpoints.
Key entrypoints:

apps/api/src/index.ts – Fastify app bootstrap.
apps/api/src/config/env.ts – Environment configuration wiring.
apps/api/src/config/session-flags.ts – Session flag configuration.
Core domains under apps/api/src/:

dto/ – Typed DTOs for strategy configs and engine:
dto/strategy-config/*.ts – Strategy configuration DTOs, schemas, and typed config surfaces.
dto/strategy-engine/*.ts – Strategy engine DTOs (input/output types and schemas).
jobs/ – Long-running and scheduled jobs (see section 6.2).
routes/ – Fastify route handlers (see section 6.1).
store/ – Persistence/service layer (tickets, telemetry, alerts, operator config).
lib/, util – Job helpers and shared utilities.
Key stores (apps/api/src/store) – all CANONICAL:

operatorConfig.ts – Operator-level configuration store.
riskAuditLog.ts – Risk engine decisions audit log.
systemAlerts.ts – System alerts store.
systemTelemetry.ts – System telemetry store.
telemetry.ts – General telemetry store.
tickets.ts – Canonical tickets store (single entrypoint for ticket persistence).
2.2 apps/dashboard – A2 Operator UI (CANONICAL)
Path: apps/dashboard

Responsibilities:

A2-variant operator dashboard for:
Worklist
Tickets
Markets
Analytics
Strategy Lab
System Status
Alerts
All V2 surfaces must use ExecutionShell and A2 UI primitives and apply the A2 design system tokens defined in docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md and apps/dashboard/src/index.css.

Core structure under apps/dashboard/src/:

App.tsx, main.tsx – SPA bootstrap and routing.
layouts/ExecutionShell.tsx – Shared A2 execution shell (CANONICAL).
pages/ – Page-level surfaces (see below).
ui/ – Reusable A2 UI primitives (Cards, Badges, DataTable, FiltersBar, Tabs, theme, etc.).
components/ – Higher-level dashboard components (risk charts, status panels, etc.).
lib/ – API client wrappers and DTOs.
  - api.ts – Canonical tickets API helpers (fetchTickets, fetchWorklistCanonicalTickets, fetchAnalyticsCanonicalTickets, buildCanonicalTicketFromRow, session metrics helpers).
hooks/ – React hooks for data fetching, polling, and state.
  - useTicketsHistory.ts – Canonical tickets history hook over /api/tickets (date range, symbol, strategy, status, search).
utils/ – Formatting and convenience utilities.
theme/ – Tokens and CSS for A2 look & feel.
2.2.1 Canonical V2 Dashboard Pages
Canonical V2 dashboard pages (apps/dashboard/src/pages) – CANONICAL:

WorklistV2.tsx – Worklist V2 execution page (live signals, scoring, detail panel). Uses fetchWorklistCanonicalTickets(...) over /api/tickets to load CanonicalTicket rows.
Tickets.tsx – Tickets / audit surface (A2). Uses useTicketsHistory + fetchTickets(...) to pull canonical ticket history via /api/tickets, including audit fields (completedBy, notes, risk decision, session metrics).
MarketData.tsx – Markets/market context cockpit (canonical). Uses /api/symbols and /api/session-metrics to drive the session overlays panel and quality/news context.
Analytics.tsx – Performance & drift analytics dashboard (canonical). Uses fetchAnalyticsCanonicalTickets(...) + fetchSessionMetricsBatch(...) to drive KPIs, PnL-over-time, regime breakdown, and the canonical trades table.
StrategyLab.tsx – Strategy Lab (config, backtest, lab vs live). Uses fetchAnalyticsCanonicalTickets(...) to drive lab vs live KPIs and the trades preview over the canonical analytics ticket feed (front-end only; no order routing).
Status.tsx – System status/health dashboard (canonical). Surfaces engine job status, external dependencies, and environment flags from a unified status feed.
Alerts.tsx – Alerts surface (canonical). Shows risk/system/engine/infra alerts with severity and lifecycle filters.
These must be treated as the only canonical operator surfaces for V2.

2.2.2 Other Pages & Variants
Other pages and variants under apps/dashboard/src/pages (mostly V1, legacy, or auxiliary; treat as LEGACY/auxiliary unless explicitly brought into V2 scope):

Worklist.tsx
Worklist.tsx.bak2
Worklist.tsx.bk.* (multiple timestamped backups)
WorklistV2.legacy.tsx
DemoPnL.tsx
Downloads.tsx
Placeholder.tsx
Positions.tsx
Reports.tsx
StrategyConfig.tsx
Backups (*.bak, *.bk.*) are LEGACY.
New work must not extend these; only the V2 pages above are canonical.

2.2.3 UI Primitives (apps/dashboard/src/ui) – CANONICAL
Core A2 UI primitives:

Badge.tsx – Status pills, risk tags (tones: green/amber/red/blue/gray/etc.).
Button.tsx – Button primitive.
Card.tsx – Panel/card container.
DashboardShell.tsx – Shell variant for some dashboards.
DataTable.tsx – Generic typed table abstraction.
FiltersBar.tsx – Standard filters bar used on Worklist, Tickets, Markets, etc.
Kpi.tsx – KPI tiles.
SessionCountdown.tsx – Session time remaining.
Tabs.tsx – Tab component.
ThemeProvider.tsx – Theme context.
dashboardNavConfig.ts – Navigation configuration.
theme.ts – A2 theme tokens/hook.
These are the preferred building blocks for all V2 UI work and must consume the A2 tokens/fonts defined in the UI design system doc and index.css rather than bespoke colours or typography.

2.3 apps/ingest – Batch Ingest Jobs (CANONICAL for ingest)
Path: apps/ingest

Responsibilities:

CLI/batch entrypoints for Yahoo bar ingest and gap-fill operations.
Key files:

src/backfill.ts – Historical backfill pipeline.
src/gapfill.ts – Gap-filling pipeline.
package.json, tsconfig.json – Build/runtime config.
2.4 apps/ingress-yahoo-dev – Yahoo Dev Ingress Service (CANONICAL for dev ingress)
Path: apps/ingress-yahoo-dev

Responsibilities:

Dev-only HTTP ingress service for Yahoo data, used in backtesting and local pipelines.
Key files:

src/server.ts – Service entrypoint.
test/ingress.test.ts – Ingress tests.
tsconfig.json, vitest.config.ts – Build/test config.
2.5 apps/tickets – Ticket Utility CLI (LEGACY/utility)
Path: apps/tickets

Responsibilities:

Small CLI/helper around ticket workflows (e.g. ORR backfill).
Not part of main runtime surfaces; treat as LEGACY/utility unless explicitly used by V2 flows.
Key file:

src/backfill-orr.ts – ORR-related CLI flow.
3. Shared Packages (packages/*)
All packages are versioned libraries used across apps. Most are CANONICAL domain modules.

Key packages:

packages/accounts – @prism-apex/accounts – Accounts domain helpers.
packages/analytics – @prism-apex/analytics – Analytics/reporting domain helpers.
packages/audit – @prism-apex/audit – Audit domain helpers.
packages/clients-tradovate – @prism-apex/clients-tradovate – Tradovate client integrations (read-only; treat with extra care).
packages/config – @prism-apex/config – Config helpers.
packages/consistency – @prism-apex/consistency – Consistency checks.
packages/data-yahoo – @prism-apex/data-yahoo – Yahoo data domain helpers (symbols, bar formats, ingest helpers).
packages/indicators – @prism-apex/indicators – Technical indicators.
packages/metrics – @prism-apex/metrics – Metrics aggregation/utilities.
packages/reporting – @prism-apex/reporting – Reporting-related helpers.
packages/risk-state – @prism-apex/risk-state – Risk state model helpers.
packages/rules – @prism-apex/rules – Generalised rules engine utilities.
packages/rules-apex – @prism-apex/rules-apex – CANONICAL Apex guardrails engine (risk sizing, stops, R:R checks).
packages/runtime – @prism-apex/runtime – Runtime/orchestration helpers.
packages/sdk – @prism-apex/sdk – SDK/meta utilities.
packages/shared – @prism-apex/shared – CANONICAL contracts and shared ticket types:
src/contracts.ts – Canonical contracts (includes CanonicalTicket, CanonicalApprovedTicketView, etc.).
src/tickets.ts – Ticket helpers built around canonical types.
packages/signals – @prism-apex/signals – Signals domain (strategy outputs, signal definitions).
packages/strategies – @prism-apex/strategies – CANONICAL strategy definitions:
src/vwapFirstTouch.ts, src/osbBreakout.ts
Config schemas, inputs, and types.
packages/strategy-apx-ddb01 – @prism-apex/strategy-apx-ddb01 – Specific strategy implementation (APX DDB01 variant).
packages/ticketizer – @prism-apex/ticketizer – CANONICAL ticketization logic (fanout + guards) used by API jobs.
Tests under packages/*/tests and packages/*/__tests__ are TEST_FIXTURE, not runtime.

4. Global Types (types/*)
Path: types/

Responsibilities:

Shared TypeScript declaration files consumed across apps/packages.
Key files (all CANONICAL for typing):

types/global/apex-types.d.ts – Apex-specific types.
types/global/contracts.d.ts – Contract-level typings.
types/global/env.d.ts – Environment variables.
types/global/json.d.ts – JSON typing helpers.
types/global/vitest.d.ts – Test environment typings.
types/test/globals.d.ts – Test-specific globals.
5. Docs & Specs (docs/*)
Key documentation (all CANONICAL for design/architecture):

docs/PRISM_APEX_V2_DASHBOARD_PLAN.md – V2 Dashboard production plan (primary UI epic/story contract).
docs/PRISM_APEX_V2_BUILD_AUDIT.md – Audit of V2 build decisions and waivers.
docs/PRISM_APEX_RISK_ENGINE_V2_DESIGN.md – Risk engine V2 spec.
docs/PRISM_APEX_VWAP_FT_DESIGN.md – VWAP First-Touch design.
docs/PRISM_APEX_ORR_V3_DESIGN.md – ORR strategy design.
docs/PRISM_APEX_OSB_DESIGN.md – OSB strategy design.
docs/PRISM_APEX_DATA_MODEL_PHASE1.md – Data model foundations.
docs/PRISM_APEX_STATE.md (+ .prev) – State model.
docs/PRISM_APEX_OPERATOR_SOP.md – Operator SOP.
docs/PRISM_APEX_DELIVERY_PLAN*.md – Delivery plan and versions.
docs/specs/epics/epic-*.md – EPIC 0–10 specs (engine, ingest, Worklist, analytics, Strategy Lab, etc.).
docs/ui/PRISM_APEX_UI_DESIGN_SYSTEM.md – A2 visual language and UI foundations (tokens, fonts, component rules aligned with A2 mocks).
docs/ui/specs/worklist.md – Worklist UI spec (V2).
docs/ui/specs/tickets.md – Tickets UI spec.
docs/ui/specs/markets.md – Markets UI spec.
docs/ui/specs/analytics.md – Analytics UI spec.
docs/ui/specs/strategy-lab.md – Strategy Lab UI spec.
docs/ui/specs/system.md – System/Status UI spec.
docs/ui/specs/ui-components.md, docs/ui/specs/ui-pages.md – Component and page patterns.
Any future change to EPICs or page contracts must be reflected here and in this repo index.

6. API Service Details (apps/api)
6.1 Fastify Routes (apps/api/src/routes)
All of these are CANONICAL routes unless explicitly prefixed as test-only.

accounts.ts
alerts.ts
analytics.ts
audit.ts
compat.ts
consistency.ts
dto/canonicalTicketView.ts
dto/operatorRisk.ts
dto/operatorSizing.ts
dto/riskDecisionDto.ts
enginePreview.ts
export.ts
health.ts
health.yahoo.ts
ingest.ts
metrics.ts
operator-config.ts
operator-risk.ts
operatorRisk.audit.ts
operatorSizing.ts
opsStatus.ts
ready.ts
report.consistency.ts
report.ts
reports.dashboard.ts
rules.ts
session-metrics.ts
signals.ts
status.ts
strategies.config.ts
strategy-config.ts
strategy-engine.ts
symbols.ts
symbols.v2.ts
system.alerts.ts
system.jobs.ts
system.telemetry.ts
telemetry.ts
ticket.complete.ts
ticketQualityFilters.ts
tickets.debug.ts
tickets.ts
version.ts
webhooks.tradingview.ts
These routes underpin Worklist, Tickets, Markets/Analytics/Strategy Lab, system health, and integration surfaces.

6.2 Jobs & Pipelines (apps/api/src/jobs)
All of these are CANONICAL jobs unless explicitly marked as test-only.

__tests__/strategies.apx-ddb01.spec.ts – TEST_FIXTURE.
__tests__/ticketsDiskSync.spec.ts – TEST_FIXTURE.
boot.ts – API job bootstrapping.
consistency.ts – Consistency checking job.
dailyLoss.ts – Daily loss monitoring.
engineReplayCli.ts – CLI for engine replay.
engineReplayRunner.test.ts – TEST_FIXTURE.
engineReplayRunner.ts – Engine replay runner logic.
engineRunJob.test.ts – TEST_FIXTURE.
engineRunJob.ts – Engine run orchestration.
eodFlat.ts – End-of-day flattening job.
feed.ts – Ingest/feed integration job (bars pipeline).
jobManager.ts – Job manager orchestrator.
jobManagerTestHooks.ts – Test hooks for job manager.
manager.ts – High-level job management orchestration.
missingBrackets.ts – Consistency/repair helper.
scheduler.ts – Job scheduler.
session-metrics/README.md – Documentation.
session-metrics/batch.test.ts – TEST_FIXTURE.
session-metrics/batch.ts – Batch session metrics job.
session-metrics/golden-days/ES_2025-01-15.json – Golden day fixture (TEST_FIXTURE).
session-metrics/golden-days/fixtures.example.json – Example fixture (TEST_FIXTURE).
session-metrics/golden-days/README.md – Golden day docs.
session-metrics/golden-days/replay.test.ts – TEST_FIXTURE.
session-metrics/golden-days/replay.ts – Golden day replay pipeline.
session-metrics/index.ts – Session metrics job index.
session-metrics/populate-session-metrics.test.ts – TEST_FIXTURE.
session-metrics/populate-session-metrics.ts – Canonical populate session metrics job.
session-metrics/runtime.ts – Runtime session metrics computation.
session-metrics/service.ts – Session metrics service.
session-metrics/session-flags-service.test.ts – TEST_FIXTURE.
session-metrics/session-flags-service.ts – Session flags service.
session-metrics/types.ts – Session metrics types.
strategies.ts – Strategy jobs orchestrator.
strategyConfigDriftCli.ts – CLI for strategy config drift.
strategyConfigFreezeCli.ts – CLI for freezing config.
telemetry.ts – Telemetry job.
ticketizer.ts – Ticketization job (uses packages/ticketizer and rules-apex).
ticketsDiskSync.ts – Tickets disk sync job.
util.ts – Job utilities.
7. Config, Infra & Operational Artefacts
7.1 Config (CANONICAL runtime configuration)
Path: config/

contracts-spec.json – Contract specification for supported instruments.
products.json – Product universe and metadata.
roll.json – Roll schedule information.
sessions.json – Trading session definitions (used by ingest/session metrics).
7.2 Apex Rules
apex/rules.json – Apex account rules and constraints (CANONICAL input to risk/rules-apex).
7.3 Infra
Path: infra/

nginx/prism-apex.conf.example – Example Nginx configuration.
systemd/prism-apex.service – Systemd unit file.
systemd/prism-apex.env.example – Env sample for systemd.
.env.prod.example – Production env template.
7.4 Root Docs & Runbooks
README.md – Project overview.
OPERATIONS.md – Operational procedures.
AGENTS.md – Agent descriptions and persona expectations.
PORTS.md – Port allocation.
TECH-SPEC.md – High-level technical specification.
TESTING.md – Testing strategy.
INTEGRATIONS-TRADOVATE.md – Tradovate integration notes (read-only / ticket-based).
CHANGELOG.md, VERSION – Versioning and change history.
8. Mocks, Fixtures & Legacy
8.1 Top-Level Mock Servers (MOCK)
Each of these exposes a simple HTTP server (index.html + server.js) for demo-only dashboards:

analytics-mock/
markets-mock/
strategy-lab-mock/
system-mock/
tickets-mock/
worklist-mock/
These must not be treated as canonical data sources. They are for demos and UI-only exploration and serve as visual reference for the A2 design system when aligning V2 pages to the mocks.

8.2 Dashboard Mock Generators (MOCK tooling)
Shell scripts to generate/dump mock datasets (all MOCK-only):

generate_worklist_mock.sh
generate_worklist_market_a2_mock.sh
generate_analytics_mock.sh
generate_markets_mock.sh
generate_tickets_mock.sh
generate_system_mock.sh
generate_strategy_lab_mock.sh
generate_strategy_lab_a2_mock.sh
generate_prism_apex_full_mock.sh
generate_prism_apex_spec_mock.sh
generate_prism_apex_a2_mock.sh
generate_prism_a2_three_view_mock.sh
These pipelines must never be wired as the primary data source in V2 production.

8.3 Tests & Fixtures (TEST_FIXTURE)
__tests__/helpers/* – General test helpers (arrays, asserts, ticket fixtures, market data mocks).
apps/api/src/jobs/session-metrics/golden-days/*.json – Golden Day fixtures (e.g. ES_2025-01-15.json).
packages/shared/src/tickets.fixtures.ts – Shared ticket fixtures.
apps/dashboard/src/__tests__/* – Dashboard tests.
packages/*/tests/*, packages/*/__tests__/* – Package-level tests.
tests/setup/vitest.setup.ts – Global Vitest setup.
These are used for testing only.

8.4 Legacy & Backup Files (LEGACY)
Any *.bak or timestamped .bk.* files (e.g. Worklist.tsx.bk.*, Tooltip.tsx.bk.*) under apps/dashboard/src.
apps/dashboard/src/pages/Worklist.tsx, Worklist.tsx.bak2, WorklistV2.legacy.tsx – V1/legacy Worklist variants; do not extend.
Non-V2 dashboard pages such as:
DemoPnL.tsx
Downloads.tsx
Placeholder.tsx
Positions.tsx
Reports.tsx
StrategyConfig.tsx
Older docs with .prev suffix (e.g. PRISM_APEX_DELIVERY_PLAN.md.prev, PRISM_APEX_STATE.md.prev).
These are available for reference or transitional use only. New work must target the CANONICAL modules and pages.

9. EPIC ↔ Code Anchors (High-Level)
This section maps EPICs (from docs/specs/epics/epic-*.md) to primary code anchors.

EPIC 0 – Ingest & Bar Store
apps/ingest/src/backfill.ts, apps/ingest/src/gapfill.ts
apps/api/src/jobs/feed.ts
packages/data-yahoo/*
EPIC 1 – Session Metrics
apps/api/src/jobs/session-metrics/*
apps/api/src/routes/session-metrics.ts
apps/api/src/routes/metrics.ts
packages/metrics/*
EPIC 2 – Strategies & Ticketizer
packages/strategies/*
packages/signals/*
packages/ticketizer/*
apps/api/src/jobs/strategies.ts
apps/api/src/jobs/engineRunJob.ts, engineReplayRunner.ts
apps/api/src/jobs/ticketizer.ts
apps/api/src/store/tickets.ts
EPIC 3 – Risk Engine & Guardrails
packages/rules-apex/*
packages/rules/*
packages/risk-state/*
apps/api/src/routes/dto/operatorRisk.ts, dto/riskDecisionDto.ts
apps/api/src/store/riskAuditLog.ts
EPIC 4 – Worklist V2
apps/api/src/routes/tickets.ts (worklist feed and related handlers).
apps/api/src/routes/ticketQualityFilters.ts
apps/dashboard/src/pages/WorklistV2.tsx
apps/dashboard/src/ui/* (FiltersBar, DataTable, Card, Badge, theme).
apps/dashboard/src/lib/api.ts, apps/dashboard/src/lib/worklistMock.ts (MOCK fallback only).
EPIC 5 – Tickets / Audit
apps/api/src/routes/tickets.ts, tickets.debug.ts, ticket.complete.ts
apps/api/src/routes/audit.ts
apps/dashboard/src/pages/Tickets.tsx
EPIC 6 – Markets & Overlays
apps/api/src/routes/session-metrics.ts, metrics.ts
apps/api/src/routes/symbols.ts, symbols.v2.ts
apps/dashboard/src/pages/MarketData.tsx
EPIC 7 – Reports / Analytics
apps/api/src/routes/analytics.ts
apps/api/src/routes/export.ts
apps/dashboard/src/pages/Analytics.tsx
EPIC 8 – Strategy Lab
apps/api/src/routes/strategy-config.ts, strategies.config.ts
apps/api/src/dto/strategy-config/*
apps/dashboard/src/pages/StrategyLab.tsx
packages/strategies/*, packages/analytics/* (backtest/reporting integrations)
EPIC 9 – System Health / Status
apps/api/src/routes/health.ts, health.yahoo.ts
apps/api/src/routes/status.ts, system.alerts.ts, system.jobs.ts, system.telemetry.ts
apps/api/src/store/systemAlerts.ts, systemTelemetry.ts
apps/dashboard/src/pages/Status.tsx
apps/dashboard/src/components/SystemStatus.tsx
EPIC 10 – V2 Polish & Cleanup
docs/PRISM_APEX_V2_BUILD_AUDIT.md
docs/REPO_INDEX_V2.md (this file)
Dead-code identification and removal:
analytics-mock/, worklist-mock/, markets-mock/, tickets-mock/, system-mock/, strategy-lab-mock/
Legacy pages and *.bak files
Old/unused routes and jobs, once confirmed safe.
10. Maintenance Rules
Any time a page, route, job, store, or canonical DTO is added/moved/deleted, this file must be updated in the same PR.
Any time a new mock, fixture, or demo server is added, it must be recorded here as MOCK or TEST_FIXTURE.
When EPICs or dashboard scope change, update:
docs/PRISM_APEX_V2_DASHBOARD_PLAN.md
This file (docs/REPO_INDEX_V2.md)
Future ChatGPT sessions must treat this file as the map, then confirm via recon (Codex Terminal) before changing behaviour.

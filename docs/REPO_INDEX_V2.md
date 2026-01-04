# PRISM APEX – V2 REPO INDEX  
**Canonical Architecture & Monorepo Map**  
_Last updated: 2025-12-08_

---

# 1. Overview

This document is the **canonical index** for the `prism-apex-tool` monorepo.  
It is the single source of truth for:

- Repository structure  
- Canonical vs mock modules  
- Engine, ingest, analytics, and dashboard architecture  
- File-level mappings for each V2 EPIC  
- Operational boundaries and runtime contracts  

This file must be updated **in the same PR** as any material code change.

---

## 1.1 Purpose

Enable any engineer or AI assistant to:

- Understand the **exact structure** of the monorepo  
- Locate **canonical engine, strategy, ingestion, analytics, and dashboard modules**  
- Distinguish canonical code from:
  - **MOCK**
  - **TEST_FIXTURE**
  - **LEGACY**
- Navigate the system to implement or verify V2 features safely  
- Maintain a consistent understanding of the V2 dashboard system  

---

## 1.2 Status Flags (Definitions)

| Flag | Meaning |
|------|---------|
| **CANONICAL** | Production source of truth. Must be used for V2. |
| **MOCK** | Demo/fallback only; not permitted for production logic. |
| **TEST_FIXTURE** | Test data or golden states. Never used at runtime. |
| **LEGACY** | V1/deprecated. Never extended; only removed/cleaned. |

---

## 1.3 High-Level System Summary

Prism Apex comprises four major subsystems:

1. **Engine & Jobs** (strategies, session metrics, risk engine, ticketizer)  
2. **Fastify API Service** (HTTP/WS interface to engine + state stores)  
3. **Operator Dashboard (A2/A3 surfaces)**  
4. **Ingest Pipelines** (Yahoo bars, replay, gapfill)

The monorepo implements:

- Canonical ticket model  
- Session metrics jobs & store  
- Strategy orchestration (ORR/OSB/VWAP-FT, etc.)  
- Risk engine (rules-apex)  
- Analytics based on canonical analytics ticket feed  
- Operator dashboards  
- Consistency, telemetry, and audit subsystems  

---

# 2. System Architecture Overview

The Prism Apex platform forms a **data and decision pipeline**:

Market Data (Yahoo 1m bars)
↓
Ingest jobs (backfill, gapfill)
↓
Session Metrics Engine (OR/ATR/VWAP/regime)
↓
Strategies (OSB / ORR / VWAP-FT / custom)
↓
Ticketizer (risk sizing, guardrails, R:R checks)
↓
Canonical Tickets Store
↓
API Service (Fastify)
↓
Dashboard (WorklistV2, Tickets, Markets, Analytics, Strategy Lab)

markdown
Copy code

### 2.1 Core Architectural Concepts

- **CanonicalTicket** and **CanonicalApprovedTicketView** are the *only* ticket shapes used in V2.
- A2/A3 dashboard pages use **canonical API routes** via the unified client in `apps/dashboard/src/lib/api.ts`.
- The **engine + API + dashboard** form one coherent system.

---

# 3. Monorepo Directory Map (Top-Level)

Below is the **top-level map** of major folders.  
This is exhaustive for all system-critical domains.

prism-apex-tool/
│
├── apps/
│ ├── api/ # Fastify service (CANONICAL)
│ ├── dashboard/ # Operator UI (CANONICAL)
│ ├── ingest/ # Batch ingest (CANONICAL)
│ ├── ingress-yahoo-dev/ # Yahoo dev ingress (CANONICAL)
│ ├── e2e/ # Playwright regression harness (TEST_FIXTURE, keeps A3 flows honest)
│ └── tickets/ # CLI utility (LEGACY/utility)
│
├── packages/ # Shared domain libraries (CANONICAL)
│
├── types/ # Global TypeScript declarations (CANONICAL)
│
├── docs/ # Specs, design system, dashboard plans (CANONICAL)
│
├── config/ # Product/session/contract config (CANONICAL)
│
├── infra/ # Nginx, systemd, env templates (CANONICAL)
│
├── analytics-mock/ # MOCK servers
├── markets-mock/ # MOCK
├── tickets-mock/ # MOCK
├── worklist-mock/ # MOCK
├── system-mock/ # MOCK
├── strategy-lab-mock/ # MOCK
│
├── scripts/ # Local utilities
├── tools/ # Developer tools
├── bin/ # Executables
│
└── backups/ / tmp/ / *.bak # LEGACY/backup

markdown
Copy code

---

# 4. Apps (Runtime Services & UIs)

Each app under `apps/` is documented with:

- Purpose  
- Canonical modules  
- Key entrypoints  
- V2 relevance  
- Domain boundaries  

---

# 4.1 `apps/api` – Fastify API Service (**CANONICAL**)

**Path:** `apps/api/`  
**Purpose:** Primary backend exposing canonical APIs to dashboard and tools.

### Responsibilities

- Ticket endpoints (worklist, analytics, ticket history)
- Session metrics feed
- Strategy engine control (read-only)
- Risk engine updates & audit logging
- Consistency & telemetry
- System/status endpoints
- Operator config
- Symbols/products/session info
- Tradovate-facing endpoints (read-only)

### Key Entrypoints

- `src/index.ts` – API bootstrap
- `src/config/env.ts` – environment loader
- `src/jobs/*` – engine jobs
- `src/routes/*` – HTTP routes (see section 8)

### Canonical Domains (`apps/api/src`)

- `routes/` – All Fastify routes (**CANONICAL**)
- `jobs/` – Strategy, ticketizer, session metrics, telemetry jobs
- `store/` – In-memory or persistent stores:
  - `tickets.ts`
  - `systemAlerts.ts`
  - `systemTelemetry.ts`
  - `telemetry.ts`
  - `operatorConfig.ts`
  - `riskAuditLog.ts`
- `dto/` – Data transfer objects for engine/strategy/config
- `util/` – Shared helpers for jobs and routes
- `lib/` – Cross-cutting helpers (guardrails, telemetry, stamping). P1-0 adds `lib/systemRecordStamps.ts`, which stamps payloads with `engine_version`, a deterministic `config_fingerprint`, schema version, and a UTC timestamp so upcoming `/api/system-records/*` endpoints can prove provenance.

### P1 System Records (engineering-only)

Purpose: provide append-only, read-only audit breadcrumbs describing “what the engine saw and why it acted (or didn’t)” without touching ticket generation paths. These records are intended for engineering + future operator tooling.

- **DB**
  - `deploy/sql/031_orr_gate_results.sql` creates `orr_gate_results` (one row per `(run_id, session_date, symbol)` with provenance stamps).
  - `deploy/sql/032_orr_gate_results_cleanup.sql` removes the earlier planner-labelled rows so only gate semantics remain (`canonical_strategy_key='orr_gate'`).
  - `deploy/sql/033_planner_reject_counts.sql` adds `planner_reject_counts` for aggregated drop counters keyed by `(session_date, symbol, requested_planner, rejecting_planner, reject_stage, reason_code)`.
  - `deploy/sql/init/001_roles.sql` seeds both `apex/apex` and `prismapex/prismapex` on fresh Postgres volumes and grants the permissions needed for the API and stores.
  - `scripts/local/db-normalize-roles.sh` can be run after the stack is up to reapply the same role credentials against an existing volume (no data loss).

### Local Postgres determinism (engine + dev safety)

- The local compose stack (`docker-compose.v2.local.yml`) now mounts `deploy/sql/init/001_roles.sql` into `/docker-entrypoint-initdb.d` so a fresh Postgres volume always creates both roles.
- Run `scripts/local/db-normalize-roles.sh` when you swap branches or rebuild with existing volumes to ensure `apex` and `prismapex` keep their canonical passwords and privileges; this prevents the `28P01` errors that previously broke `planner-rejects`.

- **Store**
  - `apps/api/src/store/orrGateResults.ts` exposes a single Pool, helper to run a callback with a client, an `insertOrrGateResultWithClient` helper, and read APIs that automatically scope to `canonical_strategy_key='orr_gate'`.
- **Writer**
  - `apps/api/src/jobs/engineRunJob.ts` writes one ORR gate record for every engine run invocation (regardless of requested planner). It computes the shared gate via `apps/api/src/lib/orrGate.ts`, captures session flags + session metrics summaries, and stores a compact per-planner preview rollup in `details`.
  - Gate identity is explicit: `canonical_strategy_key='orr_gate'`, `engine_strategy_id='ORR_GATE'`, and `ticket_strategy_id` reflects whichever planner was asked to run (e.g., `APX-DDB-01`, `OSB`, `VWAP_FT`).
- **Read-only API**
  - `apps/api/src/routes/system-records.orr.ts` exposes `GET /api/system-records/orr-gate` (paginated list) and `GET /api/system-records/orr-gate/latest` (latest per symbol for a session). Registered in `apps/api/src/server.ts` so auth/rate-limit middleware apply automatically.
- **Provenance helper**
  - `apps/api/src/lib/systemRecordStamps.ts` fingerprints the gate config + context (engine version, deterministic config hash, schema version, computed timestamp).

Writes are restricted to the engine job pathway; no other service may touch `orr_gate_results`.

### Runtime Contract

Dashboard APIs **must only** call canonical routes.  
Mocks are not permitted for production flows.

# 4.2 `apps/dashboard` – Operator Dashboard (A2/A3) **CANONICAL**

**Path:** `apps/dashboard/`  
**Purpose:**  
This is the **official operator UI** for Prism Apex.  
All V2 A3 surfaces live here.  
This is the only frontend that must be used for production workflows.

---

## 4.2.1 Responsibilities

- Worklist V2 (execution cockpit)  
- Tickets (audit & history)  
- Markets (session context cockpit)  
- Analytics (R-multiple, PnL, drift analysis)  
- Strategy Lab (lab vs live configs)  
- System Status (telemetry)  
- Alerts (risk/system alerts)  
- Positions (synthetic positions via canonical tickets)

The dashboard uses:

- **React + Vite**
- **Shared UI primitives** (A2 design system)
- **Canonical API wrappers** in `lib/api.ts` and `lib/apiBase.ts`
- **Canonical hooks** in `hooks/`

No page may implement its own fetch logic; all network traffic must go through `lib/apiBase.ts` → `lib/api.ts`.

---

## 4.2.2 Directory Map (Canonical)

apps/dashboard/src/
│
├── App.tsx # Top-level SPA router
├── main.tsx # Vite bootstrap
│
├── layouts/
│ └── ExecutionShell.tsx # A3 global shell (header, env badges, background) — CANONICAL
│
├── pages/ # All page-level surfaces
│ ├── WorklistV2.tsx # CANONICAL operator cockpit
│ ├── Tickets.tsx # CANONICAL audit surface
│ ├── MarketData.tsx # CANONICAL markets/session cockpit
│ ├── Analytics.tsx # CANONICAL analytics
│ ├── StrategyLab.tsx # CANONICAL lab surface
│ ├── Status.tsx # CANONICAL system health
│ ├── Alerts.tsx # CANONICAL alerts stream
│ ├── Positions.tsx # CANONICAL synthetic positions
│ └── (legacy V1 pages) # LEGACY — never extended
│
├── ui/ # A2 UI primitives (CANONICAL)
│ ├── Badge.tsx
│ ├── Button.tsx
│ ├── Card.tsx
│ ├── DataTable.tsx
│ ├── FiltersBar.tsx
│ ├── Kpi.tsx
│ ├── Tabs.tsx
│ ├── Tooltip.tsx
│ ├── dashboardNavConfig.ts
│ ├── theme.ts
│ └── (more UI atoms…)
│
├── components/ # Domain-specific composites
│ ├── WorklistPnLCell.tsx
│ ├── SystemStatus.tsx
│ └── (additional small domain components)
│
├── hooks/
│ ├── useWorklistTickets.ts # CANONICAL worklist hook
│ ├── useTicketsHistory.ts # CANONICAL tickets history hook
│ └── (future hooks)
│
├── lib/
│ ├── apiBase.ts # API_BASE resolver + tolerant fetchJson — CANONICAL
│ ├── api.ts # All dashboard API clients — CANONICAL
│ ├── worklistMock.ts # MOCK fallback for worklist V2
│ └── (misc libs)
│
├── utils/
│ ├── number.ts # fmtPrice, fmtR, etc.
│ ├── time.ts # fmtUtc
│ ├── pnlDisplay.ts # Tested PnL formatting logic
│ └── (misc utilities)
│
├── styles/ # Page-specific A3 styles
│ ├── analytics-a3.css
│ ├── markets-a3.css
│ └── (token-based styles)
│
└── tests/ # Vitest suite (CANONICAL)

markdown
Copy code

---

## 4.2.3 Canonical A3 Dashboard Pages

Each V2 page adheres to the A3 surface contract:

- Global header via `ExecutionShell`
- Page header (title, badges)
- Filters bar
- KPI strip (where applicable)
- Main table or chart surface
- Detail panel (right or bottom)

### **WorklistV2.tsx** — *Operator Cockpit*  
**Status:** CANONICAL & COMPLETE (V2.1 delivered)

- Uses `useWorklistTickets`  
- Live + mock fallback handling  
- Filters: symbol, strategy, side, risk bucket, score, age  
- KPI strip  
- Canonical ticket table  
- Narrative-rich detail panel  

### **Tickets.tsx** — *Ticket History*  
**Status:** CANONICAL & COMPLETE (V2.2 delivered)

- Calls `fetchTickets()`  
- A3 layout without router dependency  
- Extensive tests ensuring stability  
- KPI strip + full detail panel  

### **MarketData.tsx** — *Session Context Cockpit*  
**Status:** CANONICAL (First pass done; deepening required — EPIC V2.2)**

- Symbol selector  
- Session selector  
- OR/ATR/VWAP/regime overlays  
- Detail panel  
- Uses `fetchSessionMetricsBatch`  

### **Analytics.tsx** — *Canonical Analytics*  
**Status:** CANONICAL & COMPLETE (A3 Analytics delivered)

- Fetches analytics tickets  
- Batch session metrics  
- Summary KPIs  
- Full details & tickets breakdown  

### **StrategyLab.tsx** — *Lab Surface*  
**Status:** CANONICAL (Baseline delivered; deepening required)**

- Preset strip  
- Lab KPIs over analytics feed  
- Future: config narrative, lab/live comparison  

### **Status.tsx**, **Alerts.tsx**, **Positions.tsx**  
**Status:** CANONICAL baseline (tests green)  
**Next:** A3 enrichment and deeper wiring (V2.4)

---

## 4.2.4 Dashboard Test Suite (Vitest)

**Path:** `apps/dashboard/src/__tests__/`  
**Status:**  
All V2 tests currently **pass** (10 spec files across Alerts/Analytics/App/MarketData/Positions/StrategyLab/Tickets/WorklistPnLCell/Status plus the shared `pnlDisplay` utility).

Tests cover:

- Worklist PnL cell  
- Tickets  
- Analytics  
- Markets  
- Alerts  
- Status  
- Strategy Lab  
- Positions  
- App router  
- PnL display utilities  

Tests act as the **contract** for A3 behaviour.  
Breaking tests without updating them is not permitted.

---

# 4.3 `apps/ingest` – Yahoo Ingest & Backfill **CANONICAL**

**Purpose:**  
Provides historical & gap-fill bar ingest for the engine.

### Key Files

- `src/backfill.ts` — historical backfill  
- `src/gapfill.ts` — gap filling  
- `src/*` — ingest helpers  

This app is required for realistic analytics & ticketization.

---

# 4.4 `apps/ingress-yahoo-dev` – Yahoo Dev Ingress **CANONICAL**

**Purpose:**  
Local-only service to stream Yahoo bars during development.

---

# 4.5 `apps/tickets` – Tickets CLI (LEGACY)

Small CLI utilities for ticket workflows.  
Not part of V2 UI or canonical engine pipelines.

# 4.6 `apps/e2e` – Playwright Smoke Suite (**TEST_FIXTURE**)

**Purpose:**  
Provides repeatable, automated browser coverage of A2/A3 pages against a running stack.

### Notes

- Uses Playwright (`playwright.config.ts`, `tests/` tree).  
- Runs read-only flows (worklist drill, tickets filtering, analytics drill-down) to ensure regressions surface quickly.  
- Does **not** ship to production artifacts but remains part of canonical QA; update specs whenever flows change.

# 5. Shared Packages (`packages/*`)

The `packages/` directory contains all **shared domain libraries** used across the monorepo.  
These packages together represent the **core business logic** of Prism Apex V2:
- Canonical models  
- Risk engine  
- Strategy engines  
- Ticketization  
- Metrics & analytics  
- Yahoo data  
- Rules & guardrails  
- Internal utilities  

Most packages are **CANONICAL** unless marked as TEST_FIXTURE or LEGACY.

> **Rule:** Frontend and API surfaces must never re-implement domain logic.  
> They must import from these packages to guarantee correctness and consistency.
5.1 Overview Table (Canonical / Mock / Test Fixture)
md
Copy code
| Package Name                  | NPM Scope               | Status        | Purpose                                         |
|------------------------------|--------------------------|---------------|-------------------------------------------------|
| @prism-apex/accounts         | packages/accounts       | CANONICAL     | Accounts domain + helper logic                  |
| @prism-apex/analytics        | packages/analytics      | CANONICAL     | Analytics & reporting helpers                   |
| @prism-apex/audit            | packages/audit          | CANONICAL     | Audit & compliance helpers                      |
| @prism-apex/clients-tradovate| packages/clients-tradovate | CANONICAL (read-only) | Tradovate integration helpers            |
| @prism-apex/config           | packages/config         | CANONICAL     | Shared config utils                             |
| @prism-apex/consistency      | packages/consistency    | CANONICAL     | Consistency checks                              |
| @prism-apex/data-yahoo       | packages/data-yahoo     | CANONICAL     | Yahoo 1m bar domain                             |
| @prism-apex/indicators       | packages/indicators     | CANONICAL     | Technical indicators                             |
| @prism-apex/metrics          | packages/metrics        | CANONICAL     | Session + trade metrics logic                    |
| @prism-apex/reporting        | packages/reporting      | CANONICAL     | Reporting helpers                                |
| @prism-apex/risk-state       | packages/risk-state     | CANONICAL     | Risk state machine                               |
| @prism-apex/rules            | packages/rules          | CANONICAL     | Generic rules engine                              |
| @prism-apex/rules-apex       | packages/rules-apex     | CANONICAL     | **Apex Risk Engine** & guardrails                |
| @prism-apex/runtime          | packages/runtime        | CANONICAL     | Runtime/orchestration helpers                    |
| @prism-apex/sdk              | packages/sdk            | CANONICAL     | Toolkit/SDK abstractions                         |
| @prism-apex/shared           | packages/shared         | **CANONICAL** | **Shared contracts (CanonicalTicket, etc.)**     |
| @prism-apex/signals          | packages/signals        | CANONICAL     | Strategy signal definitions                      |
| @prism-apex/strategies       | packages/strategies     | CANONICAL     | Strategy implementations (VWAP-FT, OSB, etc.)    |
| @prism-apex/strategy-apx-ddb01 | packages/strategy-apx-ddb01 | CANONICAL | DDB01 variant strategy implementation           |
| @prism-apex/ticketizer       | packages/ticketizer     | CANONICAL     | Ticket creation engine                           |

| (Tests)                      | packages/*/__tests__    | TEST_FIXTURE  | Unit & integration tests; not used in runtime    |
5.2 Canonical Package Descriptions
Below is a detailed, canonical explanation for each domain module.

5.2.1 @prism-apex/shared — Canonical Contracts (CORE)
Path: packages/shared/
Status: CANONICAL – SINGLE SOURCE OF TRUTH

This is the most important package for the entire system.

It defines the core contract types used across:

Engine

API

Dashboard

Ticketizer

Analytics

Strategy Lab

Includes:
CanonicalTicket

CanonicalApprovedTicketView

Strategy event types

Bar/market data types

Time/date/session types

Shared numeric + domain-specific enums

Rule:
No dashboard, API route, or job may define its own ticket shape.
Everything must import from @prism-apex/shared.

5.2.2 @prism-apex/rules-apex — Apex Risk Engine (CORE)
Path: packages/rules-apex
Status: CANONICAL

Contains all Apex-specific guardrails, including:

Risk sizing logic

Daily loss checks

R:R ratio verification

Stop-loss boundaries

Regime-based rule overrides

Account constraints

Used by:

Engine

Ticketizer

Risk-audit logs

Strategy orchestrator

No logic may be duplicated elsewhere.

5.2.3 @prism-apex/ticketizer — Ticket Creation Engine (CORE)
Path: packages/ticketizer
Status: CANONICAL

Responsible for turning strategy signals into:

CanonicalTickets

ApprovedTicketViews

Supporting audit fields

Used by:

Engine jobs (engineRunJob.ts, ticketizer.ts)

API routes for previewing tickets

Strategy backtests

This is the heart of live ticket creation.

5.2.4 @prism-apex/strategies — Strategy Implementations
Path: packages/strategies/
Status: CANONICAL

Contains the actual trading strategies:

VWAP First Touch (VWAP-FT)

OSB Breakout

ORR

Additional strategies under development

Each strategy defines:

Inputs

Signal logic

Output contract (shared)

These outputs feed into ticketizer.

5.2.5 @prism-apex/signals — Strategy Signal Definitions
Contains reusable signal-building utilities.

5.2.6 @prism-apex/analytics — Analytics Domain
Provides:

PnL aggregation

R-multiple math

Rolling window metrics

Summary computation

Used by Analytics page and Strategy Lab.

5.2.7 @prism-apex/metrics — Session + Trading Metrics
Contains the logic powering:

Session overlays (OR, ATR)

Vol regime classification

Trend bias

VWAP slope

OR/ATR ratio

Used by:

Engine

API routes

Dashboard (Markets + Analytics)

5.2.8 @prism-apex/data-yahoo — Yahoo Data Utilities
Responsible for:

Yahoo ingest formats

Bar parsing

Symbol metadata

Gap-detection helpers

Used by ingest jobs and session-metrics jobs.

5.2.9 @prism-apex/audit — Audit Framework
Risk & engine audit logs.

5.2.10 @prism-apex/risk-state
Represents risk-state snapshot for an account/session.

5.2.11 @prism-apex/runtime
Runtime helpers for orchestrators and job managers.

5.2.12 @prism-apex/sdk
Common utilities, convenience wrappers, and shared code for CLIs.

5.2.13 @prism-apex/config
Shared config logic (account config, product config, roll schedule, etc.)

5.2.14 @prism-apex/consistency
Cross-domain consistency-check helpers.

5.2.15 @prism-apex/reporting
Reporting helpers used across engine + analytics.

5.2.16 @prism-apex/clients-tradovate
Read-only Tradovate client integration helpers.

Note:
Prism Apex never places live orders.
These clients are used for account read-only contexts or offline simulation.

5.3 Test Packages (TEST_FIXTURE)
Each package may contain:

/tests

/__tests__

These are pure fixtures, mocks, and unit tests.

They must never be imported in production code.

5.4 Rules for Shared Packages
md
Copy code
1. Canonical logic must be in packages, never duplicated in apps.
2. Dashboard and API must import contracts from @prism-apex/shared.
3. Ticket logic must always import from @prism-apex/ticketizer.
4. Strategy logic must always import from @prism-apex/strategies or @prism-apex/signals.
5. Risk logic must always import from @prism-apex/rules-apex.
6. If a package changes, update this file (`REPO_INDEX_V2.md`) so downstream surfaces stay in sync.

# 6. Global Types (`types/*`)

The `types/` directory provides global TypeScript declarations used across the monorepo.
These definitions ensure consistency between the API, dashboard, ingest jobs, and all
packages.

> **Status:** CANONICAL

Every file here participates directly in the TypeScript compilation pipeline for all apps/packages.

---

## 6.1 Directory Structure

types/
global/
apex-types.d.ts
contracts.d.ts
env.d.ts
json.d.ts
vitest.d.ts
test/
globals.d.ts

markdown
Copy code

---

## 6.2 File Descriptions

### **`global/apex-types.d.ts`**
- Apex-specific shared types used across engine + dashboard.
- Includes enums, domain-level identifiers, and utility types.

### **`global/contracts.d.ts`**
- Canonical contract interfaces (aligned with `@prism-apex/shared`).
- Provides convenience-level global access to shared contracts.

### **`global/env.d.ts`**
- Declares environment vars for apps (API_BASE, NODE_ENV, ingest settings, etc.).

### **`global/json.d.ts`**
- JSON typing helpers for deep-typed JSON parsing.

### **`global/vitest.d.ts`**
- Vitest global test declarations.

### **`test/globals.d.ts`**
- Test-only globals; required by dashboard + API test suites.

> **Rule:**  
> Anything runtime-relevant must exist in `@prism-apex/shared`, not only here.  
> These files exist to support TS ergonomics, not domain logic.
7. Documentation & Specs (docs/*)
md
Copy code
# 7. Docs & Specs

The `docs/` directory contains **all canonical architecture, design, strategy, and UI documentation**.

> **Status:** CANONICAL — These documents define how Prism Apex V2 must behave.

Any change to domain models, UI, engine, or workflow must be reflected here.

---

## 7.1 Key Architecture Docs

- `UPGRADE_DASHBOARD.md`
  - Epic delivery log for the V2 dashboard rollout.
  - Replaces the retired dashboard plan; use this alongside `REPO_INDEX_V2.md` for scope tracking.

- `PRISM_APEX_V2_BUILD_AUDIT.md`
  - Full audit of code decisions, waivers, and rationale.

- `PRISM_APEX_RISK_ENGINE_V2_DESIGN.md`
  - Canonical risk engine specification.

- `PRISM_APEX_STATE.md` & `.prev`
  - State machine definitions for engine execution.

- `PRISM_APEX_DATA_MODEL_PHASE1.md`
  - Data model and contracts overview.

- `PRISM_APEX_DELIVERY_PLAN*.md`
  - Versioned delivery/roadmap.

- `PRISM_APEX_OPERATOR_SOP.md`
  - Operator workflow SOP for production incidents.

---

## 7.2 UI / Design System Docs (`docs/ui`)

These define the **A2 design system**, which all A3 surfaces adhere to:

- `PRISM_APEX_UI_DESIGN_SYSTEM.md`
- `specs/worklist.md`
- `specs/tickets.md`
- `specs/markets.md`
- `specs/analytics.md`
- `specs/strategy-lab.md`
- `specs/system.md`
- `specs/ui-components.md`
- `specs/ui-pages.md`

> **Rule:**  
> V2 dashboard surfaces must respect these specs unless a deviation is recorded in `PRISM_APEX_V2_BUILD_AUDIT.md`.

---

## 7.3 Engine / Strategy Docs

- `PRISM_APEX_VWAP_FT_DESIGN.md`
- `PRISM_APEX_ORR_V3_DESIGN.md`
- `PRISM_APEX_OSB_DESIGN.md`
- Strategy specs mapping directly to `@prism-apex/strategies` implementations.
8. API Service (apps/api) — Routes & Jobs
md
Copy code
# 8. API Service (apps/api)

The API is the **canonical backend** for:

- Worklist feed
- Tickets feed
- Analytics feed
- Session metrics
- Alerts
- System telemetry
- Engine coordination
- Strategy orchestration
- Ticketizer integration

> **Status:** CANONICAL

Every dashboard surface uses these routes.

---

## 8.1 Fastify App Entrypoints

- `apps/api/src/index.ts` — Fastify bootstrap
- `apps/api/src/config/env.ts`
- `apps/api/src/config/session-flags.ts`

---

## 8.2 Canonical Routes (Full List)

These routes form the **official API** consumed by the dashboard and internal tools.

### **Core Data**
- `/tickets`
- `/tickets.debug`
- `/ticket.complete`
- `/ticketQualityFilters`
- `/analytics`
- `/session-metrics`
- `/worklist`
- `/symbols` & `/symbols.v2`
- `/market`

### **System & Operations**
- `/status`
- `/opsStatus`
- `/ready`
- `/version`
- `/health`
- `/health.yahoo`
- `/reports.dashboard`

### **Strategy / Risk / Engine**
- `/strategies.config`
- `/strategy-config`
- `/strategy-engine`
- `/signals`
- `/operator-risk`
- `/operator-config`
- `/operator-actions`
- `/operatorSizing`
- `/dto/*` (data transfer object helpers)

### **Telemetry & Alerts**
- `/system.alerts`
- `/system.jobs`
- `/system.telemetry`
- `/telemetry`
- `/alerts/peek` / `/alerts/ack`

> **Rule:**  
> No page in the dashboard may invent its own API endpoints.  
> Everything must map to one of these canonical ones.

---

## 8.3 API Jobs (Engine / Ingest / Metrics / Ticketizer)

**All jobs under `apps/api/src/jobs` are CANONICAL unless marked TEST_FIXTURE.**

### **Session Metrics Jobs**
- `session-metrics/batch.ts`
- `session-metrics/runtime.ts`
- `session-metrics/populate-session-metrics.ts`
- `session-metrics/service.ts`
- Golden day fixtures & replay pipeline (TEST_FIXTURE)

### **Strategy / Ticketization Jobs**
- `strategies.ts`
- `engineRunJob.ts`
- `engineReplayRunner.ts`
- `ticketizer.ts`

### **Ingest / Feed Jobs**
- `feed.ts`
- `missingBrackets.ts`

### **Operational Jobs**
- `dailyLoss.ts`
- `eodFlat.ts`
- `consistency.ts`
- `telemetry.ts`

### **Job Orchestration**
- `jobManager.ts`
- `scheduler.ts`
- `manager.ts`

> **Rule:**  
> All canonical data consumed by dashboard pages (tickets, metrics, analytics, statuses) ultimately come from these jobs.
9. Config, Infra & Operational Artifacts
md
Copy code
# 9. Config & Infra

These define the runtime environment for deployment and local development.

---

## 9.1 Config (`config/`)

### **CANONICAL runtime configuration**

- `contracts-spec.json` — Definition of supported products/instruments  
- `products.json` — Product metadata  
- `roll.json` — Futures roll schedules  
- `sessions.json` — Trading session calendar

All ingest + engine + metrics logic downstream depends on these.

---

## 9.2 Apex Rules

- `apex/rules.json` — Apex account rules for guardrail engine  

Consumed by:

- `@prism-apex/rules-apex`
- Ticketizer jobs
- Risk-audit logs
- Operator-risk API routes

---

## 9.3 Infrastructure (`infra/`)

### Deployment & runtime

- `nginx/prism-apex.conf.example` — Nginx proxy config  
- `systemd/prism-apex.service` — Systemd unit  
- `systemd/prism-apex.env.example` — Env template  
- `.env.prod.example` — Production `.env` template  
- `docker-compose.v2.local.yml` / `.server.yml` — Canonical container stacks (API + dashboard + Postgres)  
- `deploy/nginx.conf`, `deploy/db/*.sql` — packaged configs for edge proxies and maintenance jobs  

---

## 9.4 Root Documentation & Runbooks

- `README.md`
- `OPERATIONS.md`
- `AGENTS.md`
- `TECH-SPEC.md`
- `PORTS.md`
- `TESTING.md`
- `INTEGRATIONS-TRADOVATE.md`  
- `CHANGELOG.md`
- `VERSION`

These are operationally required.

# 10. Mocks, Fixtures & Stub Servers

Mocks exist ONLY for UI prototyping and test determinism.
They are *not* canonical runtime sources.

> **Status:** MOCK

---

## 10.1 Top-Level Mock Servers

These provide HTTP demo endpoints for UI exploration without a backend:

- `analytics-mock/`
- `markets-mock/`
- `strategy-lab-mock/`
- `system-mock/`
- `tickets-mock/`
- `worklist-mock/`

Each contains:

- `server.js` – lightweight Express/HTTP server
- `index.html` – simple dashboard wrapper
- Sample JSON responses

**Rules:**
- Must never be used for production logic.
- Must never be imported into canonical V2 pages.
- Acceptable for manual UI demos and design validation only.

---

## 10.2 Dashboard Mock Generators (`*.sh`)

All scripts under root:

- `generate_worklist_mock.sh`
- `generate_worklist_market_a2_mock.sh`
- `generate_analytics_mock.sh`
- `generate_markets_mock.sh`
- `generate_tickets_mock.sh`
- `generate_system_mock.sh`
- `generate_strategy_lab_mock.sh`
- `generate_strategy_lab_a2_mock.sh`
- `generate_prism_apex_full_mock.sh`
- `generate_prism_apex_spec_mock.sh`
- `generate_prism_apex_a2_mock.sh`
- `generate_prism_a2_three_view_mock.sh`

**Rules:**
- These scripts output example mocks only.
- Do not treat mock shapes as canonical — canonical shapes live in:
  - `@prism-apex/shared`
  - `/apps/api/src/routes/*`
  - `/apps/api/src/dto/*`

---

## 10.3 Test Fixtures

> **Status:** TEST_FIXTURE — Not runtime logic

Examples:

- `apps/api/src/jobs/session-metrics/golden-days/*.json`
- `packages/shared/src/tickets.fixtures.ts`
- Dashboard test fixtures under:
  - `apps/dashboard/src/__tests__/`
- Package-level tests:
  - `packages/*/tests`
  - `packages/*/__tests__`

**Rules:**
- Fixtures lock expected behaviour.
- When canonical shapes change, fixtures **must** be updated accordingly.
11. Legacy & Backups
md
Copy code
# 11. Legacy, Deprecated & Backup Files

These files exist for historical reference only.

> **Status:** LEGACY — Do not extend or modify except during cleanup.

---

## 11.1 Dashboard Legacy Pages

These must NOT be used for V2 development:

- `apps/dashboard/src/pages/Worklist.tsx`
- `Worklist.tsx.bk.*` (timestamped variants)
- `Worklist.tsx.bak2`
- `WorklistV2.legacy.tsx`
- Old prototype pages:
  - `DemoPnL.tsx`
  - `Downloads.tsx`
  - `Placeholder.tsx`
  - `Positions.tsx` (pre-V2 rewrite)
  - `Reports.tsx`
  - `StrategyConfig.tsx`

---

## 11.2 Legacy Docs

Files with `.prev` suffix, such as:

- `docs/PRISM_APEX_DELIVERY_PLAN.md.prev`
- `docs/PRISM_APEX_STATE.md.prev`

These should not be used as authoritative guidance.

---

## 11.3 Legacy Mocks

Any non-V2 mock server prior to the A2 redesign is considered obsolete.
12. EPIC ↔ Code Anchor Crosswalk
(The complete mapping for engineers and AI assistants)
md
Copy code
# 12. EPIC ↔ Code Anchor Mapping

This turns the entire monorepo into an EPIC-indexed map.

> **Status:** CANONICAL  
> This crosswalk must be updated any time a route, job, or surface changes.

---

## EPIC 0 — Ingest & Bar Store

**Code Anchors:**

- `apps/ingest/src/backfill.ts`
- `apps/ingest/src/gapfill.ts`
- `apps/api/src/jobs/feed.ts`
- `packages/data-yahoo/*`

---

## EPIC 1 — Session Metrics

**Code Anchors:**

- `apps/api/src/jobs/session-metrics/*`
- `apps/api/src/routes/session-metrics.ts`
- `apps/api/src/routes/metrics.ts`
- `packages/metrics/*`

---

## EPIC 2 — Strategies & Ticketizer

**Code Anchors:**

- `packages/strategies/*`
- `packages/signals/*`
- `packages/ticketizer/*`
- `apps/api/src/jobs/strategies.ts`
- `apps/api/src/jobs/engineRunJob.ts`
- `apps/api/src/jobs/engineReplayRunner.ts`
- `apps/api/src/jobs/ticketizer.ts`
- `apps/api/src/store/tickets.ts`

---

## EPIC 3 — Risk Engine & Guardrails

**Code Anchors:**

- `packages/rules-apex/*`
- `packages/rules/*`
- `packages/risk-state/*`
- `apps/api/src/routes/dto/operatorRisk.ts`
- `apps/api/src/routes/dto/riskDecisionDto.ts`
- `apps/api/src/store/riskAuditLog.ts`

---

## EPIC 4 — Worklist V2

**Code Anchors:**

- `apps/api/src/routes/tickets.ts` (worklist queries)
- `apps/api/src/routes/ticketQualityFilters.ts`
- `apps/dashboard/src/pages/WorklistV2.tsx`
- `apps/dashboard/src/hooks/useWorklistTickets.ts`
- `apps/dashboard/src/ui/DataTable.tsx`
- `apps/dashboard/src/ui/FiltersBar.tsx`
- `apps/dashboard/src/ui/Card.tsx`
- `apps/dashboard/src/ui/Badge.tsx`
- `apps/dashboard/src/lib/api.ts`
- `worklist-mock/` (**MOCK fallback only**)

---

## EPIC 5 — Tickets / Audit Trail

**Code Anchors:**

- `apps/api/src/routes/tickets.ts`
- `apps/dashboard/src/pages/Tickets.tsx`
- `apps/dashboard/src/lib/api.ts` (`fetchTickets`, mapping)
- `apps/dashboard/src/hooks/useTicketsHistory.ts`

---

## EPIC 6 — Markets & Overlays

**Code Anchors:**

- `apps/api/src/routes/session-metrics.ts`
- `apps/api/src/routes/metrics.ts`
- `apps/api/src/routes/symbols.ts` / `symbols.v2.ts`
- `apps/dashboard/src/pages/MarketData.tsx`

---

## EPIC 7 — Reports / Analytics

**Code Anchors:**

- `apps/api/src/routes/analytics.ts`
- `apps/api/src/routes/export.ts`
- `apps/dashboard/src/pages/Analytics.tsx`
- `apps/dashboard/src/lib/api.ts` (`fetchAnalyticsCanonicalTickets`, `fetchSessionMetricsBatch`)

---

## EPIC 8 — Strategy Lab

**Code Anchors:**

- `apps/api/src/routes/strategy-config.ts`
- `apps/api/src/routes/strategies.config.ts`
- `apps/dashboard/src/pages/StrategyLab.tsx`

---

## EPIC 9 — System Health / Status

**Code Anchors:**

- `apps/api/src/routes/status.ts`
- `apps/api/src/routes/system.alerts.ts`
- `apps/api/src/routes/system.jobs.ts`
- `apps/api/src/routes/system.telemetry.ts`
- `apps/dashboard/src/pages/Status.tsx`
- `apps/dashboard/src/components/SystemStatus.tsx`

---

## EPIC 10 — V2 Polish & Cleanup

**Code Anchors:**

- `docs/REPO_INDEX_V2.md`
- `docs/UPGRADE_DASHBOARD.md`
- Legacy / backup pruning
- Removal of mock servers after V2 stabilisation
13. Maintenance Rules
md
Copy code
# 13. Maintenance Rules

These rules are strict. Violating them destabilises the system.

---

## 13.1 Canonical-Only Rule

Any change to:

- A dashboard page  
- An API route  
- A canonical DTO  
- A job  

**must** be reflected in:

- This file (`REPO_INDEX_V2.md`)
- `UPGRADE_DASHBOARD.md` (for epic delivery log)
- Relevant UI/engine specs

---

## 13.2 Mock Isolation Rule

Mocks must never drive real functionality.

- If a page requires data but engine/API is not ready:
  - Use canonical fallback mocks (`lib/*Mock.ts`), not top-level mock servers.

---

## 13.3 Test Preservation Rule

All existing Vitest files must stay green.

If behaviour changes:

- Update tests accordingly
- Or add new tests

---

## 13.4 DTO Consistency Rule

DTO contracts live in:

- `@prism-apex/shared`
- `apps/api/src/dto/*`

These are the ONLY sources of truth.

---

## 13.5 Page Pattern Rule (A3 Pattern)

Every dashboard page must follow:

1. Global shell (`ExecutionShell`)
2. Page header
3. Filters bar
4. KPI strip (where applicable)
5. Main data table or panel
6. Detail panel

All using `ui/` primitives.

---

## 13.6 Documentation Sync Rule

Any commit that changes architecture or behaviour must update both this file and `docs/UPGRADE_DASHBOARD.md`. Keep them in the same PR.
14. Final Notes for Future Engineers
md
Copy code
# 14. Final Notes for Engineers & AI Assistants

- Do not reinvent data flows.
- Always inspect the existing file before modifying.
- Confirm routes & DTOs via Codex Terminal (`grep`, `rg`, `fd`, etc.).
- Use shared UI components — do not create bespoke variations.
- Keep A2 tokens consistent across pages.
- Prefer refactor over wholesale rewrite.
- Safety > cleverness.
- When unsure: consult the EPIC ↔ Code Anchor section.

This file is the source of truth.

# 15. Canonicality Audit (Cross-Check Against Canonical Surfaces)

This section confirms the rewritten REPO_INDEX_V2.md is internally consistent and aligned with:

- Current canonical code under `apps/api` and `apps/dashboard`
- Canonical shared types in `@prism-apex/shared`

This audit is maintained by the expert panel.

---

## 15.1 Canonical Surfaces

**Canonical dashboard pages (7 total):**

| Surface | File | Canonical | Notes |
|--------|------|-----------|-------|
| Worklist V2 | `pages/WorklistV2.tsx` | ✅ | Correctly wired to `/api/worklist` with fallback. |
| Tickets | `pages/Tickets.tsx` | ✅ | Pure A3 cockpit using canonical ticket feed. |
| Market Data | `pages/MarketData.tsx` | ✅ | Uses `/api/market/{symbols,sessions}` aliases + session metrics batch. |
| Analytics | `pages/Analytics.tsx` | ✅ | Uses canonical analytics ticket feed + session overlays. |
| Strategy Lab | `pages/StrategyLab.tsx` | ✅ | Lab semantics over canonical analytics feed. |
| Status | `pages/Status.tsx` | ✅ | System telemetry + jobs + alerts via unified view. |
| Alerts | `pages/Alerts.tsx` | ✅ | Severity/state filtering, canonical future extension expected. |
| Positions | `pages/Positions.tsx` | ⚠ Placeholder | Currently synthetic. Canonical FE surface, non-canonical data. |

**Conclusion:**  
All canonical dashboard pages enumerated above are correctly represented in the repo index.

---

## 15.2 Canonical Data Sources

Every canonical dashboard surface must rely on canonical API routes.

Cross-check:

### ✔ Worklist → `/api/worklist`
Matches repo code. Fallback mock allowed.

### ✔ Tickets → `/api/tickets`
Matches.

### ✔ Analytics → `/api/tickets` with analytics filters
Matches.

### ✔ Session Metrics → `/api/session-metrics`
Matches.

### ✔ Market Data → `/api/session-metrics`, `/api/symbols`
Matches.

### ✔ Status → `/api/status`, `/api/system.jobs`, `/api/system.alerts`, `/api/system.telemetry`
Matches dashboard implementation.

### ✔ Alerts → `/api/system.alerts`
Matches.

### ✔ Positions → (Not implemented canonically yet)
Repo index flags this correctly as non-canonical.

**Conclusion:**  
Canonicality is preserved—no contradiction exists between the plan and implementation.

---

## 15.3 Canonical DTO Verification

**Canonical DTOs live in:**

- `@prism-apex/shared/src/contracts.ts`
- `apps/api/src/dto/*`  
- `apps/api/src/routes/dto/*`

Cross-check:

| DTO | Status | Notes |
|------|---------|--------|
| `CanonicalTicket` | Canonical | Used by Worklist, Tickets, Analytics. |
| `CanonicalApprovedTicketView` | Canonical | Used for ticketization and audit surfaces. |
| `SessionMetricsDto` | Canonical | Used by Worklist, Analytics, Market Data. |
| `RiskDecisionDto` | Canonical | Used in API risk surfaces. |
| Strategy config DTOs | Canonical | Used in Strategy Lab flows. |

**Conclusion:**  
All referenced DTOs in the repo index correspond to actual files and are canonical.

---

## 15.4 Mock Isolation Audit

All mock servers under root:

- Are correctly flagged as MOCK.
- Are not used by canonical pages.
- Are only referenced in Worklist fallback mocks (correct behaviour).

**Conclusion:**  
Mocks are safely isolated and documented; no contamination risk.

---

## 15.5 Legacy Isolation Audit

The following must *not* be used in V2:

- old Worklist variants  
- DemoPnL, Reports, StrategyConfig  
- `.bak` and `.bk.*` files  
- legacy placeholders  

Repo index correctly identifies every legacy file and marks scope restrictions.

**Conclusion:**  
Legacy boundaries are documented and enforced.

## 15.6 Contract Telemetry (Epic 1)

- `apps/dashboard/src/lib/contractTelemetry.ts` now emits page-load markers + contract-error breadcrumbs for every dashboard surface.
- `fetchJson` in `apps/dashboard/src/lib/apiBase.ts` calls that logger whenever a non-2xx response is returned, so Status/Alerts/etc. no longer fail silently.
- Page components (Worklist, Tickets, MarketData, Analytics, StrategyLab, Status, Alerts, Positions) all register a `logPageLoad('<PageName>')` inside their initial `useEffect`, and catch blocks call `logContractError` with the offending endpoint.
- MarketData, Worklist, and other pages also report ingest failures by pointing the telemetry logger at `/api/health/yahoo`.

**Result:**  
Contract errors are observable without opening DevTools, satisfying ST-007 of Epic 1.

---

# 16. Forward-Looking Map (Where We Are vs. Where We Must Go)

This provides the “true-status + target-state” view the expert panel recommends.

---

## 16.1 Current State (Truthful Snapshot)

- **All V2 dashboards render and pass tests.**
- **Worklist V2** is production-grade in FE structure and API alignment.
- **Tickets** is stable and canonical.
- **Analytics** and **Markets** have fully working first-pass implementations.
- **Strategy Lab** is minimally correct but not feature-complete.
- **Status/Alerts** provide meaningful synthetic telemetry & alerting.
- **Positions** is **synthetic only** — canonical backend data does not yet exist.

---

## 16.2 Required Destination (Target A3 System)

The expert panel defines the target as:

1. **All A3 pages fully wired to canonical engine/session data.**
2. **Charts and richer metrics added to Analytics and Markets**, once stable.
3. **Strategy Lab upgraded** to provide true lab/live drift comparisons.
4. **Positions** replaced with canonical live broker positions + PnL logic.
5. **All mocks deleted** after full canonical wiring is completed.
6. **Documentation, repo index, and tests** fully aligned as the system evolves.

This section is consistent with V2 Dashboard Plan EPICs.

---

# 17. Appendix A — Reference Table of Canonical Modules

A high-speed lookup for any engineer or AI assistant.

```md
| Domain | Canonical Modules |
|--------|-------------------|
| Tickets | `/apps/api/src/routes/tickets.ts`, `@prism-apex/shared/src/contracts.ts` |
| Worklist | `/apps/api/src/routes/tickets.ts` (worklist subset), `useWorklistTickets.ts` |
| Analytics | `/apps/api/src/routes/analytics.ts`, `fetchAnalyticsCanonicalTickets` |
| Session Metrics | `/apps/api/src/routes/session-metrics.ts`, batch helpers |
| Risk Engine | `packages/rules-apex/*`, `/apps/api/src/store/riskAuditLog.ts` |
| Strategies | `packages/strategies/*`, `packages/signals/*`, ticketizer |
| Market Data | session metrics + symbol metadata routes |
| Status | `/api/status`, `/api/system.alerts`, `/api/system.jobs`, telemetry |
| Alerts | `/api/system.alerts` |
18. Appendix B — Rules for AI Assistants
This ensures future sessions behave correctly:

md
Copy code
# AI Assistant Operational Rules

1. **Never propose rewrites where refactors suffice.**
2. **Always request file content via Codex Terminal search before generating replacements.**
3. **Always align with:**
   - `REPO_INDEX_V2.md`
   - `UPGRADE_DASHBOARD.md`
4. **When adding new behaviour:**
   - Confirm canonical API surfaces.
   - Update tests or write new ones.
   - Update `REPO_INDEX_V2.md` and `UPGRADE_DASHBOARD.md`.
5. **Mocks must not be used for runtime logic.**
6. **Always show the path to a file you reference.**
7. **Never invent new DTO fields — confirm in `@prism-apex/shared`.**
8. **If uncertain, escalate to “expert panel reasoning” before output.**
19. Appendix C — Change Tracking & Versioning
md
Copy code
# Change Tracking

This file must include:

- Date of canonical update
- Summary of changes
- Items removed or deprecated
- EPICs affected
- Tests affected

Every PR modifying canonical surfaces must:

- Update this index
- Update the dashboard plan
- Ensure tests remain green
20. Closing Statement
md
Copy code
# End of REPO_INDEX_V2.md

This index is now canonical and aligned with all V2 surfaces, DTOs, API routes, and EPICs.  
Any change to runtime behaviour, UI surfaces, or data flows must update this file.

<!-- P1-A1 planner reject counts -->
### P1 System Records: Planner Reject Counts (engineering-only)

- Migration: `deploy/sql/033_planner_reject_counts.sql`
- Vocab: `apps/api/src/system-records/plannerRejectVocab.ts` (canonical planner keys + reason buckets)
- Store: `apps/api/src/store/plannerRejectCounts.ts` (atomic UPSERT increments + list helper)
- Recorder: `apps/api/src/system-records/plannerRejectRecorder.ts` (best-effort normalization + increment wrapper)
- Runtime hooks:
  - `apps/api/src/jobs/engineRunJob.ts` (PLANNER stage rollup counters)
  - `apps/api/src/services/strategy-engine/safetyEnvelope.ts` (SAFETY stage drops)
  - `apps/api/src/jobs/ticketizer.ts` (TICKETIZER stage drops)

Notes:
- Captures both `requested_planner` (what was asked) and `rejecting_planner` (whose candidate was dropped).
- This table stores aggregates (counters), not append-only per-run forensic rows.



## Canonical local 5180 ingress

### Local dev: jobs always-on + DB migrations automatic


### Manual-only: gapfill-once
- `gapfill-once` is **manual** (not always-on). It is included behind the `manual` profile to prevent accidental replays.
- Run it explicitly when you want a one-off backfill:
  - `docker compose -f docker-compose.v2.local.yml — Canonical local container stack (API + dashboard + Postgres). Legacy manifests are quarantined under ops/legacy-compose/. 
**Single entrypoint:** the only supported browser URL is **http://localhost:5180** (ingress).  
**Canonical compose:** `docker-compose.v2.local.yml` only.

What runs on every local deploy:

- Core: `db` → `migrate` → `api` + `dashboard-full` + `ingress`
- Jobs (always-on): `tickets-cron`, `gapfill-cron`, `ingress-yahoo`, `jobs-seed`

Hard guarantees:

- **Only** ingress publishes a host port (**5180:80**). API, DB, dashboard, and jobs remain internal.
- `migrate` applies `deploy/sql/*.sql` in order on startup.
- API and job services are gated on **db healthy** + **migrate completed successfully**.

Operational commands:

```bash
# Canonical start/rebuild (includes jobs + migrate)
docker compose -f docker-compose.v2.local.yml — Canonical local container stack (API + dashboard + Postgres). Legacy manifests are quarantined under ops/legacy-compose/. 

# Guard contract (must stay green)
bash tools/codex/guard_ports_local.sh

# Health proofs (through ingress only)
curl -fsS http://127.0.0.1:5180/ui-meta
curl -fsS http://127.0.0.1:5180/health
```

Notes:

gapfill-once is manual-only (run explicitly) unless we decide otherwise, because it can reprocess historical data.

Local development uses one entrypoint: http://localhost:5180. UI, API, and metadata all run through that same host port (dashboard-full + ingress) and guard_ports_local.sh enforces it. Avoid any guidance that points people to 3000/8080/8090/55433 or manual reverse proxies.

## P1-4 — Shadow Outcomes (always-on, async)

**Goal:** For every ticket we generate (OPEN and CLOSED), compute minimal “would it have hit stop/target?” outcomes from stored 1m bars.

**Inputs**
- Tickets: `public.tickets` (anchor uses `created_at_utc`)
- Bars: `public.bars_1m` (1-minute OHLC, use high/low for touches)

**Outputs**
- Table: `public.shadow_outcomes` (PK: `ticket_id + horizon_minutes + variant`)
- Variants: `RAW`, `BE_1R`
- Horizons (default): `60m`, `240m`

**Rules (high level)**
- Window: `[anchor_ts_utc, anchor_ts_utc + horizon]` where `anchor_ts_utc = tickets.created_at_utc`.
- Touch logic: within the window, STOP is touched if bar low/high crosses stop (direction-aware), TARGET is touched if bar high/low crosses target.
- Tie-break: if both touch within the same minute, use a deterministic ordering (prefer the first timestamped touch; if still ambiguous, record meta and mark outcome conservatively).
- `BE_1R`: if price reaches +1R first, move the stop to entry and then evaluate remaining window.
- Insufficient data: if bars missing for the window, record `INSUFFICIENT_DATA` with meta for gaps.

**Always-on compute**
- Service: `shadow-outcomes-cron` runs on every deploy (no manual step) and is gated on:
  - `db` healthy
  - `migrate` completed successfully
- It is idempotent (upserts) and bounded per cycle.

**Read APIs**
- `GET /api/system-records/shadow-outcomes/:ticketId` — all rows for one ticket
- Optional bounded aggregate:
  - `GET /api/system-records/shadow-outcomes?sessionDate=YYYY-MM-DD&strategy=ORR` (bounded response)

**Operational note**
Shadow outcomes are *hypothetical projections* over the bar stream. CLOSED tickets allow later comparison to realized outcomes; OPEN tickets allow historical analysis of “what would have happened next”.

## 2026-01-04 — Tickets lifecycle + Ticketizer rejects ledger

This release adds an operator-grade ticket history model:

- Ticketizer rejects are now persisted forward into a dedicated ledger:
  - Migration: deploy/sql/036_ticket_candidates.sql
  - Store: apps/api/src/store/ticketCandidates.ts
  - Route: apps/api/src/routes/ticketCandidates.ts
  - Endpoint: /api/ticket-candidates

- A merged lifecycle endpoint is now the canonical feed for ticket history UI:
  - Route: apps/api/src/routes/ticketsLifecycle.ts
  - Endpoint: /api/tickets-lifecycle
  - Merges accepted lifecycle tickets (tickets table) + Ticketizer rejects (ticket_candidates)
  - Supports outcome toggle (ACCEPTED vs REJECTED)

- /api/tickets totals are now invariant across limit values:
  - Route: apps/api/src/routes/tickets.ts
  - Store support: apps/api/src/store/tickets.ts

- Tickets dashboard page moved to the lifecycle feed:
  - apps/dashboard/src/pages/Tickets.tsx
  - Adds Rejected operator toggle and rejection drilldown

- Ingress DNS hardening prevents SPA 502s after dashboard recreation:
  - deploy/ingress/local/default.conf
  - Adds Docker DNS resolver + variable upstream proxy_pass

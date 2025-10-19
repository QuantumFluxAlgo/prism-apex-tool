# Agents & Automation

What’s automated vs operator-controlled.

> This page was auto-generated from existing repo docs. Check TODO/TBD markers.

## Boundaries
- Operator copies tickets into Tradovate (manual OCO)
- No API order placement or liquidation

## Workflows
- Signals → Orchestrator → Guardrails → Ticket issuance → Operator OCO entry

## Safety
- Daily loss halts (Apex)
- Idempotent signal handling

---
**From:** `PROJECT.md`

# Prism-Apex: Operator-Assisted Trading (Project Overview)

> **Non-negotiable:** Prism-Apex NEVER places orders automatically. It produces **tickets only**. A human operator enters OCO brackets in Tradovate. No exceptions.

## Mission
Operator-assisted trading for Apex Trader Funding accounts on Tradovate:
- **Prism-Apex is the brain** (signals, guardrails, tickets, telemetry).
- **A human is the hands** (manual order entry into Tradovate using OCO).
- Strict **Apex guardrails** enforced in code; violations result in **ticket rejection** (no orders sent).

## Runtime Model (Docker-only)
Local/staging uses **Docker Compose** only. No host Node/Python needed.
Public API (read-only for operators):
- `GET /health`
- `GET /ready`
- `GET /openapi.json`
- `GET /version`

## Dataflow (High-Level)


Tradovate Market Data WS (live)
│
├─▶ Bar/VWAP/ATR series
│
├─▶ Strategy Orchestrator
│ ├─ VWAP First-Touch
│ └─ Opening-Session Breakout
│
├─▶ Apex Guardrails & Sizing (rules-apex)
│
└─▶ Ticket Store (JSONL, per-day)
└─ Operator copies ticket into Tradovate as OCO


### In-Scope Strategies (MVP)
- **VWAP First-Touch**  
  Code: `packages/strategies/src/vwapFirstTouch.ts`  
  Config: `configs/strategies/vwap-first-touch.json`
- **Opening-Session Breakout (OSB)**  
  Code: `packages/strategies/src/osbBreakout.ts`  
  Config: `configs/strategies/opening-session-breakout.json`

Strategy toggling/scheduling is allowed via config; new strategies can be added later.

## Apex Guardrails (Enforced)
- **Stop required** (funded or if configured) and on **correct side**.
- **Risk:Reward clamp** to policy; reject `<min` or `>max`.
- **Half-size until buffer cleared**; **anti-windfall sizing**.
- **Trailing drawdown awareness** baked into acceptance/sizing.
- **EOD flat window suppression** (see below).
- **Consistency tracking** with optional operator notes.
- Enforcement level is configurable (see `packages/rules-apex`, `configs/rules/apex.json`, `apex/rules.json`).

## Tickets (Canonical)
Each accepted idea is written as a **ticket** the operator can copy into Tradovate.

Shape:
```json
{
  "symbol": "MESZ5",
  "side": "BUY|SELL",
  "entry": 5550.25,
  "stop": 5544.25,
  "target": 5560.25,
  "qty": 2,
  "accountId": "APEX-123456",
  "timestampUtc": "2025-09-09T14:31:22Z",
  "meta": {
    "strategy": "vwap-first-touch",
    "rr": 1.5,
    "guardrails": ["stopSideOk","rrInRange","sizeHalfUntilBuffer"],
    "sizingHint": "half-size",
    "consistencyNotes": "FT1 after pullback"
  },
  "accepted": true,
  "reasons": []
}
```

Tickets are persisted to per-day JSONL files and exposed via:

GET /tickets?date=YYYY-MM-DD

GET /export/tickets?date=YYYY-MM-DD (CSV)

See details in docs/tickets.md.

EOD Behavior

Strategies automatically suppress new tickets inside the EOD flat window (config-driven buffer before session close).

Dashboard shows an EOD countdown to flat window start.

Any ticket evaluated inside suppression returns accepted=false with reason EOD_WINDOW.

Operator Console

See docs/operator-console.md for the exact copy format, OCO mapping in Tradovate, fanout to multiple accounts, rejection codes, and the EOD countdown behavior.

Quality & CI (unchanged)

Node: pnpm lint && pnpm typecheck && pnpm test

Python: ruff --fix && black --check && pytest -q

Depcheck: pnpm run scan:dead

JSON logs; no PII; CORS allow-list via env; health/readiness/metrics present.



---
**From:** `README-dev.md`


Developer Guide
Ports at a glance

API (prod-like via compose): 3000

Dashboard-Lite (compose): 5178

Full Dashboard (compose): 8080

API (dev script, if provided): 8000 (hot-reload)

Dev workflow (hot reload, if scripts exist)
./dev_api.sh              # API on :8000 (Fastify watch) — optional
pnpm --filter @prism-apex/dashboard-lite dev   # Vite dev UI on :5173 (if applicable)

Prod-like workflow (Docker)
make up
make up-dev

Sanity checks
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/ready

Notes

This repo may contain pre-existing lint/typecheck/test failures; CI runs are non-blocking except for the no-order-API guard, which is hard-fail by design.

If Docker is not installed locally, compose builds will be skipped. Install Docker to run containers.

Absolute rule

The codebase must never introduce broker order placement (tickets-only). CI enforces this at PR time.

### API-focused commands
- `pnpm build:api` — build only the API workspace and its deps
- `pnpm typecheck:api` — typecheck API scope
- `pnpm test:api` — run API tests only

### API bundling
- Runtime artifact is **CommonJS**: `apps/api/dist/server.cjs` (bundled by **tsup**).
- Typechecking remains via `tsc --noEmit` using `tsconfig.build.json`.
- If your entry file is not `src/server.ts`, update `apps/api/tsup.config.ts`.

### Path aliases
- Source of truth: `tsconfig.paths.json`. `tsconfig.base.json` extends it so every workspace inherits the same `paths` map.
- Use the `@prism-apex/<workspace>` pattern when importing. Examples:
  - `@prism-apex/app-api/*` → `apps/api/src/*`
  - `@prism-apex/rules-apex/*` → `packages/rules-apex/src/*`
- Vitest pulls in the map via the `vite-tsconfig-paths` plugin (see the shared `vitest.config.ts` family), and Node-based setups/scripts load `tsconfig-paths/register` (e.g., `apps/api/test.setup.ts`).
- Update `tsconfig.paths.json` whenever folders move; the rest follows automatically.

## Ports & Env
See [docs/ports-and-env.md](docs/ports-and-env.md) for guidance on API and dashboard port variables.



---
**From:** `apex/platforms/README.md`

# Apex Platform Options

Overview of supported platforms: Rithmic/NinjaTrader, Tradovate/TradingView, WealthCharts.

TODO: Add operator guidance chart.

## Links

- [Rithmic + NinjaTrader](./rithmic.md)
- [Tradovate + TradingView](./tradovate.md)
- [WealthCharts](./wealthcharts.md)



---
**From:** `apex/platforms/rithmic.md`

# Rithmic + NinjaTrader

**Purpose:** Document setup and caveats for Rithmic accounts.

## Setup Steps

- TODO: Provide step-by-step account linking and platform install instructions.

## Windows Requirement

- Platform requires Windows environment.
- Compliance Note: Unsupported OS use may breach terms.

## Technical Difficulty

- Rated 7/10.
- Compliance Note: Operators should verify user competency before recommendation.

## Pros

- Low latency execution.
- Flexible automation support.
- Compliance Note: Automation must log orders for audit.

## Cons

- Windows-only; complex initial configuration; no mobile support.
- Compliance Note: Document exceptions for Mac users.

## Watchouts

- Server selection impacts latency.
- Concurrent logins restricted.
- Data status must be real-time.
- Compliance Note: Monitor for unauthorized API connections.

TODO: Add screenshots of NinjaTrader config.



---
**From:** `apex/platforms/wealthcharts.md`

# WealthCharts

**Purpose:** Document setup and caveats for WealthCharts accounts.

## Setup Steps

- TODO: Provide account linking and layout selection steps.

## Technical Difficulty

- Rated 4/10.
- Compliance Note: Provide training on platform-specific quirks.

## Pros

- Pre-made layouts and guided workflows.
- Built-in liquidation indicator.
- Compliance Note: Ensure indicator visibility for all traders.

## Cons

- Closed ecosystem with limited integrations.
- Potential Windows-only risk depending on components.
- Compliance Note: Review update policies for security.

## Watchouts

- Platform updates may be mandatory.
- Automation support is limited.
- Compliance Note: Document any external tool connections.

TODO: Add Apex-prebuilt layout diagram.



---
**From:** `docs/ARCHITECTURE_OVERVIEW.md`

# Prism-Apex Architecture Overview (Tickets-Only Brain)

Prism-Apex is the **brain** for operator-assisted trading on Apex Trader Funding accounts. We generate levels, guardrails, and tickets so a human operator can execute manually inside Tradovate. The platform never places an order or liquidates via API.

---

## Core Flow (Yahoo → DB → ORR → Tickets → Dashboard)
1. **Yahoo delayed feed → DB** — background jobs pull ≈15-minute delayed data from the Yahoo Finance API and load it into Postgres.
2. **Derived series in DB** — ORR and its namesake strategies read bar/VWAP/ATR series stored in the DB (no direct market-side API required).
3. **Guardrails & sizing** — logic in `packages/rules` / `packages/rules-apex` plus configs under `configs/` enforce Apex program rules before a ticket is emitted.
4. **Ticket emission** — strategies append structured tickets to `tickets/*.jsonl`; these JSONL files are the operator’s source of truth.
5. **Dashboard visualisation** — `apps/dashboard*` projects read tickets and telemetry so operators can review intent.
6. **Manual execution** — the operator copies the ticket into Tradovate as an OCO. Prism-Apex never places orders or liquidates via API.

---

## Repository Landmarks
- `apps/api/` — Node/TypeScript API serving telemetry, health, and ticket downloads.
- `apps/dashboard*/` — Vite/React dashboards for operators.
- `packages/` — Shared runtime libraries (indicators, strategies, guardrails, telemetry).
- `scripts/` — Operational tooling (`scan_repo.sh`, `cleanup_repo.sh`, etc.).
- `configs/` & `config/` — Strategy toggles, environment templates, guardrail settings.
- `tickets/` — Sacred JSONL ticket log. Archive, never delete.
- `docs/` — Architecture notes, cleanup/report artifacts, runbooks.
- `docker-compose*.yml` / `Dockerfile*` — Docker-first runtime definition. Keep docs aligned with exposed ports.

---

## Guardrails & Compliance Reminders
- **Absolutely no** automated order placement or emergency liquidation is implemented here.
- All automation stops at ticket generation. Operators remain the hands.
- Cleanup scripts protect source/config/migration directories, `.env*`, and tickets.

---

## Onboarding Checklist
1. Read `docs/CODEBASE_OVERVIEW.md` and this overview to understand the operator-assisted workflow.
2. Review `docs/REPO_SCAN_REPORT.md` plus `docs/REPO_SCAN_QUESTIONS.md` before approving any cleanup.
3. Keep local Node on 20.x LTS; use `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm run scan:dead` for signal.
4. Run `scripts/cleanup_repo.sh` periodically to remove clutter (dry-run first if unsure).
5. When adding new strategies or configs, document which files are canonical for operators.

Staying within these boundaries keeps Prism-Apex compliant while giving operators the clarity they need.



---
**From:** `docs/CI.md`

# CI Guardrails

- **Hard rule (fails CI):** no code may include broker order APIs:
  `placeOrder`, `startOrderStrategy`, `liquidatePosition`.
  This project is *tickets-only*; operators place OCOs manually.

- **Soft checks (non-blocking for now):**
  - `pnpm -r lint`
  - `pnpm -r typecheck`
  - `pnpm -r test`

Artifacts are uploaded on failure to help debugging.



---
**From:** `docs/CLEANUP_REPORT.md`

# Cleanup Report

- Timestamp: 2025-10-04T14:56:41+01:00
- Mode: DELETE
- Large file threshold: 50MB

## Removed Paths
- (logs) `logs/final-check.txt` (tracked)
- (reports logs) `reports/removals/round1/20250909-133034/removals.log`
- (workspace logs) `cleanup_real.log` (untracked)
- (workspace logs) `cleanup_dryrun.log` (untracked)
- Additional untracked cache/log directories discovered via `docs/scan/*.json` (dist/build/tmp/dump variants) — all removed.

## Disk Usage
- Before: 481.69 MB (505088169 bytes)
- After : 481.69 MB (505087524 bytes)
- Saved : 645.00 B (645 bytes)

## Notes
- tickets/*.jsonl, source trees, configs, migrations, and `.env*` were left untouched.
- Set `CLEANUP_DRY_RUN=1` to preview or `ARCHIVE_MODE=1` to move clutter into `archive/ATTIC-<date>` instead of deleting.
- No automated order placement or liquidation paths were introduced.



---
**From:** `docs/CODEBASE_OVERVIEW.md`

# Prism-Apex Codebase Overview (Tickets-Only Brain)

> Prism-Apex is the **brain**; the human operator is the **hands**. The repo never places or cancels live orders — it produces tickets, telemetry, and guardrails so an operator can work safely inside Tradovate.

---

## Current Functionality Snapshot (Yahoo → DB → ORR → Tickets → Dashboard)
- **Yahoo delayed feed populates the DB** — background workers pull ≈15-minute delayed candles from the Yahoo Finance API into Postgres.
- **Strategies read DB-derived series** — ORR and sibling playbooks use bar/VWAP/ATR series from the DB; no broker API feed is hit.
- **Tickets-first workflow** — strategy output is appended to `tickets/*.jsonl` and surfaced in the Dashboard for review.
- **Manual OCO execution** — operators key tickets into Tradovate by hand; Prism-Apex never submits or cancels orders via API.


## Core Flow at a Glance

1. **Market data ingestion** (primarily under `packages/*` and `apps/api/src/feeds`) processes WebSocket/REST sources into derived series (VWAP, ATR, bias signals).
2. **Strategies** inside `packages/strategies`, `packages/rules-apex`, and related helpers evaluate those series and emit structured opportunities.
3. **Guardrails + sizing** (`packages/rules`, `packages/rules-apex`, config files under `configs/` & `config/`) enforce Apex limits, risk tolerances, and program compliance.
4. **Ticketizer** writes append-only JSONL tickets into `tickets/*.jsonl` via services in `apps/api/src/tickets`. Each ticket captures entry, stops/targets, sizing, and rationale.
5. **Operator dashboard** (`apps/dashboard`, `apps/dashboard-lite`) provides read-only telemetry. It may read from Tradovate for balances/fills, but **never** sends orders.
6. **Operator copies ticket → Tradovate** as OCO orders. Execution stays manual, keeping us within the “no automated orders” rule.

---

## Repository Landmarks

- `apps/api/`
  - Node/TypeScript API (pnpm workspace project).
  - Provides REST + WebSocket endpoints for telemetry, ticket download, health probes.
  - Stores strategy orchestrator jobs (`src/jobs`) and guardrails integration tests (`src/tests`).
- `apps/dashboard/`, `apps/dashboard-lite/`
  - Front-end telemetry surfaces. Expect Vite + React with vitest configs in the root.
  - Pulls tickets, account summaries, and health information. Does **not** place trades.
- `tickets/`
  - Operational JSONL log of every approved ticket. Treat as immutable history: archive only, never delete.
- `packages/`
  - Shared libraries: indicators, strategies, runtime, rules, telemetry. Most cross-cutting logic lives here.
  - `packages/runtime` glues strategies + guardrails together.
- `configs/`, `config/`
  - Strategy enablement, environment toggles, size policies. Clarify which files are production vs experimental.
- `scripts/`
  - Operational utilities. `scan_repo.sh` is read-only; any cleanup script we add later will default to archive-first and require explicit opt-in for deletion.
- `docs/`
  - Architecture ADRs, runbooks, compliance notes, and now:
    - `REPO_SCAN_REPORT.md` & `REPO_SCAN_QUESTIONS.md`
    - `SCAN_SUMMARY_MESSAGE.md` (paste-ready status)
    - This overview (`CODEBASE_OVERVIEW.md`) for onboarding.
- `docker-compose*.yml`, `Dockerfile`
  - Define the Docker-only runtime assumption. Align documented ports with these manifests to avoid drift.
- `requirements.txt`, potential Python helpers
  - Python 3.11 utilities (ETL, analytics). Respect lint/format defaults if you extend them.

---

## Development Guardrails

- **Node toolchain:** Target **Node 20.x LTS** with `pnpm`; linting uses the flat ESLint config in `.eslint`. TypeScript configs live in `tsconfig.base.json` with project references per package.
- **Testing:**
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` (vitest) are the usual quality gates.
  - `pnpm run scan:dead` (depcheck) surfaces unused dependencies.
- **Python:** When Python utilities are touched, stick to Python 3.11, `ruff`, and `pytest` conventions.
- **Danger zones:** Any code path that mentions “placeOrder”, “submitOrder”, etc. must remain disabled or guarded — the scan heuristics surface these so we can confirm they stay dormant.

---

## Working With the Tickets-Only Constraint

- Tickets are the hand-off contract: strategy output → operator input.
- Never auto-call broker APIs from this repo. If you discover historical code that hints at automated order placement, flag it before changing anything.
- Treat `tickets/*.jsonl` as permanent records. Cleanups should archive (e.g., move under `archive/`) rather than delete.
- Build artefacts (`dist/`, `build/`, caches) should generally stay out of git and be reproducible.

---

## Onboarding Checklist for New Contributors

1. Read `CODEBASE_OVERVIEW.md` (this file) and `docs/REPO_SCAN_REPORT.md` to understand current data.
2. Answer/confirm the items in `docs/REPO_SCAN_QUESTIONS.md` when planning cleanups or refactors.
3. Bring local Node to 20.x before running pnpm scripts to avoid engine warnings.
4. When updating configs/strategies, document the canonical source of truth so operators know what’s live versus experimental.
5. Run checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`) in CI—failures may be pre-existing; coordinate before fixing.

Staying inside these guardrails keeps Prism-Apex compliant with the operator-assisted mission while giving us the visibility we need to keep accounts safe.




---
**From:** `docs/DEPLOY-LOCAL-INGRESS.md`


Yahoo Ingress (Optional / Testing)

Simulates delayed bars for strategy testing. Disabled by default.

Intended for demos and offline testing (not for live trading).

Typical smoke flow:

Start API via compose.

Start the Yahoo ingress service (see its README/Dockerfile).

POST sample bar JSON to the ingress endpoint.

Inspect generated tickets under /data/tickets/YYYY-MM-DD/.

Tip: Label tickets created from delayed sources so operators can distinguish them from live signals.



---
**From:** `docs/DOCS_SYNC_REPORT.md`

# Docs Sync Report

- Timestamp: 2025-10-04T15:44:52+0100
- Base branch: chore/cleanup-delete-and-docs
- Working branch: chore/docs-sync-orr-yahoo

## Updated
- docs/ARCHITECTURE_OVERVIEW.md
- docs/CODEBASE_OVERVIEW.md
- docs/README_NAV.md

## Deleted (orphaned/stale)
- (none)

## Orphaned docs (not linked)
- docs/CI.md
- docs/CONTRIBUTING-scripts.md
- docs/DEPLOY-LOCAL-INGRESS.md
- docs/LOCAL_DEV.md
- docs/MAINTENANCE.md
- docs/PLATFORMS/tradovate.md
- docs/POST_MERGE_VERIFY.md
- docs/RELEASE_NOTES.md
- docs/UPGRADE.md
- docs/accounts.md
- docs/adr/ADR-2025-09-09-docker-api-only.md
- docs/adr/ADR-2025-09-09-operator-assisted-architecture.md
- docs/analytics/payout_tracker.md
- docs/analytics/post_trade.md
- docs/apex/01_rules.md
- docs/apex/02_funded_rules.md
- docs/apex/03_funding_process.md
- docs/apex/04_platforms.md
- docs/apex/05_notifications.md
- docs/apex/06_knowledge_base.md
- docs/audit/guide.md
- docs/backtest/overview.md
- docs/backtest/tick-readiness.md
- docs/calibration/summary.md
- docs/compliance/rule-engine.md
- docs/config.md
- docs/configs/ACCOUNTS.md
- docs/configs/README.md
- docs/consistency.md
- docs/dashboard/guide.md
- docs/dashboard/overview.md
- docs/deployment/guide.md
- docs/deployment/hardening.md
- docs/dev/quickstart.md
- docs/export.md
- docs/multi-account/guide.md
- docs/notifications/guide.md
- docs/operator-console.md
- docs/operator/handbook.md
- docs/operator/quick-cards/cheat-sheet.md
- docs/operator/quick-cards/eod-flat.md
- docs/operator/quick-cards/execute-ticket.md
- docs/operator/quick-cards/incidents-&-escalation.md
- docs/operator/quick-cards/monitor-&-alerts.md
- docs/operator/quick-cards/sod-checklist.md
- docs/operator/training-deck.md
- docs/payouts/calendar.md
- docs/release/checklist.md
- docs/release/go-live-checklist.md
- docs/release/operator_signoff.md
- docs/release/runbook-rollback.md
- docs/release/sign-off-template.md
- docs/release/uat-scenarios.md
- docs/rules/overview.md
- docs/simulator/overview.md
- docs/strategy-switcher/guide.md
- docs/telemetry.md
- docs/tickets.md

## Broken doc links
- (none found)



---
**From:** `docs/LOCAL_DEV.md`

# Prism-Apex — Local Dev (tickets-only)

Run the local pipeline end-to-end without placing real orders: Yahoo → Postgres → strategy → tickets JSONL → dashboard/API.

## Prerequisites
- Docker Desktop (or compatible) with Compose
- Files in repo root: `docker-compose.yml`, `.env.example.local`

## 1. Start the stack (Postgres on host **55433**)
```bash
make up
```

What spins up:
- **api** – serves on http://localhost:3000 with healthcheck
- **dashboard-full** – Nginx bundle on http://localhost:5180
- **ingress-yahoo** – local ingress on http://localhost:8080
- **gapfill-cron**, **tickets-cron** – background maintenance jobs
- **db** – postgres:16-alpine bound host 55433 → container 5432

## 2. Verify everything is healthy
```bash
docker compose --profile local ps | grep api
docker compose logs --no-color tickets-cron | tail -n 60
docker compose exec -T api sh -lc 'tail -n 10 /app/data/tickets.jsonl || tail -n 10 /data/tickets.jsonl || true'
```
You should see new rows in `data/tickets.jsonl`, and the API healthcheck should report `"Status":"ok"` once `/health` returns 200.

## 3. Stop the stack
```bash
make down        # keep the Postgres volume
# docker compose --profile local down -v   # wipe volumes for a clean slate
```

## Notes
- Tickets-only posture is enforced: `TICKETS_ONLY=true`, `ORDERS_DISABLED=true`
- Generated artifacts under `data/` (e.g., `tickets.jsonl`) are now ignored by Git
- If port 55433 conflicts, override `PGHOSTPORT` when invoking `make up` or `docker compose`

## Cleanup (SAFE / dry-run)
Preview what would be removed (no deletions):
```bash
tools/cleanup_yahoo_data.sh --dry-run
# or set DRY_RUN=1 tools/cleanup_yahoo_data.sh
```
Perform the real cleanup (creates a backups/yahoo-data-*.tar.gz archive first):
```bash
tools/cleanup_yahoo_data.sh
```
Reports land in `docs/YAHOO_DATA_CLEANUP.md`.



> Legacy OPERATIONS excerpt removed; refer to docs/OPERATIONS.md for latest commands.

---
**From:** `docs/PLATFORMS/tradovate.md`


Tradovate Platform Notes (Market Data Only)

Use demo credentials/API add-on for market data and contract metadata.

This app opens market-data sockets and reads metadata; it does not place, modify, or cancel orders.

TradingView alerts are supported via webhook if preferred; include your shared secret.

Operator copies ticket into Tradovate as an OCO. No auto-trading.

Reminder: Tickets-only is a hard requirement. CI rejects any code introducing order APIs.



---
**From:** `docs/POST_MERGE_VERIFY.md`

# Post-merge Verification
- UTC: 2025-09-29 21:07:36
- Base: Test
- Branch: chore/post-merge-verification

## Git
```
## chore/post-merge-verification...origin/Test
 M docs/YAHOO_DATA_CLEANUP.md
?? docs/POST_MERGE_VERIFY.md
```

## Cleanup (dry-run)
Ran `DRY_RUN=1 tools/cleanup_yahoo_data.sh` (no deletions). See `docs/YAHOO_DATA_CLEANUP.md` for tracked candidates.

## Docker smoke
- `make up`
- API health reached `healthy`
- `docker compose logs --no-color tickets-cron | tail -n 80`
- `tail -n 10 data/tickets.jsonl`
- `make down`



---
**From:** `docs/RELEASE_NOTES.md`

# Prism Apex Tool — Release Notes

## v0.1.0 (Unquarantine milestone)

### Highlights

- **API** restored on Fastify 5 with typed routes and OpenAPI 3.1 generator.
- **Strategies**: Open Session Breakout, VWAP First-Touch (read-only suggestions).
- **Tickets**: `POST /tickets/promote`, `GET /tickets?date=YYYY-MM-DD`, CSV export.
- **Security**: optional Bearer auth; local rate-limit with public route bypasses; `/ready`.
- **DX**: SDK package for typed client calls; per-pkg typecheck; Vitest harness; Docker (dev + prod).
- **Docs**: README overhaul, upgrade guide, release notes.

### Breaking / Behavioral

- Node **20.x** required; ESM everywhere.
- Bearer auth **off by default**; enable via `BEARER_TOKEN` (public: `/health`, `/ready`, `/openapi.json`, `/version`).
- Rate-limit defaults: `RATE_LIMIT_MAX=60`, `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX_BUCKETS=50000`.

### New Endpoints

- `GET /ready` — readiness probe.
- `GET /market/symbols`, `GET /market/sessions`
- `POST /signals/osb`, `POST /signals/vwap-first-touch`
- `POST /tickets/promote`, `GET /tickets?date=YYYY-MM-DD`
- `GET /export/tickets?date=YYYY-MM-DD`

### Tooling & Tests

- Per-workspace typecheck via `tsconfig.typecheck.json`.
- Global Vitest setup resets modules and quiets logs.
- Docker Compose for dev; multi-stage production Dockerfile.

### Known Gaps

- No auto-execution of orders (by design).
- No external email/Slack integrations (local-only for now).



---
**From:** `docs/REPO_CLEANUP_POLICY.md`

# Repository Cleanup Policy — Delete-First

Prism-Apex repositories only automate the **brain**: we generate signals, guardrails, and tickets so an operator can execute manually. Nothing here places orders or liquidates accounts via API. Our cleanup policy follows the same philosophy—keep source of truth files safe while aggressively removing clutter that is reproducible.

## Guardrails (never delete)
- Application and library code: `apps/**`, `packages/**`, `src/**`, `services/**`
- Strategy and runtime configuration: `configs/**`, `config/**`
- Database and schema changes: `migrations/**`
- Ticket history: `tickets/*.jsonl` (**sacred**) — archive, never delete.
- Environment templates and examples: any `.env*`

These paths may only be moved or deleted with an explicit approval outside of the automated cleanup.

## Delete-first categories (safe to drop)
- Caches: `__pycache__/`, `.ipynb_checkpoints/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`
- Logs: every `*.log` file and any `logs/**` directory
- Build output: `dist/**`, `build/**`, `.tmp/`
- Temp/dumps: `tmp/**`, `temp/**`, `dump/**`, `dumps/**`
- Databases & pids generated locally: `*.sqlite`, `*.db`, `*.pid`
- Known compiled output: `apps/api/dist-cjs/`
- Oversized loose assets outside the protected trees (default `>50MB`)

These artifacts are reproducible from source. When the cleanup script finds them under Git control, it stages a deletion; if they are untracked it removes them outright.

## Cleanup script (`scripts/cleanup_repo.sh`)
- Default mode is **delete-first**.
- Reads scan inventories in `docs/scan/*.json` (logs, caches, builds, dumps, notebooks, large files) when available, then falls back to pattern matching.
- Preserves the guardrail paths listed above and anything beginning with `.env`.
- Writes a manifest to `docs/CLEANUP_REPORT.md` including disk usage before/after.
- Supports `CLEANUP_DRY_RUN=1` for preview and `ARCHIVE_MODE=1` to move clutter into `archive/ATTIC-YYYYmmdd/` instead of deleting.

## Rollback & safety
- Deleted tracked files remain in Git history—use `git checkout -- <path>` or `git revert` if a classification was wrong.
- Untracked deletions are permanent. Run with `CLEANUP_DRY_RUN=1` first if unsure.
- No command in this policy or its scripts introduces automated order placement or emergency liquidation. The operator workflow (tickets → Tradovate OCO) remains intact.



---
**From:** `docs/REPO_SCAN_QUESTIONS.md`

# Follow-up Questions (Please answer in chat)

1. There are 1 notebook(s). Should we archive all notebooks to `archive/` or keep a curated subset?
2. Found 5 log file(s)/folders. OK to remove logs entirely (they are reproducible) or keep last N by date?
3. Found 6 environment file(s). Confirm which `.env*` can be ignored vs. need to keep examples only?
4. Detected build artifacts. OK to treat `/dist` and `/build` as generated and exclude from git?
5. Strategy-related configs detected. Which directories or files are canonical versus experimental?
6. Confirm that `tickets/*.jsonl` are sacred: archive never delete.
7. Confirm there must be **no API order placement** in code or docs; review heuristics before any future removals.
8. Confirm which strategy configs are the source of truth versus sample or legacy variants.




> Repo scan appendix removed; see README.md for current stack overview.

---
**From:** `docs/SCAN_SUMMARY_MESSAGE.md`

# Scan Outputs — Paste-Ready Summary

Here’s a friendly message you can drop into chat/PR to explain what the repo scan delivered and what to do next.

---

## ✅ What shipped in the scan PR

- **scripts/scan_repo.sh** — read-only scanner for either the working tree or a provided ZIP snapshot.
  - Emits JSON/CSV inventories under `docs/scan/`, `docs/REPO_SCAN_REPORT.md`, and `docs/REPO_SCAN_QUESTIONS.md`.
  - Flags possible **port bindings** and any **order-placement-adjacent** code paths for manual review (nothing auto-modified).
- **docs/REPO_SCAN_REPORT.md** — tree + extension breakdown, manifest inventory, and lists of large files, logs, caches, env/build artifacts, and tickets.
- **docs/REPO_SCAN_QUESTIONS.md** — approvals you need to give before any cleanup (notebooks, logs retention, env files, build artifacts, canonical strategy configs, and sacred tickets).
- **docs/README_NAV.md** — now links to the scan report/questions so operators can find them fast.
- **docs/scan/** — machine-readable CSV/JSON artifacts for repeated review or automation.

No runtime behaviour changed; Docker-first assumptions are intact.

---

## 📝 Context worth calling out

- Pre-existing local changes were left untouched:
- Legacy compose overrides (e.g., `docker-compose.override.dashboard.yml`) were removed during the profile consolidation.
  - `apps/api/dist-cjs/` is an untracked build output already in the tree.
- Scanner expects standard CLI utilities plus `python3` and `rg`; it honours the Node 20.x LTS + Python 3.11 targets you outlined.

---

## 🔎 Informational checks (non-blocking)

- `pnpm lint` → **fails** on pre-existing lint issues (`no-useless-escape`, `no-console`, `no-var`, etc.).
  - Surfaces Node engine mismatch: local Node v24 vs repo target **Node 20.x**.
- `pnpm typecheck` → **passes** (same engine warning).
- `pnpm test -q` → API vitest suite **passes**; only engine warnings.
- `pnpm run scan:dead` → completes; `depcheck` says several devDependencies look unused.

These checks were run for signal only; nothing was altered to appease them.

---

## ➡️ Suggested next moves

1. Answer the prompts in `docs/REPO_SCAN_QUESTIONS.md` so we can script a precise, archive-first cleanup:
   - Notebooks: archive all vs keep a curated subset?
   - Logs: delete entirely or keep the most recent N?
   - Temp/DB dumps: archive or remove?
   - `.env*`: which stay as examples vs ignored?
   - Build output directories (`/dist`, `/build`): treat as generated and keep out of git?
   - Confirm `tickets/*.jsonl` remain **sacred** and only ever archived.
   - Confirm **no API order placement** code paths should exist; decide what to do if heuristics flagged anything suspicious.
2. Legacy compose override artefacts (`docker-compose.override.dashboard.yml`, etc.) are intentionally retired; ensure follow-up docs reference the new profiles.
3. (Optional) Resolve or accept the lint warnings and align local Node to 20.x to eliminate engine noise.

Once those decisions are in, I can draft the cleanup plan/PR without risking important operator workflows.




---
**From:** `docs/YAHOO_DATA_CLEANUP.md`

# Yahoo Data Cleanup (SAFE: untracked-only)
- UTC: 2025-09-29 21:06:39
- Mode: DRY-RUN
- Backup (untracked set): `backups/yahoo-data-20250929210634.tar.gz`

## Untracked candidates (preview)
_None_

## Tracked candidates (reported only; NOT removed)
| Size | Modified (UTC) | Path |
|-----:|----------------|------|
| 4.0K | 2025-09-20 07:58:23 | `apps/api/data/accounts.json` |
| 4.0K | 2025-09-20 07:58:23 | `apps/api/data/tickets.jsonl` |
| 4.0K | 2025-09-29 19:57:04 | `data/ES_1m.sample.csv` |
| 4.0K | 2025-09-29 19:57:04 | `data/ES_ticks.sample.csv` |
| 4.0K | 2025-09-29 19:57:04 | `data/accounts.sample.json` |
| 4.0K | 2025-09-29 19:57:04 | `data/sample_bars/ES_1m.csv` |
| 4.0K | 2025-09-29 19:57:04 | `data/sample_bars/NQ_1m.csv` |
| 4.0K | 2025-09-29 19:57:04 | `data/strategy_schedule.sample.json` |
## 2025-10-01T14:49:40+01:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 0
  (none)

## 2025-10-01T14:49:46+01:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 0
  (none)

## 2025-10-01T14:51:31+01:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 0
  (none)
(auto-continue: dry-run or AUTO_YES set or non-interactive)
[DRY-RUN] No deletions performed.

## 2025-10-01T15:03:13+01:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Dry run: 0

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 0
  (none)
(auto-continue: dry-run or AUTO_YES set or non-interactive)
Done.




---
**From:** `docs/adr/ADR-2025-09-09-operator-assisted-architecture.md`


ADR 2025-09-09 — Operator-Assisted Architecture (Tickets-Only, No API Orders)
Status

Accepted (2025-09-09)

Context

Apex Trader Funding enforces strict daily loss and trailing drawdown rules.

Tradovate supports API order placement, but operational risk (fat-finger, liquidity events, rate limits, licensing) makes fully automated order flow undesirable at this stage.

Our operator users require a simple, explainable workflow that is resilient to outages and licensing constraints (e.g., market data entitlements).

Decision

Prism-Apex will not place orders via API.

The system only emits tickets with full parameters (symbol, side, entry, stop, target, qty, accountId, metadata).

A human operator manually enters an OCO bracket in Tradovate using the ticket values.

Live market data drives strategy logic; telemetry is read-only.

Consequences

Positive

Eliminates accidental auto-orders and “runaway bot” scenarios.

Keeps compliance simple; operator remains in control of entries.

Works even when market-data API entitlements vary—operators can rely on platform UI.

Negative / Tradeoffs

Requires operator availability during strategy windows.

Slightly slower than API execution; mitigated by clear copy format and OCO templates.

Notes

Guardrails (stop presence/side, risk:reward clamps, sizing policies, EOD suppression) run before ticket emission. Violations produce accepted=false with explicit reasons.

Future: we may revisit limited API actions (telemetry reads only) but never automated order placement without a new ADR and stakeholder approval.



---
**From:** `docs/analytics/post_trade.md`

# Post-Trade Analytics

## Purpose

Every day after trading, the system generates a report:

- Daily PnL (gross and net)
- Guardrail breaches
- Operator actions

## Location

Reports stored in `reports/daily_YYYY-MM-DD.json`.

## Usage

View on dashboard under "Daily Report".



---
**From:** `docs/apex/04_platforms.md`

# Apex Trader Funding – Platform Integration Guide

## Rithmic + NinjaTrader

### How the Connection Works

- Rithmic supplies low-latency futures data feed and order routing.
- NinjaTrader is the desktop trading platform; it connects to Rithmic using credentials issued in the Apex dashboard.
- One set of Rithmic credentials per evaluation/funded account; cannot share across platforms.

### Difficulty Rating: 8/10

### Pros

- Industry-grade performance and fills.
- Advanced charting and order flow tools.
- Supports custom indicators and automated strategies via NinjaScript/ATMs.

### Cons

- Windows-only installation.
- Learning curve for data routing and strategy configuration.
- Single concurrent Rithmic session per login.

### Step-by-Step Setup (Apex-Specific)

1. **Buy Evaluation**
   - When purchasing an Apex evaluation, select a _Rithmic/NinjaTrader_ account. Platform choice is locked for that account.
2. **Retrieve Rithmic Credentials**
   - In the Apex dashboard, open _Credentials_ and copy the Rithmic username/password for the account.
3. **Install Rithmic R | Trader Pro**
   - Download from rithmic.com and install on Windows. Log in once to activate the username and declare non‑pro data status.
4. **Install NinjaTrader 8**
   - Download from ninjatrader.com and install.
5. **Link Rithmic in NinjaTrader**
   - In _Connections → Configure_, create a new Rithmic connection.
   - Enter the Apex‑supplied username/password.
   - For evaluation use `Rithmic Paper Trading – Chicago`; for funded use `Rithmic Live – Chicago`.
6. **Connect and Trade**
   - From _Connections_, choose the configured Rithmic connection.
   - Confirm the account drop‑down shows the Apex evaluation or funded account ID.

### Watchouts & Best Practices

- **Single Login** – Rithmic blocks concurrent logins. Disconnect R | Trader Pro before launching NinjaTrader or vice versa.
- **Trailing Drawdown Visibility** – NinjaTrader does not display trailing drawdown. Use R | Trader Pro or the Apex dashboard to track.
- **Data Declaration** – If you mistakenly register as a professional during R | Trader Pro login, your feed may be blocked or billed.
- **Strategy Testing** – Backtest with playback data before enabling live automation.
- **Windows-Only** – Mac users need Boot Camp or virtualization.

## Tradovate + TradingView

### How the Connection Works

- Tradovate provides the brokerage layer and data feed.
- TradingView (or the Tradovate web/desktop app) is the front end.
- Apex issues Tradovate credentials tied to the evaluation or funded account.

### Difficulty Rating: 3/10

### Pros

- Browser and mobile friendly; works on Windows, macOS, and Linux.
- Fast signup and no local software install.
- Easy chart sharing and community scripts via TradingView.

### Cons

- Limited automation; no full custom NinjaScript-style strategies.
- Dependent on stable internet; offline trading not supported.
- Trailing drawdown not shown natively.

### Step-by-Step Setup (Apex-Specific)

1. **Buy Evaluation**
   - Choose a _Tradovate/TradingView_ account when ordering from Apex.
2. **Retrieve Tradovate Credentials**
   - In the Apex dashboard, copy the Tradovate username and temporary password.
3. **Create/Link Tradovate Profile**
   - Navigate to tradovate.com or install the Tradovate app.
   - Log in using the credentials; change the temporary password when prompted.
   - Accept the non‑professional data declaration.
4. **Connect in TradingView (Optional)**
   - Open tradingview.com, log in, and click _Trading Panel → Tradovate_.
   - Enter the same Apex-issued credentials to link the broker.
5. **Select the Account**
   - In Tradovate or TradingView, pick the Apex evaluation account from the account selector and begin trading.

### Watchouts & Best Practices

- **Plan Lock-In** – Accounts created for Tradovate cannot later migrate to Rithmic/NinjaTrader.
- **Session Limits** – Avoid logging in on multiple browsers/devices simultaneously to prevent order sync issues.
- **Trailing Drawdown** – Monitor via the Apex dashboard or third-party widgets.
- **Order Types** – Some advanced order types (server OCO, custom strategies) are unavailable; confirm before relying on them.
- **Data Reset** – Clear browser cache or app data when switching accounts.

## WealthCharts

### How the Connection Works

- WealthCharts is an all-in-one web platform bundling charting, execution, and Apex‑specific risk tools.
- Apex provides a WealthCharts login that maps directly to the evaluation or funded account; no separate data feed setup is required.

### Difficulty Rating: 4/10

### Pros

- Turnkey access with pre-built Apex layouts and liquidation indicator.
- Web-based; no installs and minimal system requirements.
- Integrated account analytics and news.

### Cons

- Closed ecosystem with limited third‑party extensions or automation.
- Fewer hotkeys and advanced DOM features compared to NinjaTrader.
- Reliant on WealthCharts’ servers; fewer backup options.

### Step-by-Step Setup (Apex-Specific)

1. **Buy Evaluation**
   - Select a _WealthCharts_ account type during Apex checkout.
2. **Receive Credentials**
   - Apex emails activation link and credentials for WealthCharts.
3. **Activate and Log In**
   - Follow the activation link, set a password, and sign in at wealthcharts.com.
4. **Link the Account**
   - Under _Settings → Connections_, choose Apex Trader Funding and enter the provided credentials.
5. **Load Apex Layout**
   - From the layout library, import the Apex template to access liquidation indicator and trailing drawdown panels.
6. **Confirm Trading Access**
   - Verify the account selector shows the evaluation or funded ID before placing orders.

### Watchouts & Best Practices

- **Automation Limits** – No official API; manual trading only.
- **Liquidation Indicator** – Provides an estimate; cross-check with Apex dashboard for accuracy.
- **Browser Compatibility** – Use a modern browser and disable aggressive ad blockers that may block websockets.
- **Account Switching** – Log out fully before switching between multiple Apex accounts.

## Comparison Matrix

| Platform                | Difficulty | Key Pros                                     | Key Cons                                | Ideal Use Case                        |
| ----------------------- | ---------: | -------------------------------------------- | --------------------------------------- | ------------------------------------- |
| Rithmic + NinjaTrader   |       8/10 | Low-latency fills, full automation, deep DOM | Windows-only, complex setup             | Windows power users & algo developers |
| Tradovate + TradingView |       3/10 | Easiest onboarding, web/mobile access        | Limited automation, cloud dependency    | Cross-platform discretionary traders  |
| WealthCharts            |       4/10 | Turnkey with Apex-specific risk tools        | Closed ecosystem, limited extensibility | Traders wanting built-in risk visuals |

## Recommendations

- **Mac or Mobile Beginners** → _Tradovate + TradingView_ for quick, cross-platform access.
- **Windows Power Users & Automation** → _Rithmic + NinjaTrader_ for advanced DOM and strategy support.
- **Traders Needing Built-In Risk Tools** → _WealthCharts_ for the liquidation indicator and simplified setup.



---
**From:** `docs/apex/06_knowledge_base.md`

# Apex Trader Funding – Rules, Funding Process, and Technical Platforms

## Evaluation Phase Rules

- **Profit Target:** Each evaluation account has a fixed goal. Example: a **$50,000** account must earn **$3,000**.
- **Trailing Drawdown:** Real-time max loss that trails peak balance. Example: the $50k plan has a **$2,500** trailing drawdown.
- **Minimum Trading Days:** Trade at least **7 separate days**. Half-day market sessions **do not count**.
- **End-of-Day Flat:** All positions and orders must be closed by **4:59 PM ET**.
- **Scaling:** No contract scaling limits during evaluation; you may use the full contract allotment.
- **News Trading:** Permitted unless Apex issues a specific restriction.
- **Resets:** Account can be reset at cost and begins a new evaluation cycle.
- **Pass Criteria:** Reach profit target, respect trailing drawdown, and trade 7 qualifying days.

### Evaluation Account Example

| Plan Balance | Profit Target | Trailing Drawdown | Max Contracts\* |
| ------------ | ------------- | ----------------- | --------------- |
| $50,000      | $3,000        | $2,500            | 10              |

\*Max contracts are defined by Apex's plan; no scaling rules apply in evaluation.

## Funded Phase Rules

- **30% Consistency Rule:** No single day may exceed **30%** of total profits at payout. Violations can deny payout and place the account on **consistency probation**.
- **Loss Limits:** Breaching the trailing drawdown or the daily loss cap closes the account.
- **Mandatory Stop-Loss:** Every order must include a protective stop.
- **Risk/Reward Cap:** Targets may be no more than **5×** the stop distance (max **5:1 R/R**).
- **Half-Contract Scaling:** Trade **half** the account’s max contracts until the trailing drawdown buffer is cleared.
- **Trailing Drawdown Lock-In:** Once balance reaches starting balance plus drawdown (e.g., $52,500 on a $50k PA), the drawdown locks at the start balance.
- **No Gambling Strategies:** Apex may terminate for unsound tactics or reckless trading.
- **Account Limits:** Up to **20** active Performance Accounts per trader; **no resets** allowed.
- **Payout Structure:** First **$25,000** kept **100%**, then **90/10** split until the **6th payout**, after which split returns to **100%**.
- **Payout Cadence:** Minimum **8 trading days** between withdrawals.
- **Payout Caps:** Payout #1 capped at **$2,000**, #2 at **$2,500**, #3 at **$5,000**; caps removed after third payout.
- **Safety Net:** After each payout, account must retain trailing-drawdown amount.
- **Transition to Live Trading:** After consistent performance, trader may elect to go live with a broker.

## Funding Step-by-Step

1. **Sign Up:** Purchase evaluation plan and choose platform (Rithmic/NinjaTrader, Tradovate/TradingView, or WealthCharts).
2. **Platform Setup:** Install or access the platform with credentials from Apex.
3. **Trade Evaluation:** Follow evaluation rules, monitor trailing drawdown, and flat by 4:59 PM ET.
4. **Hit Targets:** Reach profit goal and complete 7 qualifying days.
5. **Sign PA Contract:** Apex emails Performance Account agreement; pay **$85/month** fee.
6. **Trade Funded Account:** Apply funded rules and build consistency.
7. **Request Payout:** After 8 trading days and meeting consistency, request withdrawal via Apex dashboard.

## Technical Platforms

### Rithmic + NinjaTrader

- **Difficulty:** 7/10
- **Pros:** Low-latency data, advanced charting, automation via NinjaScript.
- **Cons:** Windows-only, requires software installation, steep learning curve.
- **Setup Tips:** Use Apex-provided Rithmic credentials; configure NinjaTrader connection manually.
- **Apex Restrictions:** One Rithmic login per machine; Apex data only.

### Tradovate + TradingView

- **Difficulty:** 3/10
- **Pros:** Web and mobile access, intuitive UI, native TradingView charts.
- **Cons:** Limited automation, dependent on cloud connectivity.
- **Setup Tips:** Create Tradovate login through Apex; link account to TradingView if charting there.
- **Apex Restrictions:** Cannot share credentials; close all browser sessions before switching accounts.

### WealthCharts

- **Difficulty:** 4/10
- **Pros:** Turnkey layouts tailored for Apex, built-in liquidation indicator.
- **Cons:** Closed ecosystem, less third-party integration.
- **Setup Tips:** Use Chrome; enable Apex template for trailing-drawdown overlay.
- **Apex Restrictions:** Trading limited to provided symbols and time frames.

### Platform Comparison

| Platform                | Difficulty | Pros                             | Cons                        | Apex Nuances                     |
| ----------------------- | ---------- | -------------------------------- | --------------------------- | -------------------------------- |
| Rithmic + NinjaTrader   | 7/10       | Low latency, automation          | Windows only, complex setup | One login per machine            |
| Tradovate + TradingView | 3/10       | Web/mobile, easy to start        | Limited automation          | Logout before switching accounts |
| WealthCharts            | 4/10       | Apex presets, liquidation alerts | Closed ecosystem            | Only Apex-approved instruments   |

## Comparison Table – Evaluation vs Funded Accounts

| Rule / Feature        | Evaluation Account                 | Funded/Performance Account                     |
| --------------------- | ---------------------------------- | ---------------------------------------------- |
| Trailing Drawdown     | Real-time; trails until target hit | Locks once start balance + drawdown is reached |
| Minimum Trading Days  | 7 days; half-days excluded         | 8 trading days between payouts                 |
| Scaling               | No scaling limits                  | Half-contract rule until buffer built          |
| Resets                | Allowed (paid)                     | Not permitted                                  |
| News Trading          | Allowed                            | Allowed unless Apex issues restriction         |
| Consistency Rule      | Not enforced                       | 30% daily profit cap; violations deny payout   |
| Payout Structure      | N/A                                | 1st $25k 100%; then 90/10 until 6th payout     |
| Payout Caps           | N/A                                | $2k / $2.5k / $5k for payouts #1-#3            |
| Stop-Loss Requirement | Not mandatory (recommended)        | Mandatory on every order                       |
| Transition Option     | Move to funded after pass          | Can opt into live trading after consistency    |



---
**From:** `docs/audit/guide.md`

# Prism Apex Tool — Audit Trail Guide

## Purpose

- Records all **system events**, **rule checks**, and **operator actions**.
- Ensures compliance with Apex rules (manual input, EOD flat).

## Log Formats

- **audit.log** → plain text, human readable.
- **audit_YYYY-MM-DD.jsonl** → structured JSON lines for parsing.

## Example Entry

```json
{
  "timestamp": "2025-08-17T13:45:01Z",
  "event_type": "RULE_CHECK",
  "message": "Breaches detected",
  "details": { "breaches": ["daily_loss"] }
}
```

## Retention

- Keep logs for 90 days minimum.
- Archive older logs to cloud if required.

## Visuals

```mermaid
flowchart TD
    A[System Event] --> L[Audit Logger]
    B[Rule Check] --> L
    C[Operator Action] --> L
    L -->|JSONL/Text| F[logs/audit/]
    F --> Operator[Review / Compliance]
```



---
**From:** `docs/compliance/rule-engine.md`

# Compliance Rule Engine

## Purpose

Codify Apex Trader Funding rules into machine-enforceable checks.

## How It Works

- Loads `apex/rules.json` definitions.
- Validates `AccountState` against all rules via `checkCompliance`.
- Returns `{ ok, violations[] }`.
- Violations feed into the Alerts pipeline.

## Example

```ts
import { checkCompliance, AccountState } from '../../apps/api/src/services/rules/engine.js';

const state: AccountState = {
  phase: 'evaluation',
  balance: 50000,
  equityHigh: 50000,
  openPositions: [],
  tradeHistory: [],
  dayPnL: {},
  trailingDrawdown: 49000,
};

const res = checkCompliance(state);
console.log(res.ok);
```

## Rules Covered

| JSON id             | Rule                  | Apex Reference                       |
| ------------------- | --------------------- | ------------------------------------ |
| eval-profit-target  | Profit Target         | Evaluation Handbook §Profit Target   |
| eval-trailing-dd    | Trailing Drawdown     | Evaluation Handbook §Drawdown        |
| eval-min-days       | Minimum Trading Days  | Evaluation Handbook §7 Days          |
| eval-eod-flat       | End of Day Flat       | Evaluation Handbook §EOD             |
| eval-resets         | Account Resets        | Evaluation Handbook §Resets          |
| funded-stoploss     | Stop-Loss Required    | Funded Account Handbook §Stops       |
| funded-consistency  | Consistency Rule      | Funded Account Handbook §Consistency |
| funded-scaling      | Half-Contract Scaling | Funded Account Handbook §Scaling     |
| funded-windfall     | No All-In/Windfall    | Funded Account Handbook §Windfall    |
| funded-dd-lock      | Trailing DD Lock      | Funded Account Handbook §DD Lock     |
| funded-news         | News Trading Ban      | Funded Account Handbook §News        |
| payout-safety-net   | Safety Net            | Payouts Handbook §Safety Net         |
| payout-cadence      | Payout Cadence        | Payouts Handbook §Cadence            |
| payout-profit-split | Profit Split          | Payouts Handbook §Profit Split       |

## Operator Impact

- Operators see compliance alerts before inputting trades.
- Violations mean: **do not place ticket**.

## Future Work

- Map remaining Apex rules into `apex/rules.json`.
- Add a diagram of the compliance flow.



---
**From:** `docs/consistency.md`

# Consistency Metrics

The Consistency Enforcer computes Apex-style payout eligibility metrics:

- **Top-day share** must be \u2264 30% of total net.
- At least **5 profit days** with \u2265 $50 net in the last 8 days.

For now the system runs in **metrics-only** mode. Tickets include
`meta.consistencyNotes = "metrics-only; enforce=false"`.

An optional flag `CONSISTENCY_ENFORCE=true` prepares the system for
pre-blocking funded accounts but is disabled until real PnL telemetry
arrives.

## API

`GET /report/consistency?accountId=<id>&window=8`

Returns the computed metrics and pass/fail reasons. A mock PnL provider is
used for tests and development. Real PnL will be supplied in PR-C1.



---
**From:** `docs/dashboard/guide.md`

# Prism Apex Tool — Operator Dashboard Guide

## What It Does

- Shows live strategy performance (win rate, expectancy, max drawdown).
- Monitors Apex guardrail compliance (✅ pass / ❌ fail).
- Displays payout eligibility and next payout date.
- Summarizes calibration sweep results.

## How to Use

1. Start with `make dashboard`.
2. Open browser at `http://localhost:8000`.
3. Review widgets:
   - **Performance**: are strategies profitable?
   - **Guardrails**: any Apex breaches?
   - **Payouts**: when can money be withdrawn?
   - **Calibration**: are current parameters safe?

## Config Options

- All data pulled from `reports/` folder.
- Refresh dashboard by re-running sweeps or payouts.
- Frontend is single-page, minimal.

## Visuals

```mermaid
flowchart TD
    Data[Reports CSV/JSON] --> API[FastAPI Endpoints]
    API --> UI[React Dashboard]
    UI --> Operator
```



---
**From:** `docs/dashboard/overview.md`

# Prism Apex Operator Dashboard

## What It Does

The dashboard is the operator's command center. It displays:

- **Trade Tickets** from ORB and VWAP strategies.
- **Account Status** with balance, drawdown, and open positions.
- **Alerts** for Apex violations, EOD requirements, and scaling notices.
- **Reports** summarizing historical performance.

## How to Use

1. Open the dashboard in your browser.
2. Review the **Tickets** tab for trades to input into Tradovate.
3. Monitor **Account Status** for balance and drawdown.
4. Watch the **Alerts** panel for Apex risk warnings.
5. Switch to **Reports** to inspect simulator metrics and win rates.

## Data Sources

All information is fetched from the API endpoints:

- `/tickets`
- `/account`
- `/alerts`
- `/reports`

Alerts refresh automatically every 5 seconds.



---
**From:** `docs/deployment/guide.md`

# Prism Apex Tool — Deployment Guide

## Local Development

- Run `make dashboard` for local API/UI.
- Calibration: `make calibrate`.
- Payouts: `make payouts`.

## Docker

```bash
docker compose build
docker compose up -d
```

## GitHub Actions

CI runs on develop: lint, tests, calibration.

CD runs on main: deploys to server via SSH + Docker.

## Server Deployment

SSH into server.

```bash
cd ~/prism-apex-tool
./infra/deploy.sh
```

## Visuals

```mermaid
flowchart TD
    Dev[Developer Push] --> CI[GitHub CI Tests]
    CI -->|Pass| Main[Merge to Main]
    Main --> CD[GitHub CD Deploy]
    CD --> Server[Server Docker Compose]
    Server --> Operator[Web Dashboard + API]
```



---
**From:** `docs/dev/quickstart.md`

# Prism Apex – Dev Quickstart

This guide gives you three one-liners to prove the MVP works locally without real credentials.

---

## 0) Prereqs

- Node 20+
- npm workspaces installed (`npm ci` at repo root)
- (Optional) Docker if you want to run the API in containers

---

## 1) Seed the API store (safe demo state)

```bash
make seed
```

Outputs: `.data/state.json` with demo tickets, recipients, and risk context.

## 2) Run a sample backtest (ORB on ES 1m)

```bash
make backtest
```

Outputs:

- `out/es_orb_sample.json` (summary)
- `out/es_orb_sample-fills.csv`
- `out/es_orb_sample-daily.csv`

## 3) Full demo script

```bash
make demo
```

Builds CLI, runs backtest, writes results to `./out`.

### What you should see

- JSON summary printed to console.
- CSV files with fills and per-day PnL.
- No network calls or secrets required.

---

## Next Steps

- Point the API to read-only Tradovate credentials (when ready).
- Connect Slack/Telegram tokens to receive alerts (Prompt 18).
- Follow the Operator Handbook (Prompt 21) for the manual input workflow.

---

**QUALITY GATES (must pass)**

- `make seed` creates `.data/state.json` without errors.
- `make backtest` writes `out/es_orb_sample.*` files and prints a JSON summary.
- `make demo` runs end-to-end without external dependencies.
- All new TS compiles with `tsc` (strict) and no `any`.

**COMPLETION CHECK**  
Files created/updated:

- `data/ES_1m.sample.csv`
- `apps/api/scripts/seed.ts`
- `apps/cli/scripts/demo.sh`
- `Makefile` (new targets)
- `docs/dev/quickstart.md`



---
**From:** `docs/export.md`

# Ticket export

`GET /export/tickets?date=YYYY-MM-DD&format=json|csv&accountId=ID`

Exports tickets for a given UTC date. The default `format` is `json`. Use `format=csv` for a compact CSV output. When `accountId` is supplied and the account exists, sizing suggestions are included.

## JSON example

```json
[
  {
    "when": "2024-08-24T12:00:00Z",
    "symbol": "ES",
    "side": "BUY",
    "qty": 1,
    "entry": 1,
    "stop": 0,
    "target": 2,
    "accepted": true,
    "rr": 2,
    "reasons": [],
    "preCloseSuppressed": false,
    "flatByUtc": "20:59",
    "sizeSuggested": 2,
    "sizeAllowed": 2,
    "halfSizeSuggested": false,
    "overAllowed": false,
    "jumpExceeded": false
  }
]
```

## CSV example

```
ts,symbol,side,entry,stop,target,rr,accepted,reason_summary,pre_close,flat_by_utc,size_suggested,size_allowed,half_size_suggested,over_allowed,jump_exceeded
2024-08-24T12:00:00Z,ES,BUY,1,0,2,2,true,,false,20:59,2,2,false,false,false
```

Sizing fields appear only when `accountId` is provided and an account file exists in the data directory. `sizeAllowed` mirrors `sizeSuggested` for backward compatibility. `overAllowed` and `jumpExceeded` appear when the stored ticket includes a `qty`.



---
**From:** `docs/multi-account/guide.md`

# Multi-Account Management — Operator Guide

## What This Does

- Shows all your Apex accounts grouped by **trader group** (you).
- **Blocks hedging**: you cannot be long and short the same symbol across your accounts.
- **Copy-Trade** helper: generates same-direction tickets per account with safe sizes.

## Plain English Rules

- **No Hedging:** If one account is **BUY ES**, another account in your group **cannot** be **SELL ES** at the same time.
- **Same Direction Copying:** You may place the **same direction** across your accounts if each account obeys its own limits.
- **Sizing:** We cap sizes by each account’s `maxContracts`. If a funded account has no buffer, we auto **half-size**.

## How to Use

1. Open the dashboard → **Multi-Account** section.
2. Click **Preview Copy-Trade** on your group.
3. If preview is ✅, the system lists per-account tickets for you to enter in Tradovate.
4. If ❌ shows **would_create_hedge**, you must close the opposite position first.

## Alerts & Logs

- Any detected hedge triggers a **🚫 Slack/Email alert** and appears in **audit logs**.
- All copy-trade generations are logged as **OPERATOR_ACTION**.

```mermaid
flowchart TD
    A[Strategy Ticket] --> B[Copy-Trader Preview]
    B -->|OK| C[Per-Account Tickets (Same Direction)]
    B -->|Hedge| D[BLOCK + Alert]
    C --> Operator[Manual Entry in Tradovate]
```



---
**From:** `docs/notifications/guide.md`

# Prism Apex Tool — Notifications Guide

## What It Does

- Sends alerts via **Slack** and **Email**.
- Covers:
  - Guardrail breaches (Apex rules).
  - Payout readiness.
  - CI/CD deployment results.

## How to Set Up

1. Create a Slack Incoming Webhook.
2. Add SMTP email credentials (Gmail works).
3. Copy `.env.example` → `.env` and fill in values.

## Test It

```bash
make notify-test
```

## Notification Flow

```mermaid
flowchart TD
    A[Guardrail Breach] --> N[Notify Service]
    B[Payout Ready] --> N
    C[CI/CD Event] --> N
    N -->|Slack| S[Operator Slack Channel]
    N -->|Email| E[Operator Email Inbox]
```



---
**From:** `docs/operator/handbook.md`

# Prism Apex Tool – Operator Handbook

---

## 1. Start of Day Checklist

### Step-by-step

1. Open your browser and log in to the **Prism Apex Dashboard**.
2. Review the dashboard home page.
3. Confirm system health:
   - Trade tickets display current signals.
   - Alerts panel is empty.
   - Account status shows correct balance and margin.
4. Verify trading session open times:
   - CME Futures open **9:30 AM ET (14:30 GMT)**.
   - Prism Apex Tool begins generating tickets from this time.
5. Log in to **Tradovate** and keep the order entry panel ready.
6. Ensure Slack/Telegram connection for automated alerts.

[Placeholder: screenshot of dashboard home]

```mermaid
flowchart TD
    A[Login to Dashboard] --> B[Check Tickets & Alerts]
    B --> C[Verify Account Status]
    C --> D{Market Open?}
    D -->|No| E[Wait until 14:30 GMT]
    D -->|Yes| F[Ready for Trade Input]
```

---

## 2. During Session

### 2.1 Inputting Trades

1. On the dashboard, review each trade ticket (symbol, side, entry, stop, target).
2. In **Tradovate**, manually enter orders with matching values.
3. Include stop-loss and target on every order (**Apex rule**).
4. Confirm the order is accepted in Tradovate and visible on the dashboard.

[Placeholder: screenshot of ticket table]
[Placeholder: screenshot of Tradovate order entry]

### 2.2 Monitoring Alerts

- Alerts panel refreshes every 5 seconds.
- Watch for:
  - Daily loss cap approaching
  - Trailing drawdown breach
  - Scaling exceeded
  - Flat required (EOD)

### 2.3 Responding to Pause Conditions

1. If a **"System Paused"** alert appears:
   - Do **not** enter new trades.
   - Close any pending entries if instructed.
   - Notify Solutions Architect via Slack/Telegram.
2. Resume only when the dashboard shows **"System Active"**.

---

## 3. End of Day (EOD) Close

### Step-by-step

1. At **4:45 PM ET (21:45 GMT)** begin wind-down.
2. Ensure all trades are closed by **4:59 PM ET (21:59 GMT)** (Apex rule: daily flat).
3. Check dashboard Account Status → confirm no open positions or working orders.
4. Export or screenshot the daily dashboard summary.
5. Verify Slack/Telegram confirmation message is received.

```mermaid
flowchart TD
    A[16:00 ET / 21:00 GMT] --> B[Check Open Positions]
    B --> C{Any open?}
    C -->|Yes| D[Close in Tradovate]
    D --> B
    C -->|No| E[Wait for System Confirm]
    E --> F[EOD Flat Achieved]
```

[Placeholder: screenshot of flat positions screen]

---

## 4. Incident Steps & Escalation

### 4.1 Platform/API Down

1. Pause trading immediately.
2. Attempt one reconnect.
3. If unresolved → notify **Project Manager (PM)** and **Solutions Architect**.
4. Document the outage in the daily log.

### 4.2 Ticket Cannot Be Entered

1. Retry order entry once.
2. If still failing → flag in Slack `#ops-incidents`.
3. Record the issue in the daily log and wait for guidance.

### 4.3 Rule Breach Alert Triggered

1. Stop trading immediately.
2. Close any open positions.
3. Notify **Senior Operator**.
4. Wait for clearance before resuming.

### Escalation Path

- Primary contact: **PM**
- Secondary contact: **Solutions Architect**
- Tertiary contact: **Senior Operator**

```mermaid
flowchart TD
    A[Incident Detected] --> B[Project Manager]
    B --> C[Solutions Architect]
    C --> D[Senior Operator]
```

---

## 5. Glossary

- **ORB (Opening Range Breakout)** – Trade triggered when price breaks the first 15–30 minute range.
- **VWAP (Volume Weighted Average Price)** – Average price weighted by volume; benchmark for fair value.
- **Trailing Drawdown** – Apex rule: peak balance minus fixed buffer; breaching this pauses trading.
- **Scaling** – Limiting contract size based on account balance.
- **Stop-loss** – Pre-set order to exit a trade if it moves against us.
- **Flat** – No open positions or working orders.

---



---
**From:** `docs/operator/quick-cards/cheat-sheet.md`

# Cheat Sheet — Terms & Times

## Terms (Plain English)

- **ORB (Open Session Breakout):** Trade the break of the first ~15m range after open.
- **VWAP:** Volume-weighted average price; “fair” intraday benchmark.
- **OCO:** One-Cancels-the-Other (Stop + Target paired).
- **Flat:** No open positions.
- **≤5R:** Max target is 5× risk distance from entry to stop.
- **Consistency:** In funded mode, one day’s profit should not exceed ~30% of period profit.

## Times (GMT)

- **Session focus (CME RTH):** 14:30–21:59 GMT
- **EOD alerts:** T–10 (20:49–20:54), T–5 (20:55–20:59), **Flat by 21:59**

## Quick Math

- **R (Risk):** |Entry − Stop|
- **5R target:** Entry ± 5×R (system clamps automatically)

## Do / Don’t

- **Do:** Follow tickets exactly; confirm OCO; watch alerts.
- **Don’t:** Trade after 21:59 GMT; ignore CRITICAL alerts.



---
**From:** `docs/operator/quick-cards/eod-flat.md`

# Quick Card — End-of-Day Flat (21:59 GMT)

**Goal:** Be **flat** (no positions) by **21:59 GMT**.

## Timeline (GMT)

- **20:49–20:54:** System sends **WARN** “EOD T–10”.
- **20:55–20:59:** System sends **CRITICAL** “EOD T–5”.
- **21:59:** Must be **FLAT**.

## Steps

1. Check **open positions** in Tradovate — close if any.
2. Verify **dashboard** shows no open positions.
3. Capture daily summary (export or screenshot).
4. Post **EOD flat** confirmation in Slack.

## Do / Don’t

**Do:** Close early if in doubt.  
**Don’t:** Carry any position past **21:59 GMT**.

[Placeholder: screenshot flat confirmation]



---
**From:** `docs/operator/quick-cards/execute-ticket.md`

# Quick Card — Execute a Ticket (Tradovate Manual Entry)

**Goal:** Enter the system’s ticket with OCO **Stop + Target**.

## Steps

1. In dashboard **Tickets**, pick the next ticket.
   - Fields: symbol, side, **entry**, **stop**, **target**, size.
2. Open **Tradovate** order ticket for the same symbol/account.
3. Select **OCO / Bracket** order type (Stop + Target).
4. Fill **Entry**, **Stop**, **Target**, **Size** exactly as shown.
5. Review → **Submit**.
6. Confirm in Tradovate **Working Orders** that OCO is present.
7. Record the ticket ID in the daily log.

## Checks

- Stop present? **Yes** (mandatory)
- Target ≤ **5R**? (System ensures; verify number)
- No **Pause** flag on dashboard? (If **Pause**, do not submit)

## Do / Don’t

**Do:** Double-check symbol & account before submit.  
**Don’t:** Modify ticket values unless instructed by PM/SA.

[Placeholder: screenshot Tradovate OCO ticket]



---
**From:** `docs/operator/quick-cards/incidents-&-escalation.md`

# Quick Card — Incidents & Escalation

**Goal:** Stay safe, fast, and compliant.

## Common Incidents

- **Platform/API down** → Pause trading; notify PM/SA.
- **Cannot enter ticket** → Log issue; skip ticket; escalate.
- **OCO missing** → **CRITICAL** alert; hard **Pause**; fix order.
- **Daily loss/consistency breach** → Flatten; escalate.

## Escalation Path

1. Post 1-liner in **#ops-incidents** (time, symbol, issue).
2. DM **Solutions Architect**, then **IT PM**, then **CTO** (as needed).

## Break-Glass

- If a position is at risk → **CLOSE FIRST**, then escalate.

[Placeholder: Slack incident snippet]



---
**From:** `docs/operator/quick-cards/monitor-&-alerts.md`

# Quick Card — Monitor & Alerts

**Goal:** React quickly to warnings and blocks.

## Alert Types

- **WARN (amber):**
  - Daily loss ≥70% cap
  - Consistency (funded) ≥25%
  - EOD T–10 window
- **CRITICAL (red):**
  - Daily loss ≥85% cap
  - Missing OCO
  - Consistency (funded) ≥30%
  - EOD T–5 window

## What To Do

- **WARN:** Slow down; prepare to flatten or skip new tickets.
- **CRITICAL:** **Stop** new entries. Verify positions. Escalate if needed.

## Tools

- Dashboard **alerts panel** (refresh ~5–60s).
- Slack/Email notifications from system.
- `/jobs/status` for recent job run times and flags.

[Placeholder: screenshot alert banner]



---
**From:** `docs/operator/quick-cards/sod-checklist.md`

# Quick Card — Start of Day (SOD)

**Goal:** Be fully ready when the session opens.

## Checklist

- [ ] Open **Prism Apex Dashboard** → `/health` shows **OK**.
- [ ] Check **/jobs/status** → no stale errors; `ocoMissing=false`.
- [ ] Confirm **notifications** work (Slack/Email visible).
- [ ] Verify **session times** (CME RTH): **14:30–21:59 GMT** (MVP focus).
- [ ] Confirm **account** and **symbol universe** for the day (ES, NQ; or as configured).
- [ ] Read any **operator notes** in Slack.

## Do / Don’t

**Do:** Keep Slack open.  
**Don’t:** Enter trades before session open.

[Placeholder: screenshot dashboard health]



---
**From:** `docs/operator/training-deck.md`

# Prism Apex Tool — Operator Training Deck (MVP)

## 1) Context & Roles

- **What you do:** Manually key trades into **Tradovate** from system-generated **tickets**.
- **What you don’t do:** You **do not** pick instruments, sides, or sizes.
- **Why:** Apex rules require strict guardrails; our system computes signals and monitors risk.

## 2) Daily Flow (High-Level)

1. **SOD:** Health check → recipients → session time.
2. **Execute:** Read ticket → enter order in Tradovate **with OCO stop + target**.
3. **Monitor:** Watch alerts (Slack/Email) and dashboard status.
4. **EOD:** **Flat by 21:59 GMT** → confirm zero positions.
5. **Incidents:** Use the escalation playbook.

```mermaid
flowchart TD
    A[SOD Checks] --> B[Read Ticket]
    B --> C[Enter in Tradovate (OCO)]
    C --> D[Monitor Alerts & Rules]
    D --> E[EOD Flat by 21:59 GMT]
    D --> F{Alert?}
    F -->|WARN/CRIT| G[Pause & Escalate]
```

## 3) Tickets (Plain English)

A ticket contains: symbol, side (BUY/SELL), entry, stop, target, size.

Stop is mandatory. Target is capped at ≤5R by our system.

If the dashboard shows Pause or OCO Missing, do not enter new trades.

## 4) Alerts (What They Mean)

WARN (amber): Approaching a limit (e.g., 70% daily loss). Be cautious.

CRITICAL (red): Breach imminent or detected (e.g., 85% daily loss; missing OCO). Stop and escalate.

EOD T–10 / T–5: Close out to be flat by 21:59 GMT.

## 5) EOD Flat (Non-Negotiable)

By 21:59 GMT, zero open positions.

The system nudges you but you own the final check.

## 6) Do / Don’t

**Do**
Double-check stop and target are attached (OCO).

Confirm account and symbol match the ticket.

Take screenshots of anomalies.

**Don’t**
Don’t freestyle entries or sizes.

Don’t trade past 21:59 GMT.

Don’t ignore CRITICAL alerts.

## 7) Escalation

Post in #ops-incidents with a one-liner (time, symbol, issue).

Ping Solutions Architect → IT PM → CTO (if needed).

If positions are at risk, close then escalate.

[Placeholder: screenshot of dashboard with tickets and alerts]



---
**From:** `docs/operator-console.md`


Operator Console Guide (Prism-Apex → Tradovate OCO)

You don’t need to code. Follow these steps exactly. Prism-Apex never places orders—you do, using the ticket details shown in the dashboard or API.

1) Find the Ticket

Open the local dashboard (or call the API):

GET /tickets?date=YYYY-MM-DD[&strategy=STRATEGY] → list of today’s tickets (optionally filter by strategy)

GET /export/tickets?date=YYYY-MM-DD → CSV export

Each ticket shows: symbol, side, entry, stop, target, qty, accountId, rr, sizingHint.

Quick Copy Format

When you copy from the ticket, use this exact line:

SYMBOL SIDE QTY ENTRY STOP TARGET


Example:

MESZ5 BUY 2 5550.25 5544.25 5560.25

2) Enter as OCO in Tradovate (Manual)

You’ll create one entry order and attach two linked exits (OCO: target + stop).

A. Entry

Select account shown on the ticket (e.g., APEX-123456).

Select contract = symbol (e.g., MESZ5).

Choose BUY or SELL (from side).

Type: use Limit at entry price (or Market if strategy specifies; default is Limit).

Qty: set to qty (sizingHint may recommend half-size).

Enable Bracket/OCO (Tradovate calls this Bracket or OSO).

Do not send yet.

B. Exits (OCO children)

Take Profit (Limit) at target.

Stop Loss (Stop/Stop-Market) at stop.

Tip: If Tradovate uses ticks for offsets, just switch to absolute price mode and type the prices directly.

C. Submit

Send the bracketed order.

After the entry fills, the two exits become active OCO legs. If one exits, the other auto-cancels.

3) Fanout (Same Ticket to Multiple Accounts)

If you operate multiple Apex accounts:

Repeat the exact OCO entry per account.

If the ticket’s qty is per account, keep it.
If it’s total size, divide by number of accounts and round down.

Keep identical prices across accounts to preserve the intended risk:reward.

4) Rejection Codes (what the console will show)

A ticket may be rejected (you won’t enter it). Reasons appear on the ticket as a list:

STOP_REQUIRED: Stop is required by policy.

STOP_SIDE_INVALID: Stop not on the safe side for the side (buy/sell).

RR_OUT_OF_RANGE: Risk:Reward outside [min,max].

SIZE_CLAMPED: Size reduced by policy (anti-windfall / half-size until buffer).

TRAILING_DRAWDOWN: Account drawdown risk exceeded.

EOD_WINDOW: Inside End-Of-Day flat window (no new positions).

OUT_OF_HOURS: Strategy session closed.

CONFIG_DISABLED: Strategy turned off by config/schedule.

DUPLICATE_SIGNAL: De-dupe caught a repeat.

SYMBOL_INVALID: Contract/symbol not tradeable under current rules.

If a ticket shows accepted=false, do not enter it.

5) EOD Countdown

The console shows time remaining until the EOD flat window starts.

When countdown reaches zero:

New tickets are suppressed (you won’t see any accepted=true).

Manage any open positions normally inside Tradovate as per your plan.

6) Quick Troubleshooting

No tickets appear: strategy may be disabled or out of session; check the countdown and config.

Prices look off: confirm contract month (e.g., MESZ5) and decimal format.

Size changes: sizingHint may be half-size due to risk buffer; follow the qty in the ticket.

Account mismatch: ensure the Tradovate account in the top-right matches accountId on the ticket.

7) Reference Shapes (read-only)

JSON Ticket

{"symbol":"MESZ5","side":"BUY","entry":5550.25,"stop":5544.25,"target":5560.25,"qty":2,"accountId":"APEX-123456","timestampUtc":"2025-09-09T14:31:22Z","meta":{"strategy":"vwap-first-touch","rr":1.5,"guardrails":["stopSideOk","rrInRange"],"sizingHint":"half-size"},"accepted":true,"reasons":[]}


CSV Export (columns)

symbol,side,entry,stop,target,qty,accountId,timestampUtc,strategy,rr,accepted,reasons,sizingHint


That’s it. Copy the line, enter the OCO, and you’re done.



---
**From:** `docs/payouts/calendar.md`

# Prism Apex Tool — Payout Calendar

## Rules Recap

- **First payout**: After 10 trading days AND $1,000 net profit.
- **Cycle**: Every 14 days after first payout.
- **Amounts**:
  - 100% of first $25,000.
  - 90% of profits above $25,000.

## Current Account Example

- Trading days completed: 12
- Total profit: $2,050
- Eligible? **Yes**
- Next payout date: 2025-09-01
- Estimated payout: $2,050

_All dates are in UTC/GMT._

## Mermaid Flow

```mermaid
flowchart TD
    A[10+ Days + $1k Profit?] -->|No| B[Not Eligible]
    A -->|Yes| C[Eligible for Payout]
    C --> D[First $25k → 100%]
    D --> E[Above $25k → 90%]
    C --> F[Next Payout in 14 Days]
```

[Placeholder: operator calendar screenshot]



---
**From:** `docs/ports-and-env.md`

# Ports & Environment Notes

The local stack exposes two primary ports by default:

- **8080** – Prism Apex API (compose service `api`).
- **5178** – Dashboard Lite / operator UI.

They are currently documented directly inside `README-dev.md` and compose files. To reduce drift and make overrides easier, prefer exporting the ports via environment variables, for example:

```env
API_PORT=8080
DASH_PORT=5178
```

You can then reference these variables inside compose overrides or `.env` files. This change does not modify any Docker compose files yet—it simply notes the convention so future updates can centralise port management.

Remember: runtime remains **tickets-only**. These ports expose telemetry and operator dashboards; no automated order placement endpoints exist.



---
**From:** `docs/release/checklist.md`

# Release Checklist — Prism Apex Tool

## Preflight

- [ ] All unit tests pass (`make test`)
- [ ] All guardrail monitors pass (`make guardrails:test`)
- [ ] Simulator run successful (`make simulate`)

## Operator Signoff

- [ ] Operator confirms panic button works
- [ ] Operator confirms notifications (Slack/Email) received
- [ ] Operator confirms training mode works

## PM Signoff

- [ ] PM validates checklist complete
- [ ] Version bump confirmed

## Release

- [ ] Run `make release VERSION=vX.Y.Z`
- [ ] GitHub Actions pipeline must pass
- [ ] Tag pushed and CI confirms release



---
**From:** `docs/release/go-live-checklist.md`

# Prism Apex Tool — Go-Live Master Checklist (Oct 1)

**Owners:** Sean (CTO), Craig (CEO), Solutions Architect, IT PM, Lead Operator  
**Environment:** Production (single Ubuntu host, Docker)  
**Decision Gate:** All boxes ✅ before enabling live operations on Oct 1.

---

## 1) Infrastructure & Deploy

- [ ] Server specs validated against plan (CPU/RAM/disk/network).
- [ ] OS updated and rebooted within last 7 days.
- [ ] Docker + compose plugin installed (see `infra/scripts/bootstrap.sh`).
- [ ] `infra/docker-compose.prod.yml` present on server.
- [ ] `infra/.env.prod.example` copied to `${PROD_STACK_DIR}/.env` with real values.
- [ ] GitHub Actions `deploy` workflow green on the latest tagged release.
- [ ] `http://<server>:8080/health` returns `{ ok: true }`.
- [ ] `http://<server>/` dashboard loads.

## 2) Configuration & Secrets

- [ ] TRADOVATE read-only credentials stored in `.env` (no write permissions).
- [ ] TradingView `TRADINGVIEW_WEBHOOK_SECRET` set (if alerts used).
- [ ] SMTP/Telegram/Slack/Twilio tokens loaded (optional; at least one required).
- [ ] `DAILY_LOSS_CAP_USD` configured to Apex account level.
- [ ] Timezone assumptions documented as GMT/UTC in Operator Handbook.

## 3) Notifications (at least one must work)

- [ ] `/notify/register` called with recipients (Slack channel ID or email).
- [ ] `/notify/test` returns transports OK (non-200 is a blocker).
- [ ] Operator sees test alert in chosen channel (screenshot captured).

## 4) Signals & Tickets (MVP manual flow)

- [ ] TradingView → Webhook → `/ingest` (or equivalent) verified with HMAC.
- [ ] `/signals/preview` normalizes to ≤5R target and blocks invalid tickets.
- [ ] `/tickets/commit` creates ticket visible on dashboard.
- [ ] Operator can manually key ticket into **Tradovate** with matching Stop + Target.
- [ ] Missing OCO triggers **CRITICAL** alert and dashboard **Pause** flag.

## 5) Guardrails & Rules (Apex)

- [ ] EOD window alerts fire at **20:49–20:54 (WARN)** and **20:55–20:59 (CRITICAL)** GMT.
- [ ] Daily loss proximity alerts at **≥70%** (WARN) and **≥85%** (CRITICAL).
- [ ] Consistency proximity alerts in funded mode at **≥25%/≥30%**.
- [ ] Stop-loss required — tickets without stops are **blocked** in preview.
- [ ] Dashboard shows **flat** state at EOD (no open positions).

## 6) Observability & Logs

- [ ] API logs include request IDs and warning/error lines are visible with `docker compose logs`.
- [ ] `/jobs/status` shows recent run times and `flags.ocoMissing` = false in steady state.
- [ ] Disk space > 20% free; log rotation plan in place.

## 7) Security & Access

- [ ] SSH keys restricted to deployment user.
- [ ] No secrets committed to repo; all via GitHub Secrets or server `.env`.
- [ ] Dashboard behind allowed IPs or temporary auth (MVP), documented.

## 8) Operator Handbook & Training

- [ ] Operators trained on **handbook** (SOD, During Session, EOD, Incidents).
- [ ] Dry-run session completed with sample tickets and screenshots.
- [ ] Escalation tree clear (names, Slack handles, phone on file).

## 9) UAT Completion

- [ ] All **UAT scenarios** in `docs/release/uat-scenarios.md` show **PASS**.
- [ ] Evidence (screens, JSON exports) archived in `/evidence/YYYY-MM-DD`.

## 10) Executive Sign-Off

- [ ] `docs/release/sign-off-template.md` completed with signatures/dates.

**Final Decision:**

- [ ] ✅ GO LIVE on Oct 1
- [ ] ❌ BLOCKED (attach reason)



---
**From:** `docs/release/operator_signoff.md`

# Operator Release Signoff — Plain English

## Why This Matters

We need to be sure Prism Apex Tool is safe to run under Apex rules.

## What You Do

1. Run `make simulate` → confirms rules are respected.
2. Run `make guardrails:test` → ensures brakes work.
3. Test panic button in dashboard → system must stop.
4. Confirm Slack/Email alerts arrive.
5. Confirm training mode works (`make training`).

If all checks pass:

- Tell PM "OK to release."
- PM will tag the release.

If any checks fail:

- Stop and report back.



---
**From:** `docs/release/runbook-rollback.md`

# Prism Apex Tool — Rollback & Incident Runbook

**Priority:** Restore safe operations quickly, protect Apex compliance, prevent irreversible loss.

---

## 1) Immediate Actions

- [ ] Announce incident in Slack `#ops-incidents` (include time, symptoms).
- [ ] **Pause** new tickets (dashboard Pause or temporary block in API).
- [ ] Verify positions in Tradovate — **flatten** if risk is elevated.

## 2) Quick Diagnostics (5–10 min)

- [ ] `GET /health` — should be OK.
- [ ] `docker compose ps` — containers running.
- [ ] `docker compose logs --since=10m` — check errors.
- [ ] `/jobs/status` — lastOk timestamps present.

## 3) Rollback (Tag N → N-1)

- [ ] Select previous tag (e.g., `v0.1.2` → `v0.1.1`).
- [ ] Run:

```bash
TAG=v0.1.1 make deploy
```

- [ ] Confirm health:

```bash
curl -fsS http://<server>:8080/health
```

- [ ] Open dashboard `/`

## 4) Data Safety

- Volumes preserved; no destructive migrations in MVP.
- Backup `.env` and `.data/state.json` before manual edits.

## 5) Recovery & Resume

- Clear dashboard **Pause** flag when safe.
- Announce resolution in Slack with incident summary.
- Create follow-up ticket for root cause & action items.

## 6) Post-Mortem Template

- What happened:
- Impact window:
- Root cause:
- Actions taken:
- Preventative measures:
- Owners & due dates:



---
**From:** `docs/release/sign-off-template.md`

# Prism Apex Tool — Executive Go-Live Sign-Off

**Project:** Prism Apex Tool (Path 1b — Prop-Firm Equities/Futures Trading)  
**Go-Live Date:** Oct 1 (GMT)

---

## Summary

- MVP Scope: Manual execution via Tradovate; strategies ORB + VWAP.
- Risk Controls: Apex guardrails enforced (EOD flat, daily loss proximity, consistency, stop-loss, ≤5R).
- Monitoring: Email/Telegram/Slack alerts + background jobs.
- Deployment: Docker on single Ubuntu host; health-gated.

---

## Readiness Checklist Status

- Go-Live Master Checklist: **All items ✅**
- UAT Scenarios: **All PASS** (see `docs/release/uat-scenarios.md`)

---

## Residual Risks (Known & Accepted)

- Manual order entry risk (operator error) — mitigated by ticket UI + OCO + alerts.
- Bar-level backtest approximation — conservative execution assumptions.
- Single-host deployment — acceptable for MVP; DR plan documented.

---

## Approval

**CTO (Sean):**  
Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Date: \***\*\_\_\*\***

**CEO (Craig):**  
Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Date: \***\*\_\_\*\***

**Solutions Architect:**  
Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Date: \***\*\_\_\*\***

**IT PM:**  
Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\*** Date: \***\*\_\_\*\***



---
**From:** `docs/release/uat-scenarios.md`

# Prism Apex Tool — UAT Scenarios & Scripts

**Goal:** Prove MVP works end-to-end with manual execution and Apex guardrails before Oct 1.  
**Test Window:** Preferably same time window as live operations. All times GMT.

---

## Legend

- **Actor:** System / Operator
- **Input:** What to do
- **Expected:** Pass criteria
- **Evidence:** What to capture (screenshot/json)

---

## UAT-01 Health & Deploy

- **Actor:** System
- **Input:** `GET /health`
- **Expected:** `{ ok: true }`
- **Evidence:** cURL output saved

---

## UAT-02 Notifications (Slack or Email)

- **Actor:** System
- **Input:** `POST /notify/test { "message": "UAT-02", "level": "INFO", "tags": ["UAT"] }`
- **Expected:** At least one transport returns OK; operator sees message
- **Evidence:** Slack/email screenshot

---

## UAT-03 Signal Preview — ORB

- **Actor:** System
- **Input:** `POST /signals/preview` with an ORB long (entry=5000, stop=4990, target=5025, size=1, mode="evaluation")
- **Expected:** `normalized.target` ≤ 5R; `block=false`; reasons empty or informational
- **Evidence:** JSON response saved

---

## UAT-04 Ticket Commit — ORB

- **Actor:** System → Operator
- **Input:** `POST /tickets/commit` using normalized values from UAT-03; Operator keys order in **Tradovate** with Stop+Target OCO
- **Expected:** Ticket appears on dashboard; Tradovate shows working order with linked OCO
- **Evidence:** Dashboard + Tradovate screenshots

---

## UAT-05 Missing OCO Detected

- **Actor:** Operator (negative test)
- **Input:** Enter a dummy order **without** OCO on Tradovate (test/sim)
- **Expected:** Within 15s, **CRITICAL** alert + dashboard **Pause** flag
- **Evidence:** Alert screenshot + `/jobs/status` showing `flags.ocoMissing=true`

---

## UAT-06 Daily Loss Proximity (Simulated)

- **Actor:** System
- **Input:** Set `DAILY_LOSS_CAP_USD=100` (temp) and seed negative PnL via backtest hook or mock
- **Expected:** WARN at ≥70%, CRITICAL at ≥85%
- **Evidence:** Alert screenshots; `/rules/status` JSON

---

## UAT-07 EOD Alerts

- **Actor:** System
- **Input:** Temporarily stub time to fall inside **20:49–20:54** and **20:55–20:59** GMT windows
- **Expected:** WARN then CRITICAL emitted once per day
- **Evidence:** Alert transcripts or logs; `/jobs/status` timestamps

---

## UAT-08 Consistency Proximity (Funded Mode)

- **Actor:** System
- **Input:** Set `store.setPeriodProfit(1000)` and `store.setTodayProfit(310)` (test route or script)
- **Expected:** CRITICAL alert (≥30%)
- **Evidence:** Alert screenshot; `/rules/status` JSON

---

## UAT-09 VWAP Ticket Lifecycle

- **Actor:** System → Operator
- **Input:** `POST /signals/preview` for VWAP; then `POST /tickets/commit`; operator keys into Tradovate with OCO
- **Expected:** Same as ORB flow; block if missing stop/invalid R
- **Evidence:** JSON + screenshots

---

## UAT-10 End-of-Day Flat

- **Actor:** Operator
- **Input:** Before **21:59 GMT**, close any open trades; verify no positions remaining
- **Expected:** Dashboard shows **flat**; system sends EOD confirmation alert
- **Evidence:** Dashboard flat screen + alert screenshot

---

## UAT-11 Readiness Reports

- **Actor:** System
- **Input:** `GET /reports`
- **Expected:** JSON shows realistic metrics (win_rate, avg_r, max_dd, rule_breaches)
- **Evidence:** JSON saved

---

## UAT-12 OpenAPI & SDK Smoke

- **Actor:** System
- **Input:** `GET /openapi.json` then call a couple of SDK methods (`getHealth`, `listTickets`)
- **Expected:** SDK returns valid objects without runtime errors
- **Evidence:** Console output + snippet

---

## UAT Summary Table (to be completed)

| ID     | Result (PASS/FAIL) | Owner | Evidence Link | Notes |
| ------ | ------------------ | ----- | ------------- | ----- |
| UAT-01 |                    |       |               |       |
| UAT-02 |                    |       |               |       |
| UAT-03 |                    |       |               |       |
| UAT-04 |                    |       |               |       |
| UAT-05 |                    |       |               |       |
| UAT-06 |                    |       |               |       |
| UAT-07 |                    |       |               |       |
| UAT-08 |                    |       |               |       |
| UAT-09 |                    |       |               |       |
| UAT-10 |                    |       |               |       |
| UAT-11 |                    |       |               |       |
| UAT-12 |                    |       |               |       |



---
**From:** `docs/rules/overview.md`

# PrismOne Rules Overview

PrismOne embeds Apex Trader Funding rules to maintain profitability and
operational discipline. The platform differentiates between evaluation
and funded accounts, applying appropriate controls for each stage.

## Evaluation Accounts

- **Profit Target** – account must reach the configured profit target
  before advancing.
- **Trailing Drawdown** – balance may not fall more than the defined
  amount below the high-water mark.
- **Minimum Trading Days** – at least seven unique trading days are
  required.
- **End-of-Day Flat** – no positions may remain open after the allowed
  trading session.
- **Allowed Trading Times** – trades outside the configured session are
  flagged for review.

## Funded Accounts

- **30% Consistency Rule** – profit from any single day may not exceed
  30% of total profits.
- **Stop-Loss Requirement** – every trade must carry a protective
  stop-loss order.
- **Scaling Limits** – contract counts are capped until trailing
  drawdown is cleared.
- **Payout Rules** – eligibility requires minimum trading days,
  profitable days, and observes payout caps.
- **Forbidden Strategies** – predefined strategies are automatically
  rejected.

## Operator Checklist

| Rule / Control        | Enforced Automatically | Notes                                              |
| --------------------- | ---------------------- | -------------------------------------------------- |
| Trailing Drawdown     | ✅                     | Both phases emit violations when breached          |
| Minimum Trading Days  | ✅                     | Evaluation module tracks unique trading days       |
| End-of-Day Flat       | ✅                     | Evaluation module raises events for open positions |
| Consistency Rule      | ✅                     | Funded module validates 30% limit                  |
| Stop-Loss Presence    | ✅                     | Funded module requires stop-loss on each trade     |
| Payout Caps           | ✅                     | Funded module computes capped payouts              |
| Discretionary Conduct | ⚠️                     | Operators monitor for reckless behaviour           |

## Technical References

- [Evaluation Rules Module](../../rules/evaluation.py)
- [Funded Rules Module](../../rules/funded.py)
- [Unified Rule Engine](../../rules/engine.py)



---
**From:** `docs/safe_cleanup.md`

<!-- BEGIN: SAFE_CLEANUP_DOC -->
# Safe Cleanup Script (`safe_cleanup.sh`)


> **TL;DR**
> - Preview (dry-run): `./safe_cleanup.sh`
> - Execute locally (prompted): `DRY_RUN=0 ./safe_cleanup.sh`
> - CI/scripted (no prompt, logged): `AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log`

_Last updated: 2025-10-01_


A **safe-by-default** helper that removes **only untracked files** within a tight allow-list of cache/scratch locations. It runs from the repo root, defaults to **dry-run**, prints a plan, and appends a timestamped summary to `docs/YAHOO_DATA_CLEANUP.md`.

---

## Contents
- [Quick Start](#quick-start)
- [Behavior Matrix](#behavior-matrix)
- [Exit Codes & Return Behavior](#exit-codes--return-behavior)
- [Allow-List & Directory Handling](#allow-list--directory-handling)
- [Logging & Audit Trail](#logging--audit-trail)
- [Usage Patterns & CI](#usage-patterns--ci)
- [Safety Guarantees](#safety-guarantees)
- [Why Untracked-Only?](#why-untracked-only)
- [Operator Checklist](#operator-checklist)
- [Operator Runbook Snippets](#operator-runbook-snippets)
- [Known Pitfalls](#known-pitfalls)
- [Security & PII](#security--pii)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Glossary](#glossary)
- [Tickets-Only Posture Reminder](#tickets-only-posture-reminder)
---
- [Platform Notes & Shell Equivalents](#platform-notes--shell-equivalents)
- [Operator Integration (Makefile / Justfile)](#operator-integration-makefile--justfile)
- [Contributing (Docs/Tooling)](#contributing-docstooling)
- [What Good Looks Like](#what-good-looks-like)
- [Maintenance & Ownership](#maintenance--ownership)
- [Prerequisites & Compatibility](#prerequisites--compatibility)
- [Env Vars Quick Reference](#env-vars-quick-reference)

## Quick Start
Preview (no deletions):
```bash
./safe_cleanup.sh
```

Execute interactively (you will be prompted):
```bash
DRY_RUN=0 ./safe_cleanup.sh
```

Run unattended (CI/script) and capture output:
```bash
AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
```

---

## Behavior Matrix
| Setting / Mode            | Default | Effect                                                                | Best For                      |
|---------------------------|---------|-----------------------------------------------------------------------|-------------------------------|
| `DRY_RUN=1`               | ✅      | Plan only; prints intended deletions.                                 | First pass / sanity check.    |
| `DRY_RUN=0`               | ❌      | Performs deletions limited to the allow-list.                         | Actual cleanup once vetted.   |
| `AUTO_YES=1`              | ❌      | Skips confirmation prompt (non-interactive environments).             | CI jobs, scripts, cron.       |
| `AUTO_YES=0` with a TTY   | ✅      | Prompts “Proceed with this plan?” before deleting.                    | Local interactive runs.       |
| Logging (always on)       | —       | Appends summary to `docs/YAHOO_DATA_CLEANUP.md` with ISO timestamp.   | Audit trail / operator notes. |

---

## Exit Codes & Return Behavior
| Code | Meaning             | Typical Cause / Action                                              |
|:----:|---------------------|---------------------------------------------------------------------|
| `0`  | Success             | Dry-run or execute completed as planned.                           |
| `1`  | Generic failure     | Not in a git repo, cannot change to repo root, or runtime error.   |
| `2`  | Usage error         | Unsupported flag or invalid invocation; rerun with defaults.       |
| `130`| Operator aborted    | You declined the confirmation prompt during interactive execution. |

> The script uses `set -euo pipefail` to fail fast. CI runners should set `AUTO_YES=1` to avoid hanging on prompts.

---

## Allow-List & Directory Handling
- Allow-listed roots: `backups/`, `data/`, `.cache/`, `cache/`, `caches/`, `tmp/`
- Build caches: `coverage/`, `.nyc_output/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.turbo/`, `.next/`, `.vercel/`, `build/`
- Uses `git ls-files --others --exclude-standard -z` to consider **untracked-only** entries
- Skips directories that contain tracked files (`git ls-files -- <dir>` check)
- Removes allow-listed directories only if they become empty after cleanup

---

## Logging & Audit Trail
Each run appends a section similar to:
```
## 2025-02-10T21:34:11-05:00
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /path/to/repo
Dry run: 0
-- Files to delete (untracked, in allow-listed dirs): 3
  - tmp/foo.log
```
Keep `docs/YAHOO_DATA_CLEANUP.md` in version control to share context across operators.

---

## Usage Patterns & CI
- Post-build tidy: clear `.next/`, `.turbo/`, or other caches between compose runs.
- Merge readiness: ensure scratch artifacts are gone before opening PRs.
- CI housekeeping: scheduled hygiene on ephemeral runners.

### CI Snippet
```yaml
- name: Safe cleanup of untracked caches
  run: AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh
```
> Decide whether to archive or discard the updated `docs/YAHOO_DATA_CLEANUP.md` in CI artifacts.

---

## Safety Guarantees
- Never deletes tracked files.
- Dry-run by default; destructive mode requires `DRY_RUN=0`.
- Confirmation prompt enforced unless `AUTO_YES=1`.
- Bound strictly to the allow-listed locations.

---

## Why Untracked-Only?
Caches, build outputs, and scratch data should be ignored by Git. Limiting deletions to untracked content prevents accidental removal of fixtures, migrations, or other tracked assets.

---

## Operator Checklist
1. Preview: `./safe_cleanup.sh`
2. Execute locally: `DRY_RUN=0 ./safe_cleanup.sh` (confirm when prompted)
3. Execute in CI/script: `AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log`
4. Verify: `git status -sb` (no unintended changes) and skim `docs/YAHOO_DATA_CLEANUP.md`
5. Optional: rerun Docker stack (`make up`)
6. Operate: follow the tickets-only posture; copy tickets into Tradovate manually

---

## Operator Runbook Snippets
- **Preview candidates (local):**
  ```bash
  ./safe_cleanup.sh
  ```
- **Interactive execute:**
  ```bash
  DRY_RUN=0 ./safe_cleanup.sh
  ```
- **CI / scripted execute with log:**
  ```bash
  AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
  ```
- **Verify workspace & tail log:**
  ```bash
  git status -sb
  tail -n 40 docs/YAHOO_DATA_CLEANUP.md
  ```
- **Optional follow-up (stack + tickets-cron logs):**
  ```bash
  make up \
    && sleep 8 \
    && docker compose logs --no-color tickets-cron | tail -n 120
  ```

---

## Known Pitfalls
- **No TTY during interactive run:** Without a TTY, the prompt can’t read input. Use `AUTO_YES=1` for non-interactive contexts.
- **Tracked files inside caches:** Directories containing tracked files are skipped intentionally. Remove or untrack them if you want the script to clean them.
- **Commit hooks noise:** Docs-only commits may print “No staged files match…”. If hooks stall or fail, re-run with `--no-verify` (docs-only).
- **CI log growth:** Repeated CI runs append to `docs/YAHOO_DATA_CLEANUP.md`. Decide whether to keep or reset it between runs.

---

## Security & PII
- Cleanup logs contain only relative file paths within the allow-listed directories; no credentials or PII are captured.
- It is safe to share the log within the team, but review entries before posting externally.
- In CI, either archive the log as an artifact for visibility or prune it if builds are ephemeral.

---

## FAQ
- **Shell lacks `mapfile` — will it fail?** No. The script uses a POSIX-friendly loop.
- **“No candidates” output — is something wrong?** Usually not; the tree may be clean or files are out of scope.
- **Does it delete Docker volumes or containers?** No. Only affects repo files. Use `docker compose down -v` separately if needed.

---

## Troubleshooting
### Docker daemon / `docker.sock` permission error
```
permission denied while trying to connect to the Docker daemon socket ...
```
1. Ensure Docker Desktop/daemon is running.
2. macOS: restart Docker Desktop if sockets become stale.
3. Linux: add user to `docker` group (`sudo usermod -aG docker $USER && newgrp docker`).
4. Remote contexts: `docker context use <context>`.

### Pre-commit hook loops
Docs-only commits may loop noisily. Bypass carefully with:
```bash
git commit -m "docs: update cleanup guide" --no-verify
```
Use `--no-verify` only for documentation-only changes.

---

## Glossary
- **Untracked:** Files not known to Git (`git ls-files --others --exclude-standard`).
- **Allow-list:** Explicit directories where deletions are permitted.
- **TTY:** Interactive terminal required for prompts when `AUTO_YES=0`.
- **CI:** Continuous Integration; non-interactive runners should set `AUTO_YES=1`.

---

## Tickets-Only Posture Reminder
Local maintenance only — no order placement and no strategy changes. Continue the operator flow: tidy → run Docker stack → manually copy tickets into Tradovate OCO orders.

### Platform Notes & Shell Equivalents
**macOS/Linux (POSIX shells like bash/zsh):**
```bash
./safe_cleanup.sh                # dry-run (default)
DRY_RUN=0 ./safe_cleanup.sh      # execute with prompt
AUTO_YES=1 DRY_RUN=0 ./safe_cleanup.sh | tee cleanup_real.log
```

**Windows PowerShell:**
```powershell
# Dry-run
./safe_cleanup.sh

# Execute with auto-yes and capture log
$env:AUTO_YES = "1"
$env:DRY_RUN  = "0"
./safe_cleanup.sh | Tee-Object -FilePath cleanup_real.log

# Optional cleanup
Remove-Item Env:AUTO_YES, Env:DRY_RUN -ErrorAction SilentlyContinue
```

**Windows Subsystem for Linux (WSL):**
Use the POSIX examples inside WSL. If the repo lives on the Windows filesystem, prefer a WSL path (e.g., `/home/...`) to avoid permission quirks.

---

## Operator Integration (Makefile / Justfile)
**Makefile**
```make
.PHONY: clean:safe
clean:safe:
	@AUTO_YES?=0 DRY_RUN?=1 bash -lc './safe_cleanup.sh'
# Examples:
#   make clean:safe                         # dry-run
#   make clean:safe DRY_RUN=0               # execute with prompt
#   make clean:safe DRY_RUN=0 AUTO_YES=1    # execute no prompt
```

**Justfile**
```just
# just clean-safe
clean-safe:
    AUTO_YES={{AUTO_YES | default("0")}} DRY_RUN={{DRY_RUN | default("1")}} ./safe_cleanup.sh
# Examples:
#   just clean-safe
#   just clean-safe DRY_RUN=0
#   just clean-safe AUTO_YES=1 DRY_RUN=0
```

---

## Contributing (Docs/Tooling)
- Keep PRs focused and small; scope to docs/tooling improvements.
- Never add automated order placement, liquidation logic, or other trading automation in this path.
- Target the `Test` branch (never main) and note operator impact in the PR description.

### What Good Looks Like

**Dry-run (expected):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 1

-- Files to delete (untracked, in allow-listed dirs): 0
  (none)

-- Directories to delete recursively (build caches): 2
  - .next
  - .turbo
(auto-continue: dry-run or AUTO_YES set or non-interactive)
[DRY-RUN] No deletions performed.
```

**Execute with AUTO_YES (expected when there are candidates):**
```text
=== SAFE CLEANUP (UNTRACKED ONLY) ===
Git root: /…/prism-apex-tool-Test
Dry run: 0

-- Files to delete (untracked, in allow-listed dirs): 3
  - tmp/sim.log
  - data/snap/cache.bin
  - .cache/test.idx

-- Directories to delete recursively (build caches): 1
  - .turbo

removed dir .turbo
deleted tmp/sim.log
deleted data/snap/cache.bin
deleted .cache/test.idx
rmdir tmp (empty)
Done.
```

> If the output lists tracked files or non-allow-listed paths, **stop and investigate** before proceeding.

### Maintenance & Ownership
- **Owners**: Tooling/Docs maintainers (this path is docs/tooling-only).
- **Scope**: Do **not** introduce order placement, liquidation logic, or strategy changes here.
- **How to contribute**: Open a small PR to `Test` with operator impact noted; keep edits scoped to docs/tooling.
- **Operating posture**: Tickets-only remains in force—operators still copy tickets into Tradovate OCO manually.

### Prerequisites & Compatibility
- **Git** installed with the repository cloned locally (script runs from repo root).
- **Shell**: POSIX-compatible (bash/zsh); supported on **macOS**, **Linux**, and **WSL**. PowerShell users can use `$env:` syntax from the Platform Notes section.
- **Docker** (optional): required only if you run the follow-up compose smoke checks; the cleanup itself has no Docker dependency.

### Env Vars Quick Reference
| Variable | Default | When to override | Effect |
|----------|:-------:|------------------|--------|
| `DRY_RUN` | `1` | Set `DRY_RUN=0` to perform deletions. | Toggle between preview and actual cleanup. |
| `AUTO_YES` | `0` | Set `AUTO_YES=1` for non-interactive runs (CI/scripts). | Skips the confirmation prompt when `DRY_RUN=0`. |

[↩︎ Back to top](#safe-cleanup-script-safe_cleanupsh)
<!-- END: SAFE_CLEANUP_DOC -->





---
**From:** `docs/simulator/overview.md`

# Prism Apex Risk Simulator

## What It Does

The simulator replays historical market data (bars) to test PrismOne strategies under Apex rules. It demonstrates profitability **and** whether the strategy stays within guardrails.

## How to Use

1. Collect historical OHLCV bar data (1m or 5m).
2. Run:

```bash
python -m simulator.run --strategy ORB --data data/ES_5m.csv --mode evaluation
```

This writes `results.json` and `results.csv` for review.

## Design

- **Bar-level**: Fast MVP using OHLCV bars.
- **Tick-level**: Future enhancement for precision.

## Outputs

- Trade log with PnL and balance.
- Metrics: win rate, average R, drawdown, daily PnL.
- Breach log: any Apex rule violations.

Operators can load the CSV/JSON into spreadsheets; engineers can reproduce backtests via the CLI.



---
**From:** `docs/strategy-switcher/guide.md`

# Strategy Switcher — Operator Guide

## What This Does

- Controls whether **ORB** or **VWAP** strategy is active.
- Scheduler automatically turns strategies ON/OFF based on time windows.
- Blocks strategies during restricted periods (e.g., news, EOD).

## Plain English

- ORB runs at market open (14:30–15:00 GMT).
- VWAP runs until near close (15:00–20:50 GMT).
- EOD Flat: everything turns OFF at 20:50 GMT, operator must be flat.
- Restrictions: system disables trading around major events like CPI.

## How to Use

1. See **current active strategy** in dashboard.
2. Use dropdown/buttons to override manually (logged).
3. Add restricted windows to config JSON if needed.
4. Scheduler ensures Apex rules are met (no trading after EOD).

```mermaid
flowchart TD
    A[Config JSON Windows] --> B[Scheduler Job]
    C[Restrictions] --> B
    B --> D[Switch Active Strategy]
    D --> E[Dashboard Badge]
    D --> F[Audit Log + Notification]
```



---
**From:** `infra/systemd/README.md`

# Prism Apex — Ubuntu VM (systemd) Runbook

## Prereqs

- Ubuntu 22.04+ VM (you chose VM deployment)
- Open outbound internet for npm install; inbound TCP :8000 (or reverse proxy)
- Node LTS and pnpm (installer script handles it)

## One‑time setup (as a sudo‑capable user)

```bash
# 1) Clone the repo into prism user's home (or adjust REPO_DIR for your layout)
sudo useradd -m -s /bin/bash prism || true
sudo -u prism -H bash -lc 'cd ~ && git clone https://github.com/QuantumFluxAlgo/prism-apex-tool.git || true'
# If already cloned, pull latest Test branch
sudo -u prism -H bash -lc 'cd ~/prism-apex-tool && git fetch && git checkout Test && git pull'

# 2) Run the installer
cd ~/prism-apex-tool
sudo APP_USER=prism REPO_DIR=/home/prism/prism-apex-tool bash infra/systemd/install-prism-apex.sh

# 3) Edit env and set secrets
sudo -u prism nano /home/prism/prism-apex.env
# Set TRADINGVIEW_WEBHOOK_SECRET and (optionally) BEARER_TOKEN

# 4) Start service
sudo systemctl start prism-apex
sudo systemctl status prism-apex --no-pager

# 5) Verify health
curl -s http://127.0.0.1:8000/health | jq .
```

Logs & lifecycle

```
journalctl -u prism-apex -f
sudo systemctl restart prism-apex
sudo systemctl stop prism-apex
```

Data directory

Default: /home/prism/prism-apex-data (tickets, accounts, exports)

Ensure backups if needed.

Reverse proxy (optional, HTTP only here)

See [../nginx/README.md](../nginx/README.md) for Nginx + Let's Encrypt TLS termination.

Leave service on HOST=0.0.0.0 PORT=8000

Terminate TLS in Nginx/Traefik and forward to 127.0.0.1:8000

If proxy adds X-Forwarded-\*, set TRUST_PROXY=true in /home/prism/prism-apex.env

Firewall quickstart (optional)

```
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp   # or only allow from proxy host
sudo ufw enable
```

Health endpoints

GET /health → {"ok":true} when service is up

GET /ready → readiness check

GET /version → version metadata (if enabled)

Updates / redeploy

```
sudo -u prism -H bash -lc 'cd ~/prism-apex-tool && git fetch && git checkout Test && git pull'
sudo -u prism -H bash -lc 'pnpm install --prefer-offline --frozen-lockfile && pnpm --filter ./apps/api build'
sudo systemctl restart prism-apex
```

---



---
**From:** `reports/types/r3/20250909-183940/summary.md`

# TypeScript Hotspots — 20250909-183940

- Exit status: 2
- Approx TS errors (grep): 155

## Top files (by error count)
     14 packages/indicators/__tests__/swings.spec.ts
     14 packages/indicators/__tests__/atr.spec.ts
     13 apps/api/test/rules/engine.test.ts
     12 packages/strategies/src/vwapFirstTouch.ts
     10 packages/indicators/__tests__/vwap.spec.ts
      8 apps/api/src/jobs/strategies.ts
      7 packages/clients-tradovate/__tests__/telemetry.spec.ts
      6 packages/indicators/src/swings.ts
      6 apps/api/src/jobs/ticketizer.ts
      5 packages/strategies/tests/osbBreakout.spec.ts
      5 packages/runtime/__tests__/ws.resilience.spec.ts
      4 packages/strategies/tests/vwapFirstTouch.spec.ts
      4 packages/strategies/src/osbBreakout.ts
      4 packages/accounts/src/cli.ts
      4 apps/api/src/routes/tickets.ts
      3 vitest.local.config.ts
      3 tests/setup/vitest.setup.ts
      3 packages/signals/src/__tests__/core.spec.ts
      3 packages/rules/src/apex.ts
      3 packages/rules-apex/test/stop.spec.ts

## Top TS error codes
     56 error TS18048
     54 error TS2532
     12 error TS2345
      5 error TS2561
      5 error TS2322
      4 error TS2307
      3 error TS2769
      3 error TS2554
      3 error TS2339
      3 error TS1343
      2 error TS2540
      2 error TS2305
      1 error TS2614
      1 error TS2578
      1 error TS2558

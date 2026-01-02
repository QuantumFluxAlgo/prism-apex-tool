Changelog
All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

[Unreleased]
- DB: add tickets.source (and ticket_events.source) for CSV export compatibility.
- Docs: establish A2 UI design system and align V2 dashboard governance references under REPO_INDEX_V2.md (retire the standalone plan doc).
- P1-3: ensure local Postgres volumes create apex/prismapex roles (deploy/sql/init/001_roles.sql) and provide scripts/local/db-normalize-roles.sh so existing volumes keep the canonical passwords and privileges needed by planner-reject_counts and planner-rejects routes.
- P1-0: system-record provenance helper (deterministic config fingerprint + engine version stamp).
- P1-1: ORR gate system records (append-only `orr_gate_results`, engine-run writer, read-only `/api/system-records/orr-gate` endpoints).
- P1-2: Fix ORR gate semantics (compute via `lib/orrGate.ts`, always write `canonical_strategy_key='orr_gate'`, include planner rollup, and clean out prior planner-labelled rows via `deploy/sql/032_orr_gate_results_cleanup.sql`).

[1.1.0] - 2025-11-08
Added
Market data chart upgrades: 1m/5m/15m granularity selector, per-session VWAP overlay, toggleable ATR line, range histogram, and a solid tooltip that surfaces deltas/VWAP/ATR/range across both candlesticks and BTC/EURUSD line mode.
/api/reports/dashboard endpoint providing symbol coverage, price buckets, and ticket summaries with filter support for symbol, dates, strategy, and bucket interval.
Reports page rework consuming the new endpoint, including KPI tiles, newest-first activity table, symbol coverage grid, ticket summaries, and ticket trend views, plus dashboard docs describing the new flows.
Changed
README and OPERATIONS runbooks now document the new market-data controls, report filters, and the verification steps ops should run after deployments.
[1.0.3] - 2025-11-08
Added
Codex Yahoo governor bundle (curl wrapper + Node hook) wired into compose/CI so realtime ingest is throttled and observable everywhere.
GitHub Actions realtime smoke test that boots the governed stack, runs tools/codex/check-realtime.sh, and tears it down.
Dashboard Yahoo badge now surfaces explicit states (“Live”, “Delays”, “Session paused”) with the stalest symbols highlighted.
Changed
Default YAHOO_SYMBOLS list now covers ES/NQ macros and micros, YM, RTY, GC, CL, 6E, EURUSD, and BTC across apps, cron jobs, and docs.
make up / make prod-up automatically call tools/codex/enable-realtime.sh so local and server deploys always include the governed services.
/api/status shares the same Yahoo health classification as /api/health/yahoo, and Ops docs cover both gapfill-cron and tickets-cron.
[1.0.2] - 2025-10-26
Changed
make up/make prod-up now block on Postgres, run ingest/gapfill/tickets seeds automatically, and document the behavior for both local and server deploys.
Added reusable wait-db-local and wait-db-prod helpers so job runs no longer race the database startup.
Status endpoint now probes ingress-yahoo (or INGRESS_HEALTH_URL) so dashboard Yahoo health lights reflect the real container.
[1.0.0] - 2025-10-25
Added
Initial stable release candidate with version pinning and release documentation.

<!-- P1-A1 planner reject counts -->
- P1-A1: added `planner_reject_counts` (aggregated counters by session/symbol/requested_planner/rejecting_planner/stage/reason), plus best-effort runtime hooks to increment counts at PLANNER/SAFETY/TICKETIZER stages. Engineering-only; read-only externally.

- Docs: align local development docs with the canonical 5180-only dashboard-full + guard workflow.
## 2026-01-02
- Local dev: docker-compose.v2.local.yml now runs jobs always-on (tickets-cron, gapfill-cron, ingress-yahoo, jobs-seed) with migrate gating; only ingress publishes 5180.
- 2026-01-02: local compose includes `gapfill-once` as manual-only via `--profile manual run --rm gapfill-once`.

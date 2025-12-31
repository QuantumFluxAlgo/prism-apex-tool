Changelog
All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

[Unreleased]
DB: add tickets.source (and ticket_events.source) for CSV export compatibility.
Docs: establish A2 UI design system and align V2 dashboard governance references under REPO_INDEX_V2.md (retire the standalone plan doc).
P1-0: add system-record stamp helper (engine_version + config_fingerprint).

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

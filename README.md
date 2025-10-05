# Prism Apex Tool

## What this is
The **Prism Apex Tool** is a semi-automated trading brain for **Apex Trader Funding** style accounts.  
It **ingests Yahoo Finance 1-minute bars (~15m delayed)**, applies the **Opening Range Retest (ORR)** strategy, **enforces guardrails**, and surfaces **actionable tickets** in a Dashboard for **manual execution** (e.g., on Tradovate).

- **No auto-execution.** The tool generates tickets; an operator places OCO orders manually.
- **Live signals only** appear in **Worklist** (source=`live`), while backfilled tickets remain in **Tickets** for research (source=`backfill`).
- **R:R gating** = actionable if `2.0 ≤ R:R ≤ 4.5` and **LONG-only** (SHORTs are visible but non-actionable).
- **Per-session caps**: ES/NQ = 1, CL/GC = up to 2 (only within first 90 minutes of RTH).
- **EOD cutoff**: 4:59 PM ET server-side for actionability; UI shows a global countdown.

## High-level architecture
- **apps/api** (Node/TypeScript): REST API, strategy orchestration, ticket emits, exports (`/api/export/*`), health (`/health`)
- **apps/dashboard** (React): Worklist (live), Tickets (all), Metrics, **Downloads** (bars, tickets, README)
- **Postgres**: bars storage (`bars_1m`), ticket log with dedupe and indices; actionable views
- **Cron/Jobs**: `gapfill-cron` for bars; optional `tickets-cron` nightly backfill (ORR sweep)



## Strategy: Opening Range Retest (ORR)
**Idea:** During the first minutes of the session (OR), price often head-fakes outside the opening range and **retests** back inside. We capture that reversal with strict risk gating.

1) **Opening Range (OR)**  
   - First `ORR_OR_MIN` minutes after session open (default **5 min**) define **orHigh** and **orLow**.

2) **Retest & Entry** (within `ORR_WINDOW_MIN`, default **60 min**)  
   - **LONG**: Price breaks below **orLow** then **closes back above** it → enter LONG on that close.  
   - **SHORT** (view-only): Price breaks above **orHigh** then **closes back below** it → enter SHORT on that close.

3) **Stops/Targets**  
   - **Stop**: opposite OR boundary (for LONG, stop = **orLow**).  
   - **Target**: entry ± OR height (symmetrical distance).  
   - **R:R** math:
     ```
     Reward = target_price - entry_price
     Risk   = entry_price - stop_price
     R:R    = Reward / Risk
     ```
   - **Actionable gate**: 2.0 ≤ R:R ≤ 4.5, **LONG-only**, **before EOD cutoff**.

4) **Caps & Dedup**  
   - **Per session**: ES/NQ → 1 ticket; CL/GC → up to 2 tickets (only in first 90 minutes).  
   - DB **unique identity**: `(symbol, strategy, direction, opened_at_utc)`.  
   - Live emits use `source='live'`; backfills use `source='backfill'`.

5) **End-of-session**  
   - If neither stop/target hit, trade is **closed at the session’s last bar** (no carry overnight).

## Session + Symbols
- Default US RTH **13:30Z–20:59Z** (configurable via env).  
- Symbols (default): `ES=F,NQ=F,CL=F,GC=F`.  
- **Yahoo delay**: ~15 minutes; Dashboard shows a **delay badge** and **global countdown**.

## Guardrails & policy
- **Actionability**:
  - LONG-only; SHORTs are labeled **“view-only”**.
  - **R:R < 2.0** → not actionable (**reason**: “R:R below 2.0”).  
  - **R:R > 4.5** → not actionable (**reason**: “R:R above 4.5”).  
  - **After cutoff** → not actionable (**reason**: “After EOD cutoff”).
- **Ticket source**:
  - `live` → visible in **Worklist** and **Tickets**; can be **completed**.  
  - `backfill` → visible in **Tickets** only; cannot be completed.
- **Dedupe**: identity key + `ON CONFLICT` upserts to update fields without duplicating.

## Dashboard
- **Worklist**: auto-refresh (5s with backoff), **always-visible reason tags**, **toast** on complete, **Copy-OCO** (multi-line), **tick-math tooltips**, **PnL in $ and R** (hover to see tick math).
- **Tickets**: research view (all sources), same formatting + reasons.
- **Metrics**: signal counts, PnL summaries (WIP).
- **Downloads** (rightmost tab):
  - **Bars CSV**: `/api/export/bars.csv?symbol=ES=F&start=...&end=...` (≤14 days)  
  - **Tickets CSV**: `/api/export/tickets.csv?strategy=ORR&start=...&end=...` (≤14 days)
  - **README**: `/api/export/readme.md`
  - **Presets**: Last 1 / 7 / 14 days; date-range selector hard-clamped to 14 days.

## How to run locally
- **Requirements**: Docker (Compose), Node 20+, pnpm, Postgres (container managed).
- **.env** (see `.env.example`):
```bash
DATABASE_URL=postgres://apex:apex@db:5432/prismapex
YAHOO_SYMBOLS=ES=F,NQ=F,GC=F,CL=F
ORR_LIVE=1
RTH_OPEN_UTC=13:30Z
RTH_CLOSE_UTC=20:59Z
ORR_OR_MIN=5
ORR_WINDOW_MIN=60
```
Set the following environment variables (see `.env.example`):

```
ENABLE_TELEMETRY=true
TELEMETRY_POLL_MS=5000
TRADOVATE_DEMO_REST_BASE=https://demo.tradovateapi.com/v1
TRADOVATE_USER=...
TRADOVATE_PASSWORD=...
TRADOVATE_APP_ID=...
TRADOVATE_APP_VERSION=prism-apex/0.2.0
TRADOVATE_API_CID=...
TRADOVATE_API_SEC=...
TRADOVATE_DEVICE_ID=prism-apex-dev-telemetry
BUFFER_CLEAR_THRESHOLD=2500
```

- **Start**:
```
docker compose -f docker-compose.yml -f docker-compose.db.yml up -d --build
curl -fsS http://localhost:3000/health
# Open UI: http://localhost:8080
```
- Verify bars freshness:
```
docker compose -f docker-compose.yml -f docker-compose.db.yml exec -T db   psql "$DATABASE_URL" -Atc "select symbol, max(ts_utc) from bars_1m group by 1 order by 1;"
```
- Smoke test exports:
```
curl -I -s "$API_URL/api/export/readme.md" | head -n1
curl -I -s "$API_URL/api/export/bars.csv?symbol=ES=F&limit=5" | head -n1
curl -I -s "$API_URL/api/export/tickets.csv?strategy=ORR&limit=5" | head -n1
```



## Docker (from previous README)
```bash
docker compose build
docker compose up -d
```

## Usage (from previous README)
Run `/api/analytics/payout` or check dashboard.
```

#### docs/analytics/post_trade.md

```markdown

## API / Routes (from previous README)
`GET /report/consistency?accountId=<id>&window=8`

Returns the computed metrics and pass/fail reasons. A mock PnL provider is
used for tests and development. Real PnL will be supplied in PR-C1.
```

#### docs/dashboard/guide.md

```markdown

## Troubleshooting (from previous README)
- **Shell lacks `mapfile` — will it fail?** No. The script uses a POSIX-friendly loop.
- **“No candidates” output — is something wrong?** Usually not; the tree may be clean or files are out of scope.
- **Does it delete Docker volumes or containers?** No. Only affects repo files. Use `docker compose down -v` separately if needed.

---

## Notes (from previous README)
- tickets/*.jsonl, source trees, configs, migrations, and `.env*` were left untouched.
- Set `CLEANUP_DRY_RUN=1` to preview or `ARCHIVE_MODE=1` to move clutter into `archive/ATTIC-<date>` instead of deleting.
- No automated order placement or liquidation paths were introduced.
```

#### docs/CODEBASE_OVERVIEW.md

```markdown

## Data model (simplified)
- `bars_1m`: symbol, ts_utc, o/h/l/c, volume
- `tickets`:
  - identity: (symbol, strategy='ORR', direction, opened_at_utc)
  - core: entry_price, stop_price, target_price, exit_price, pnl, rr
  - flags: actionable (bool), non_actionable_reason (text), source ('live'|'backfill')
  - meta: { orHigh, orLow, openingRangeMinutes, reversalWindowMinutes }

## Build & release
- Feature branches → PR against Test → squash merge.
- Migrations under `deploy/sql/00x_*.sql` (idempotent).
- Docker images: api, dashboard, db sidecars.

## Roadmap
- Performance analytics (per symbol/session).
- Slack/Email notifications.
- Strategy parameter controls in UI.
- Tradovate connector (read-only first, then OCO assistant).
- Role-based access.

## License
Internal use only. Not for redistribution.

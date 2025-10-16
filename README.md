
Prism-Apex Tool — Monorepo

Last updated (UTC): 2025-10-16T11:03:28Z

Overview & Guardrails


Yahoo (≈15m delayed) → Postgres (bars_1m + VWAP/ATR) → ORR strategies → tickets/*.jsonl → Dashboard (read-only).
Operator manually enters OCOs in Tradovate. **No API order placement.**
Node 20.x target; Docker-only; pnpm workspace.


Guards

- **guard:no-rapidapi** — enforced (no RapidAPI references).
- **guard:orders** — tickets-only posture; executable order placement must not exist.


Instruments & Limits (MVP scope)


| Category                | Yahoo Ticker(s)                                | Notes                                 |
|-------------------------|-----------------------------------------------|----------------------------------------|
| Equity Index Futures    | ES=F, NQ=F, YM=F, RTY=F                       | Apex-eligible cores                    |
| Micro Index Futures     | MES=F, MNQ=F, MYM=F, M2K=F                    | Micro contracts                        |
| Energy                  | CL=F, NG=F, HO=F, RB=F                        | Crude, NatGas, Heating Oil, Gasoline   |
| Metals                  | GC=F, SI=F, HG=F, PL=F                        | Gold, Silver, Copper, Platinum         |
| Agricultural           | ZC=F, ZW=F, ZS=F, LE=F, HE=F                  | Corn, Wheat, Soy, Cattle, Hogs         |
| FX (Futures)            | 6E=F, 6B=F, 6J=F                              | Euro, Sterling, Yen                    |
| Crypto (CME)            | MBT=F, MET=F                                  | Micro BTC, Micro ETH                   |
| Spot FX (optional)      | EURUSD=X (read-only)                          | Comparison only                        |


Data source: Yahoo Finance native endpoints (query1.finance.yahoo.com), ~15m delayed.
Tickets-only posture: No API order placement or liquidation—operator enters OCOs manually in Tradovate.

Quick Start (Docker-only)


```sh
# DB + API + Dashboard
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
# Optional: minute-cadence feed
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.market-feed.override.yml --profile market up -d market-feed

# Health & status
curl -s http://localhost:3000/health
curl -s http://localhost:3000/status | jq .
curl -s http://localhost:3000/metrics | jq .

# Dashboard (full)
# http://localhost:8080




Shutdown



docker compose down
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.market-feed.override.yml --profile market down




Local Environment Setup

# Prism-Apex — Local Runbook (Minimal)

## Prereqs
- Node 20.x (use `.nvmrc`)
- Docker + Docker Compose
- pnpm 9+

## Install
```bash
nvm use 20
pnpm install
```

## Ports
Set free ports to avoid conflicts:
```bash
export POSTGRES_PORT=55434
export API_PORT=3001
```

## Start services
```bash
# Database
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d db
# API (tickets-only)
docker compose up -d api
# Health check
curl -sf http://localhost:$API_PORT/health
```

## Dashboard (optional)
```bash
docker compose -f docker-compose.dashboard.yml up -d
# open http://localhost:5180
```

## Notes
- Tickets-only: any trading calls fence with `ORDERS_DISABLED`.
- Data source: Yahoo Finance native (`query1.finance.yahoo.com`), ~15m delayed.
- If a port is taken, set another `POSTGRES_PORT` or `API_PORT` and restart.

Smoke Tests & Backfill Runbook

# Local Smoke Test

Quick validation of the Yahoo → Postgres → Ticket → API path (tickets-only build).

## Usage
```bash
./scripts/smoke.sh
```

What it does:
1. Picks free `POSTGRES_PORT` / `API_PORT` (override by env).
2. Starts the compose `db` and `api` services.
3. Checks `http://localhost:$API_PORT/health`.
4. Hits Yahoo native chart endpoint (`query1.finance.yahoo.com`).
5. Appends a smoke ticket to `tickets/smoke.jsonl` (tickets-only; no live trading).
6. Best-effort probes `/tickets`.

If any step fails, the script exits non-zero with a short message.

## Cleanup
Use `docker compose down` to stop services and remove the generated smoke ticket if desired.

Ticket Model & ORR Flow


Tickets — Canonical Schema & Exports

Tickets are the only way Prism-Apex communicates trade ideas. Operators copy the values into Tradovate as an OCO. No API orders.

1) Canonical JSON Schema (shape, not a JSON-Schema file)
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
    "strategy": "vwap-first-touch | osb-breakout | ...",
    "rr": 1.5,
    "guardrails": ["stopSideOk","rrInRange","sizeHalfUntilBuffer"],
    "sizingHint": "half-size | normal | reduced",
    "consistencyNotes": "optional string"
  },
  "accepted": true,
  "reasons": []
}


Field notes:

Prices are absolute (not ticks).

qty is contracts to enter on this account unless the ticket states otherwise.

accepted = true means operator MAY enter; false means do NOT.

2) Rejection Codes (when accepted=false)

A ticket can be rejected by guardrails. Reasons appear as an array of strings:

STOP_REQUIRED — policy requires a stop.

STOP_SIDE_INVALID — stop not on safe side for side.

RR_OUT_OF_RANGE — risk:reward outside allowed [min,max].

SIZE_CLAMPED — reduced per anti-windfall / half-size until buffer.

TRAILING_DRAWDOWN — account’s trailing drawdown risk exceeded.

EOD_WINDOW — inside end-of-day flat window.

OUT_OF_HOURS — not in session window for the strategy.

CONFIG_DISABLED — strategy disabled by config/schedule.

DUPLICATE_SIGNAL — duplicate within de-dupe horizon.

SYMBOL_INVALID — symbol/contract not permitted.

If any of these appear, the UI/API will show accepted=false — do not place the order.

3) CSV Export Shape

Endpoint: GET /export/tickets?date=YYYY-MM-DD

Header

symbol,side,entry,stop,target,qty,accountId,timestampUtc,strategy,rr,accepted,reasons,sizingHint


Example Row

MESZ5,BUY,5550.25,5544.25,5560.25,2,APEX-123456,2025-09-09T14:31:22Z,vwap-first-touch,1.5,true,,half-size


reasons is a ;-joined list if multiple (or empty).

strategy and sizingHint are derived from meta.

4) Operator Copy Format (one-liner)

Use this exact order for quick copy from UI to the platform:

SYMBOL SIDE QTY ENTRY STOP TARGET


Example:

MESZ5 BUY 2 5550.25 5544.25 5560.25


This maps directly to Tradovate inputs:

Contract = SYMBOL

Side = SIDE

Quantity = QTY

Entry (Limit) = ENTRY (or Market per ticket)

Stop = STOP (Stop-Market)

Target = TARGET (Limit)

5) Sizing & Fanout Notes

qty respects sizing policies (e.g., half-size until buffer clears).

For multiple accounts, either:

Use qty per account, or

Split a total across accounts and round down per account.

Keep identical prices across accounts to preserve R:R.

6) EOD Suppression

Tickets created within the configured EOD flat window are suppressed.

Suppressed tickets show accepted=false and include EOD_WINDOW in reasons.

Dashboard displays an EOD countdown to flat window start.

7) Endpoints (read-only)

GET /tickets?date=YYYY-MM-DD[&strategy=STRATEGY] — JSONL aggregation for the day (optional strategy filter).

GET /export/tickets?date=YYYY-MM-DD — CSV snapshot.

Operational tip: If a ticket is accepted but you decide not to enter it, no API changes are needed—this is operator-assisted by design.

Status & Metrics



/status shows service lights (db, api, yahoo, cron jobs) and per-symbol freshness.

/metrics reports counts and min/max timestamps; ensure public.bars_1m view maps to prism.bars_1m.


Market Feed (minute cadence)


ops/market-feed (Node 20, pg) upserts (symbol, ts_utc) at 1m cadence.
Env: PRISM_SYMBOLS, PRISM_RANGE (e.g., 90m), PRISM_INTERVAL (1m), LOOP_SECONDS (60–120s). Throttle ~300–450 ms/symbol.


Ports & Env Parity



API: ${API_PORT:-3000} → 3000

Dashboard: 8080:80

DB: ${POSTGRES_PORT:-55433} → 5432
Ports parameterized via env in compose; keep defaults.


CI / Engines



CI uses Node 20.x. .nvmrc kept for devs.

Lint is non-blocking (legacy warnings), typecheck/tests must pass.


Troubleshooting



macOS bash 3.2: avoid mapfile; use quoted here-docs.

If /metrics is {}, create public.bars_1m as SELECT * FROM prism.bars_1m.

If /status → yahoo:red but ingress is healthy, set API→ingress alias/URL.


Repository Map



apps/
  api/           # REST: /health /status /metrics /tickets
  dashboard/     # UI (status/worklist)
  ingress-yahoo/ # Yahoo ingress health (if present)
packages/
  ticketizer/    # ORR logic
  data-yahoo/    # Yahoo v8 helpers
ops/
  market-feed/   # 1m cadence feed container
docs/            # kept; source docs were merged into README
scripts/         # guards, smoke helpers




Changelog (curated)



2025-10-15: market-feed added; instruments expanded; ingress alias fix; metrics view restored; tickets-only reinforced.

2025-10-16: docs unified into README; Quick Start/Shutdown/Status/Ports/CI added; auto-push to origin/Test.


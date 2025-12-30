# Prism-Apex — Local Dev (tickets-only)

Run the local pipeline end-to-end without placing real orders: Yahoo → Postgres → strategy → tickets JSONL → dashboard/API.

## Prerequisites
- Docker Desktop (or compatible) with Compose
- Files in repo root: `docker-compose.yml`, `.env.example.local`
- Node.js 20.x (`nvm use` will pick up `.nvmrc`)

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

> `make up` automatically runs the ingest/gapfill/ticket jobs (same as `make seed`)
> so `/worklist`, `/tickets`, `/reports`, `/status`, etc. have data on first load.
> If you ever bootstrap containers manually (e.g., `docker compose up`), run
> `make seed` afterwards or those tabs will be empty.

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

## 4. Expose a single URL (reverse proxy + tunnel)

The dashboard Docker build leaves `VITE_API_BASE` empty so API calls stay relative to the same origin (`/api/*`). Override via `--build-arg VITE_API_BASE=http://api:3000` if you need to point at a different host. After `make up`, attach the helper nginx (and optionally ngrok or Cloudflare) to the same compose project:

```bash
docker compose -f docker-compose.yml -f docker-compose.ngrok.yml up -d reverse-proxy
# optional tunnel (requires NGROK_AUTHTOKEN)
# docker compose -f docker-compose.yml -f docker-compose.ngrok.yml up -d ngrok
```

Local smoke:

```bash
curl -fsS http://localhost:8090/api/tickets?limit=1 | jq .
curl -fsS http://localhost:8090/api/health
curl -fsSI http://localhost:8090/ | head -n1
```

Point Cloudflare/ngrok/etc. at `http://localhost:8090` and every tab keeps the same URL.

### Cloudflare tunnel

For a quick `trycloudflare.com` URL (no token needed):

```bash
make proxy-up     # starts reverse proxy + Cloudflare quick tunnel (prints command hint for URL)
make proxy-logs   # follow logs to capture https://<random>.trycloudflare.com
```

For a persistent tunnel managed in the Cloudflare dashboard:

```bash
export CLOUDFLARE_TUNNEL_TOKEN=<cloudflare-issued-token>
make proxy-up     # now launches the named tunnel
```

The tunnel container automatically routes to the reverse proxy (`http://reverse-proxy:80`). Override `REVERSE_PROXY_PORT` if you need a different host port, or `TUNNEL_UPSTREAM` if your proxy listens elsewhere.
Use `make proxy-down` to stop/remove the proxy + tunnel combo when you’re done sharing the UI.

## Notes
- Tickets-only posture is enforced: `TICKETS_ONLY=true`, `ORDERS_DISABLED=true`
- Generated artifacts under `data/` (e.g., `tickets.jsonl`) are now ignored by Git
- If port 55433 conflicts, override `PGHOSTPORT` when invoking `make up` or `docker compose`

### Yahoo ingest cadence controls

- Set `INGEST_YAHOO_SYMBOLS="ES=F,MES=F,..."` in your `.env.dev` when you want the API scheduler to run the Yahoo backfill job. Leave it unset to disable the poller.
- `YAHOO_POLL_INTERVAL_MS` (default `45000`) controls how often the scheduler launches the bounded ingest. `YAHOO_POLL_LOOKBACK_MINUTES` (default `20`) dictates how much history each run re-requests. For SIM/local you can set `YAHOO_POLL_INTERVAL_MS=90000` and `YAHOO_POLL_LOOKBACK_MINUTES=90`; for PROD leave the defaults (≈45s cadence, ≈20min window).
- Confirm bars are landing by curling the health endpoint (status returns GREEN when `lag_seconds <= 120`):

  ```
  curl -fsS http://localhost:3000/health/yahoo | jq .
  ```
- Dashboard env defaults: hot reload uses `http://localhost:3000` unless you export `VITE_API_BASE`; Docker builds default to a relative base (`''`) so proxy/tunnel calls stay on the same origin. Pass `--build-arg VITE_API_BASE=...` when you need an absolute host.

### Real-time ticketizer feed

`apps/api` now registers a `BARS_FEED` job that replays 1m bars from Postgres into the in-process event bus (`publish('bars.1m', …)`). That means the existing `registerStrategiesJob()` and `registerTicketizerJob()` see the same stream they expected from a live feed—no more ad-hoc `bars-to-bus` helper. Key env toggles:

- `BARS_FEED_SYMBOLS`: CSV of Yahoo symbols (e.g. `ES=F,MES=F`). Falls back to `STRATEGIES_JOB_SYMBOLS`, `INGEST_YAHOO_SYMBOLS`, then `ES=F,NQ=F,MES=F,MNQ=F`.
- `BARS_FEED_LOOKBACK_MINUTES`: How far back to replay at boot. Defaults to `720` so strategies get several hours of context before new bars arrive.
- `BARS_FEED_INTERVAL_MS`: Poll cadence for new rows (default `5000`). `BARS_FEED_MAX_BATCH` caps each fetch (default `500` rows).
- `BARS_FEED_PRIME_HISTORY`: Set to `false` if you only want bars created after the process starts.
- `BARS_FEED_ENABLED`: Force-disable/enable regardless of symbol detection; defaults to `true` when symbols resolve.

New Codex terminal prompt for realtime testing (assumes Docker stack is already up via `tools/codex/enable-realtime.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /Users/seankeane/Projects/prism-apex-tool
export BARS_FEED_SYMBOLS="ES=F,MES=F,NQ=F,MNQ=F"
export BARS_FEED_LOOKBACK_MINUTES=1440   # warm up with the last day
export RUN_CONTINUOUS=1                 # let strategies consume ETH + RTH
echo "[realtime] starting API with bars-feed publisher"
pnpm --filter @prism-apex/api dev
```

That single process now: (1) tails `bars_1m`, (2) emits `bars.1m` events, (3) lets strategies publish `suggestion`, and (4) lets ticketizer enforce guardrails before inserting tickets. You can still run `tools/codex/tickets-realtime.sh` alongside it for redundancy, but it’s no longer required for live guardrail-aware tickets.

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

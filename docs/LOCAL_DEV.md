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
- Dashboard env defaults: hot reload uses `http://localhost:3000` unless you export `VITE_API_BASE`; Docker builds default to a relative base (`''`) so proxy/tunnel calls stay on the same origin. Pass `--build-arg VITE_API_BASE=...` when you need an absolute host.

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

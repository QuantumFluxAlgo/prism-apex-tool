[![Cleanup Guide](https://img.shields.io/badge/cleanup-guide-blue)](docs/safe_cleanup.md)

# Prism-Apex Tool — Operator-Assisted Trading (Tickets Only)

> **Non-negotiable:** This app **never places orders via API**. It only emits **tickets** (entry/stop/target) that a human operator copies into Tradovate as an OCO. Local, Docker-first.

## Quickstart (production-like, local)
```bash
docker compose up -d --build
# API → http://localhost:3000
# Health: curl -fsS http://localhost:3000/health   # expect {"ok":true}
# Ready:  curl -fsS http://localhost:3000/ready

Choose your UI

Dashboard-Lite (recommended):

docker compose -f docker-compose.yml -f docker-compose.dashboard-lite.yml up -d --build
# UI → http://localhost:5178


Full Dashboard (original/legacy):

docker compose -f docker-compose.yml -f docker-compose.dashboard-full.yml up -d --build
# UI → http://localhost:8080


Run both: add both overrides to the compose command.

Data & volumes

API persists state under Docker volume api-data mounted at /data (e.g., /data/tickets/YYYY-MM-DD/*.json).

A companion `tickets-sync` service continuously imports per-ticket JSON into `/data/tickets.jsonl` for the API.

UIs mount the same volume read-only to display tickets.

Environment (safe defaults)

NODE_ENV=production, LOG_LEVEL=info, DATA_DIR=/data, TICKETS_DIR=/data/tickets (APEX_DATA_DIR still honored)

TRADOVATE_BASE_URL=http://localhost/disabled (market-data OFF by default)

Set secrets via your own .env/envs when needed; orders are never placed.

What this is (and isn’t)

✅ Signals/guardrails/tickets, operator copies into Tradovate

✅ Local/Docker only; reproducible builds

❌ No automated order placement

❌ No emergency liquidation via API

See README-dev.md for development workflow and docs/OPERATIONS.md for operator checklist.

## Cleanup

Use `./safe_cleanup.sh` to clear untracked cache/scratch files safely. The script defaults to a dry run and appends a summary to `docs/YAHOO_DATA_CLEANUP.md`. See `docs/safe_cleanup.md` for details and additional usage examples.

### Docker quickstart

```bash
make up
# URLs:
#   Dashboard: http://localhost:8080
#   API:       http://localhost:3000/health (if implemented)
```

See DEPLOY.md for details.

See [docs/RUNBOOK.local.md](docs/RUNBOOK.local.md) for quick local start.

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

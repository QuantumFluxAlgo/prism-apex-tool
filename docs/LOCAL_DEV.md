# Prism-Apex — Local Dev (tickets-only)

Run the local pipeline end-to-end without placing real orders: Yahoo → Postgres → strategy → tickets JSONL → dashboard/API.

## Prerequisites
- Docker Desktop (or compatible) with Compose
- Checked-out branch `fix/tickets-sync-cjs-and-local-db`
- Files in repo root: `docker-compose.yml`, `docker-compose.override.yml`, `.env.example.local`

## 1. Start the stack (Postgres on host **55433**)
```bash
docker compose --env-file .env.example.local up -d --build
```

What spins up:
- **api** – serves on http://localhost:3000 with a Node-based healthcheck (no curl dependency)
- **tickets-sync** – copies `syncTickets.js` → `.cjs` and runs it under Node 20
- **db** – postgres:16-alpine bound host 55433 → container 5432

## 2. Verify everything is healthy
```bash
docker compose ps
docker inspect --format '{{json .State.Health}}' $(docker compose ps -q api)
docker compose logs --no-color tickets-sync | tail -n 60
docker compose exec -T api sh -lc 'tail -n 10 /app/data/tickets.jsonl || tail -n 10 /data/tickets.jsonl || true'
```
You should see new rows in `data/tickets.jsonl`, and the API healthcheck should report `"Status":"healthy"` once `/health` or `/` returns 200.

## 3. Stop the stack
```bash
docker compose down        # keep the Postgres volume
# docker compose down -v   # wipe volumes for a clean slate
```

## Notes
- Tickets-only posture is enforced: `TICKETS_ONLY=true`, `ORDERS_DISABLED=true`
- Generated artifacts under `data/` (e.g., `tickets.jsonl`) are now ignored by Git
- If port 55433 conflicts, override `POSTGRES_PORT` when invoking `docker compose`

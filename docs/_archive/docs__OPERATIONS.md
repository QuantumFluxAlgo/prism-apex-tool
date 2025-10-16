
Operations — Daily Checklist

Start services

API: docker compose up -d --build

UI: choose one

Lite: add -f docker-compose.dashboard-lite.yml

Full: add -f docker-compose.dashboard-full.yml

Verify health

curl -fsS http://localhost:3000/health → {"ok":true}

UI loads (5178 for Lite, 8080 for Full)

Confirm tickets path

API writes to /data/tickets/YYYY-MM-DD/*.json (volume api-data); tickets-sync keeps /data/tickets.jsonl aggregated

Copy tickets to broker

Open ticket details; enter OCO in Tradovate manually

Verify entry/stop/target and size follow Apex rules

End-of-day

Ensure no open tickets remain; archive logs as needed

Policy: Tickets-only. No order placement APIs are allowed in this codebase.

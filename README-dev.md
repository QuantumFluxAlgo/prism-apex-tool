# Local Development (API + Dashboard)

This guide gets both services running locally in two terminals with proxy wiring, health checks, **and demo data seeding**.

## Prereqs
- Node 20+ and `pnpm` (Corepack):
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate

From repo root, install deps once:

pnpm install --no-frozen-lockfile

1) Prepare API env

Create a local env file (or use defaults):

cp apps/api/.env.local.example apps/api/.env.local
# edit values if you have real credentials; otherwise leave as-is for dev

2) Start the API

In Terminal A (repo root):

./dev_api.sh


Health check:

curl -s http://localhost:8000/health
# -> {"ok":true}

3) Start the Dashboard

In Terminal B (repo root):

./dev_dashboard.sh


Open http://localhost:3000

The Vite proxy is configured so the dashboard calls /api/* which is rewritten to the API.

4) (Optional) Seed demo data

Populate Alerts, Tickets, and Risk with one command (API must be running):

./seed_demo.sh


Sanity:

# Through Vite proxy
curl -s http://localhost:3000/api/alerts | jq .
# Direct API
curl -s "http://localhost:8000/alerts/queue?limit=50" | jq .

Troubleshooting

Port 3000 or 8000 already in use

Change the port in apps/dashboard/vite.config.* (server.port) or in apps/api/.env.local (PORT), then restart the corresponding script.

CORS/Proxy issues

In dev, use /api/* from the web app (Vite will proxy to the API). Calling the API directly from the browser can hit CORS.

Empty UI

Run ./seed_demo.sh to load demo Alerts/Tickets/Risk.

ESBuild “loader must be a string”

Ensure apps/dashboard/vite.config.ts includes JSX loader lines and restart pnpm run dev.

Clear Vite cache if needed:

rm -rf apps/dashboard/node_modules/.vite

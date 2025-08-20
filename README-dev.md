# Local Development (API + Dashboard)

This guide gets both services running locally in two terminals with proxy wiring and health checks.

## Prereqs
- Node 20+ and `pnpm` (Corepack):
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

From repo root, install deps once:

pnpm install --no-frozen-lockfile

1) Prepare API env

Create a local env file (or use defaults):

cp apps/api/.env.local.example apps/api/.env.local
# edit values if you have real credentials; otherwise leave as-is for dev

2) Start the API

In Terminal A (repo root):

./dev_api.sh


You should see:

[dev:api] PORT=8000 HOST=0.0.0.0 DATA_DIR=/var/lib/prism-apex-tool
[dev:api] Starting Fastify (tsx watch)…
{"msg":"API listening on 0.0.0.0:8000"}


Health check:

curl -s http://localhost:8000/health
# -> {"ok":true}

3) Start the Dashboard

In Terminal B (repo root):

./dev_dashboard.sh


Then open:

http://localhost:3000

Vite proxy is already configured so the dashboard calls /api/* which Vite rewrites to http://localhost:8000/compat/*.

4) Sanity checks (from any terminal)
# Vite → API through proxy
curl -s http://localhost:3000/api/health
# -> {"ok":true}

# Alerts queue (empty until populated)
curl -s "http://localhost:3000/api/alerts/queue?limit=50"
# -> []

Troubleshooting

Port 3000 or 8000 already in use

Change the port in apps/dashboard/vite.config.ts (server.port) or in apps/api/.env.local (PORT), then restart the corresponding script.

CORS/Proxy issues

In dev, all calls should go through Vite on http://localhost:3000 and the proxy to http://localhost:8000. If you’re calling the API directly from the browser (not via /api/*), you may hit CORS. Use the /api/* paths in the app.

ESBuild “loader must be a string”

Make sure apps/dashboard/vite.config.ts includes the JSX loader lines from PR5/PR6 and you’ve restarted pnpm run dev after edits.

Clear Vite cache if needed:

rm -rf apps/dashboard/node_modules/.vite


Environment variables not set

The API may log a “Missing env vars…” for Tradovate if codepaths that require them are exercised. For pure UI testing, the /compat/* routes do not require real credentials.

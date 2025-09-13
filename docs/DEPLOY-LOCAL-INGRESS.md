# Local Docker Deploy — Ingress (Yahoo Delayed Bars)

## One-time
1. Install Docker Desktop (or start `dockerd`).
2. Ensure repo has PR-2, PR-3, PR-4, PR-5 merged or available locally.

## Run
```bash
cp .env.ingress.example .env.ingress
# (optionally edit flags/envs)
./scripts/smoke-ingress.sh


What it does:

Builds image from apps/ingress-yahoo-dev/Dockerfile

Starts service on http://localhost:8080

Sends a prior-day bar (seeds prior RTH High)

Sends a today bar → weekly AVWAP + prior-High → APX-DDB-01 long-only ticket

Writes ticket JSON to ./tickets/YYYY-MM-DD/*.json

Common Flags

APEX_ENABLE_YAHOO_INGRESS=true (on/off pipeline)

APEX_ENABLE_APX_DDB01=true (enable strategy)

APEX_ENABLE_TICKETS=true (allow writing tickets)

APEX_KILL_SWITCH=false (emergency off)

APEX_ACCOUNT_RISK_USD (sizing), APEX_MAX_DAILY_RISK_USD (cap), APEX_MIN_RR, APEX_BUFFER_TICKS

Troubleshooting

Docker daemon not available → start Docker Desktop (or sudo service docker start).

Port 8080 in use → change PORT in .env.ingress and ports: in compose.

No tickets emitted:

Check flags (ENABLE_* and KILL_SWITCH).

Ensure prior-day sample posted first (for prior High).

News blackout env may force skip.

Daily risk cap consumed (see .state/daily-risk.json).

Clean Up
docker compose -f docker-compose.ingress.yml down -v
rm -rf tickets .cache .state



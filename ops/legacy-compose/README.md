# Legacy compose variants (quarantined)

These files are retained for reference only. They are NOT the supported local dev entrypoint.

## Canonical local dev
- docker-compose.v2.local.yml
- tools/codex/stabilize_5180.sh

## Why this exists
We had repeated 502/Bad Gateway incidents caused by running different compose variants that bound
different host ports (3000/8080/8180/5173/5180) and/or fronted the dashboard with a different proxy.

Local dev must use the single-entrypoint ingress on http://localhost:5180.

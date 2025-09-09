
Prism-Apex Tool

Hard rule: This project never places orders via API. It emits tickets only. A human operator enters OCO orders in Tradovate based on those tickets.

Docker-only local workflow (no host Node/Python required).

Public endpoints (read/health only):
GET /health, GET /ready, GET /openapi.json, GET /version

Quickstart (Docker)
# from repo root
docker compose up -d --build

# wait a few seconds, then:
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/ready
curl -fsS http://localhost:3000/version


If both health and ready return OK, your local API is alive at http://localhost:3000.

What it does

Connects to Tradovate market data (live WS) for series (Bar/VWAP/ATR).

Runs strategies:

VWAP First-Touch (packages/strategies/src/vwapFirstTouch.ts)

Opening-Session Breakout (packages/strategies/src/osbBreakout.ts)

Applies Apex guardrails & sizing; produces tickets.

Operator copies ticket values into Tradovate as an OCO bracket (no API orders).

Tickets stored per-day (JSONL) and exported as CSV.

Key Docs

Project overview: PROJECT.md

Operator guide (copy format, OCO mapping, fanout, EOD): docs/operator-console.md

Tickets (schema & CSV): docs/tickets.md

ADR — operator-assisted only: docs/adr/ADR-2025-09-09-operator-assisted-architecture.md

Non-Negotiables

No API order placement, ever.

Live market data drives strategy logic.

Incremental, copy-pasteable changes; Docker-only local workflow.

Development (FYI)

CI must pass: pnpm lint && pnpm typecheck && pnpm test

Python checks (where applicable): ruff --fix && black --check && pytest -q

Dead-code scan: pnpm run scan:dead

Looking for how to operate the console? Read docs/operator-console.md.

# Prism-Apex: Operator-Assisted Trading (Project Overview)

> **Non-negotiable:** Prism-Apex NEVER places orders automatically. It produces **tickets only**. A human operator enters OCO brackets in Tradovate. No exceptions.

## Mission
Operator-assisted trading for Apex Trader Funding accounts on Tradovate:
- **Prism-Apex is the brain** (signals, guardrails, tickets, telemetry).
- **A human is the hands** (manual order entry into Tradovate using OCO).
- Strict **Apex guardrails** enforced in code; violations result in **ticket rejection** (no orders sent).

## Runtime Model (Docker-only)
Local/staging uses **Docker Compose** only. No host Node/Python needed.
Public API (read-only for operators):
- `GET /health`
- `GET /ready`
- `GET /openapi.json`
- `GET /version`

## Dataflow (High-Level)


Tradovate Market Data WS (live)
│
├─▶ Bar/VWAP/ATR series
│
├─▶ Strategy Orchestrator
│ ├─ VWAP First-Touch
│ └─ Opening-Session Breakout
│
├─▶ Apex Guardrails & Sizing (rules-apex)
│
└─▶ Ticket Store (JSONL, per-day)
└─ Operator copies ticket into Tradovate as OCO


### In-Scope Strategies (MVP)
- **VWAP First-Touch**  
  Code: `packages/strategies/src/vwapFirstTouch.ts`  
  Config: `configs/strategies/vwap-first-touch.json`
- **Opening-Session Breakout (OSB)**  
  Code: `packages/strategies/src/osbBreakout.ts`  
  Config: `configs/strategies/opening-session-breakout.json`

Strategy toggling/scheduling is allowed via config; new strategies can be added later.

## Apex Guardrails (Enforced)
- **Stop required** (funded or if configured) and on **correct side**.
- **Risk:Reward clamp** to policy; reject `<min` or `>max`.
- **Half-size until buffer cleared**; **anti-windfall sizing**.
- **Trailing drawdown awareness** baked into acceptance/sizing.
- **EOD flat window suppression** (see below).
- **Consistency tracking** with optional operator notes.
- Enforcement level is configurable (see `packages/rules-apex`, `configs/rules/apex.json`, `apex/rules.json`).

## Tickets (Canonical)
Each accepted idea is written as a **ticket** the operator can copy into Tradovate.

Shape:
```json
{
  "symbol": "MESZ5",
  "side": "BUY|SELL",
  "entry": 5550.25,
  "stop": 5544.25,
  "target": 5560.25,
  "qty": 2,
  "accountId": "APEX-123456",
  "timestampUtc": "2025-09-09T14:31:22Z",
  "meta": {
    "strategy": "vwap-first-touch",
    "rr": 1.5,
    "guardrails": ["stopSideOk","rrInRange","sizeHalfUntilBuffer"],
    "sizingHint": "half-size",
    "consistencyNotes": "FT1 after pullback"
  },
  "accepted": true,
  "reasons": []
}
```

Tickets are persisted to per-day JSONL files and exposed via:

GET /tickets?date=YYYY-MM-DD

GET /export/tickets?date=YYYY-MM-DD (CSV)

See details in docs/tickets.md.

EOD Behavior

Strategies automatically suppress new tickets inside the EOD flat window (config-driven buffer before session close).

Dashboard shows an EOD countdown to flat window start.

Any ticket evaluated inside suppression returns accepted=false with reason EOD_WINDOW.

Operator Console

See docs/operator-console.md for the exact copy format, OCO mapping in Tradovate, fanout to multiple accounts, rejection codes, and the EOD countdown behavior.

Quality & CI (unchanged)

Node: pnpm lint && pnpm typecheck && pnpm test

Python: ruff --fix && black --check && pytest -q

Depcheck: pnpm run scan:dead

JSON logs; no PII; CORS allow-list via env; health/readiness/metrics present.


ADR 2025-09-09 — Operator-Assisted Architecture (Tickets-Only, No API Orders)
Status

Accepted (2025-09-09)

Context

Apex Trader Funding enforces strict daily loss and trailing drawdown rules.

Tradovate supports API order placement, but operational risk (fat-finger, liquidity events, rate limits, licensing) makes fully automated order flow undesirable at this stage.

Our operator users require a simple, explainable workflow that is resilient to outages and licensing constraints (e.g., market data entitlements).

Decision

Prism-Apex will not place orders via API.

The system only emits tickets with full parameters (symbol, side, entry, stop, target, qty, accountId, metadata).

A human operator manually enters an OCO bracket in Tradovate using the ticket values.

Live market data drives strategy logic; telemetry is read-only.

Consequences

Positive

Eliminates accidental auto-orders and “runaway bot” scenarios.

Keeps compliance simple; operator remains in control of entries.

Works even when market-data API entitlements vary—operators can rely on platform UI.

Negative / Tradeoffs

Requires operator availability during strategy windows.

Slightly slower than API execution; mitigated by clear copy format and OCO templates.

Notes

Guardrails (stop presence/side, risk:reward clamps, sizing policies, EOD suppression) run before ticket emission. Violations produce accepted=false with explicit reasons.

Future: we may revisit limited API actions (telemetry reads only) but never automated order placement without a new ADR and stakeholder approval.

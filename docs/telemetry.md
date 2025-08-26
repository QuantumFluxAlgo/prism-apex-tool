# Telemetry (Demo)

This repository includes a read-only telemetry client for the Tradovate demo environment. The client polls account balances, open positions, fills, and computes simple daily PnL and a buffer-cleared flag. Telemetry is **demo-only**; live wiring will arrive in a future PR.

## Configuration

Set the following environment variables (see `.env.example`):

```
ENABLE_TELEMETRY=true
TELEMETRY_POLL_MS=5000
TRADOVATE_DEMO_REST_BASE=https://demo.tradovateapi.com/v1
TRADOVATE_USER=...
TRADOVATE_PASSWORD=...
TRADOVATE_APP_ID=...
TRADOVATE_APP_VERSION=prism-apex/0.2.0
TRADOVATE_API_CID=...
TRADOVATE_API_SEC=...
TRADOVATE_DEVICE_ID=prism-apex-dev-telemetry
BUFFER_CLEAR_THRESHOLD=2500
```

## API

When telemetry is enabled the API exposes:

- `GET /telemetry/positions?accountId=...`
- `GET /telemetry/account?accountId=...`
- `GET /telemetry/fills?date=YYYY-MM-DD&accountId=...`
- `/ready` includes a `telemetry` block with basic metrics.

The consistency report uses telemetry-derived PnL when enabled; otherwise it falls back to mock data.

## Dashboard

A `/positions` tab displays open positions, account balance, and buffer status. The page polls the API at a selectable interval (3s/5s/10s/Off).

## Buffer Cleared

The buffer flag is derived from cumulative realized PnL crossing `BUFFER_CLEAR_THRESHOLD`. This is a placeholder heuristic for demo purposes and may be replaced when the live platform exposes an explicit flag.

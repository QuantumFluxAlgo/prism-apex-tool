# Daily PnL Data (for Consistency Metrics)

Create `var/pnl/daily.json` with an array of objects:

```json
[
  { "date": "2025-08-18", "pnl": 320.5 },
  { "date": "2025-08-19", "pnl": -150.0 }
]
```

date: YYYY-MM-DD

pnl: number (positive for profit, negative for loss)

The API route GET /report/consistency?window=8 reads this file. If it is missing or empty,
the route responds with 204 No Content.

====================
INTEGRATION NOTES

Register apps/api/src/routes/consistency.ts in your API server the same way other routes are registered.

No external services required.

Keep the window query between 1..15 (clamped in code).

====================
RUN / VERIFY

pnpm --filter @prism-apex/metrics typecheck

pnpm --filter @prism-apex/metrics test

pnpm --filter @prism-apex/api test

(Optional) create var/pnl/daily.json and curl:
curl -s "http://localhost:3000/report/consistency?window=8
" | jq .

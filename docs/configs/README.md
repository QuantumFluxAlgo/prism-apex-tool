# Configs — Accounts & Strategies

## Accounts (`configs/accounts.json`)
**Shape**
- `name` (string) — label for the account
- `accountId` (integer > 0)
- `accountSpec` (string) — broker account spec
- `mode` ("eval" | "funded")
- `planMaxContracts` (integer > 0)
- `baseSize` (integer > 0, default 1)
- `multiplier` (number > 0, default 1)
- `minQty` (integer ≥ 0, default 1)

Copy `configs/accounts.example.json` and edit your values.

## Strategies (`configs/strategies/*.json`)
Each strategy file contains the **numeric knobs** your strategy reads at runtime.
Common fields (examples):
- `lookbackBars`, `rangeLookbackMinutes`, `bufferTicks`, `cooldownBars`, `minRR`
- Optional time fields: `sessionStart`, `sessionEnd` in `HH:MM` or `HH:MM:SS`

Use the `*.example.json` files as templates and align keys with your actual strategy code.

## Validation
Run:


pnpm config:check

- Checks: types, numeric finiteness, non-negative durations/counts; accounts schema also rejects **unknown keys** and bad types.
- Strategy validation is **generic** and safe: it enforces numeric/time types; for strict key lists, pass `allowedKeys` in your own loader or extend the schema.

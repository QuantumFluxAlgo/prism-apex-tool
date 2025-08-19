# Prism Apex Backtesting Framework

## What It Does
- Replays OHLCV bars to simulate ORB and VWAP strategies.
- Applies Apex guardrails: stop required, ≤5R cap, EOD flat (session close), daily loss proximity.
- Outputs JSON + CSV (fills, daily summaries).

## Quick Start
```bash
node apps/cli/src/backtest.js \
  --strategy=ORB \
  --data=data/ES_1m.csv \
  --mode=evaluation \
  --open=14:30 --close=21:59 \
  --tickValue=50 --seed=42
```

Outputs
`backtest.json` → summary + fills + daily

`backtest-fills.csv` → one row per filled trade

`backtest-daily.csv` → per-day PnL summary

## Config Notes (MVP)
- Session times: use UTC/GMT equivalents to enforce EOD flat.
- ≤5R cap: engine clamps targets above 5R.
- Daily loss cap: soft emulation via per-day PnL in backtest.
- Determinism: `--seed` controls slippage randomness (if enabled).

## Extend Later (Tick-Level)
- Replace simulateTrade with tick-matching engine.
- Add partial fills, queue priority, and latency models.
- Plug in full Prompt 24 compliance pass per-trade & end-of-day.

## Caveats
- Bar-level fills can over-estimate executions vs ticks.
- Use conservative slippage settings in pre-prod studies.

---

**QUALITY GATES (must pass)**  
- `npm run test -w tests` (Vitest) → `tests/backtest/engine.spec.ts` passes.  
- CLI produces `*.json` and `*.csv` and prints a summary.  
- 5R clamp verified; daily loss proximity flags populated.  
- No `any`, TypeScript strict OK.

**COMPLETION CHECK**  
Files created/updated:

- `packages/backtest/src/types.ts`  
- `packages/backtest/src/io.ts`  
- `packages/backtest/src/util.ts`  
- `packages/backtest/src/fills.ts`  
- `packages/backtest/src/engine.ts`  
- `packages/backtest/src/adapters/orb.ts`  
- `packages/backtest/src/adapters/vwap.ts`  
- `packages/backtest/src/index.ts`  
- `apps/cli/src/backtest.ts`  
- `tests/backtest/engine.spec.ts`  
- `docs/backtest/overview.md`  

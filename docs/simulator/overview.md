# Prism Apex Risk Simulator

## What It Does
The simulator replays historical market data (bars) to test PrismOne strategies under Apex rules. It demonstrates profitability **and** whether the strategy stays within guardrails.

## How to Use
1. Collect historical OHLCV bar data (1m or 5m).
2. Run:

```bash
python -m simulator.run --strategy ORB --data data/ES_5m.csv --mode evaluation
```

This writes `results.json` and `results.csv` for review.

## Design
- **Bar-level**: Fast MVP using OHLCV bars.
- **Tick-level**: Future enhancement for precision.

## Outputs
- Trade log with PnL and balance.
- Metrics: win rate, average R, drawdown, daily PnL.
- Breach log: any Apex rule violations.

Operators can load the CSV/JSON into spreadsheets; engineers can reproduce backtests via the CLI.

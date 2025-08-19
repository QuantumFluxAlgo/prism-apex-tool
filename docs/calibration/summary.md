# Prism Apex Tool — Risk Calibration Summary

This document summarizes parameter sweeps of **ORB** and **VWAP** strategies
against Apex Trader Funding guardrails.

## Key Findings (Example)

- ORB with 15m window, 8 tick stop, 2R target → 61% win rate, **passes all Apex rules**.
- VWAP with 20bps band, 8 tick stop → strong expectancy but **breaches daily loss cap** in 8% of days.
- Across all runs, ~72% parameter sets breached at least one Apex rule.

## Metrics Recorded
- Win rate (%)
- Expectancy ($ per trade)
- Max drawdown
- Rule breaches (daily loss, trailing drawdown, consistency, EOD flat)

## Next Steps
- Narrow parameter ranges to those that consistently pass Apex rules.
- Incorporate into **live guardrails** (Prompt 14).
- Share CSV/JSON results with strategy engineers.

[Placeholder: charts from notebooks/calibration.ipynb]

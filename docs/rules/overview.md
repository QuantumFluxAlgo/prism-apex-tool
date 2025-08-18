# PrismOne Rules Overview

PrismOne embeds Apex Trader Funding rules to maintain profitability and
operational discipline. The platform differentiates between evaluation
and funded accounts, applying appropriate controls for each stage.

## Evaluation Accounts

- **Profit Target** – account must reach the configured profit target
  before advancing.
- **Trailing Drawdown** – balance may not fall more than the defined
  amount below the high-water mark.
- **Minimum Trading Days** – at least seven unique trading days are
  required.
- **End-of-Day Flat** – no positions may remain open after the allowed
  trading session.
- **Allowed Trading Times** – trades outside the configured session are
  flagged for review.

## Funded Accounts

- **30% Consistency Rule** – profit from any single day may not exceed
  30% of total profits.
- **Stop-Loss Requirement** – every trade must carry a protective
  stop-loss order.
- **Scaling Limits** – contract counts are capped until trailing
  drawdown is cleared.
- **Payout Rules** – eligibility requires minimum trading days,
  profitable days, and observes payout caps.
- **Forbidden Strategies** – predefined strategies are automatically
  rejected.

## Operator Checklist

| Rule / Control | Enforced Automatically | Notes |
| -------------- | --------------------- | ----- |
| Trailing Drawdown | ✅ | Both phases emit violations when breached |
| Minimum Trading Days | ✅ | Evaluation module tracks unique trading days |
| End-of-Day Flat | ✅ | Evaluation module raises events for open positions |
| Consistency Rule | ✅ | Funded module validates 30% limit |
| Stop-Loss Presence | ✅ | Funded module requires stop-loss on each trade |
| Payout Caps | ✅ | Funded module computes capped payouts |
| Discretionary Conduct | ⚠️ | Operators monitor for reckless behaviour |

## Technical References

- [Evaluation Rules Module](../../rules/evaluation.py)
- [Funded Rules Module](../../rules/funded.py)
- [Unified Rule Engine](../../rules/engine.py)

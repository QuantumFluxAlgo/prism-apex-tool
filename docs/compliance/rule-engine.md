# Compliance Rule Engine

## Purpose
Codify Apex Trader Funding rules into machine-enforceable checks.

## How It Works
- Loads `apex/rules.json` definitions.
- Validates `AccountState` against all rules via `checkCompliance`.
- Returns `{ ok, violations[] }`.
- Violations feed into the Alerts pipeline.

## Example
```ts
import { checkCompliance, AccountState } from '../../apps/api/src/services/rules/engine';

const state: AccountState = {
  phase: 'evaluation',
  balance: 50000,
  equityHigh: 50000,
  openPositions: [],
  tradeHistory: [],
  dayPnL: {},
  trailingDrawdown: 49000,
};

const res = checkCompliance(state);
console.log(res.ok);
```

## Rules Covered
| JSON id | Rule | Apex Reference |
|---------|------|----------------|
| eval-profit-target | Profit Target | Evaluation Handbook §Profit Target |
| eval-trailing-dd | Trailing Drawdown | Evaluation Handbook §Drawdown |
| eval-min-days | Minimum Trading Days | Evaluation Handbook §7 Days |
| eval-eod-flat | End of Day Flat | Evaluation Handbook §EOD |
| eval-resets | Account Resets | Evaluation Handbook §Resets |
| funded-stoploss | Stop-Loss Required | Funded Account Handbook §Stops |
| funded-consistency | Consistency Rule | Funded Account Handbook §Consistency |
| funded-scaling | Half-Contract Scaling | Funded Account Handbook §Scaling |
| funded-windfall | No All-In/Windfall | Funded Account Handbook §Windfall |
| funded-dd-lock | Trailing DD Lock | Funded Account Handbook §DD Lock |
| funded-news | News Trading Ban | Funded Account Handbook §News |
| payout-safety-net | Safety Net | Payouts Handbook §Safety Net |
| payout-cadence | Payout Cadence | Payouts Handbook §Cadence |
| payout-profit-split | Profit Split | Payouts Handbook §Profit Split |

## Operator Impact
- Operators see compliance alerts before inputting trades.
- Violations mean: **do not place ticket**.

## Future Work
- Map remaining Apex rules into `apex/rules.json`.
- Add a diagram of the compliance flow.

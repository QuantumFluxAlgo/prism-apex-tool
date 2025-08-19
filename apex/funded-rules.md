# Apex Funded Rules (Performance Accounts)

**Purpose:** Define rules for funded trading accounts.

## Consistency Rule
- Profit per day should not exceed 30% of total profits.
- Compliance Note: Breaches may delay payouts.

## Max Loss / Risk Policy
- Risk per trade ≤30% of profits until threshold increases to 50%.
- Compliance Note: Exceeding risk limits may forfeit account.

## Mandatory Stop-Loss (Risk/Reward ≤5:1)
- TODO: Document enforcement examples.
- Compliance Note: Orders must include protective stops.

## Half-Contract Rule
- Scaling limited to half of evaluation max until drawdown cleared.
- Compliance Note: See [Evaluation Rules](./evaluation-rules.md#no-scaling-limits) for contrast.

## Drawdown Behavior
- Trailing until locked at initial balance + $100.
- Compliance Note: Monitor balance to avoid trailing breach.

## No All-In / Windfall Strategies
- TODO: Define windfall and all-in criteria.
- Compliance Note: Excessive leverage triggers review.

## Multi-Account Rules
- Max 20 accounts; no hedging or gaming across accounts.
- Compliance Note: Linked accounts must trade independently.

## Allowed Strategies
- Scaling, DCA, and news trading permitted within risk limits.
- Compliance Note: Maintain audit trails for all automated systems.

## TODO
- Add probation & compliance violation examples.

## Cross-References
- See [Evaluation Rules](./evaluation-rules.md) for challenge phase.
- See [Payout Process](./payouts.md) for withdrawal policies.

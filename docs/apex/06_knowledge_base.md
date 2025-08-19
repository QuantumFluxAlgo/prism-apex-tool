# Apex Trader Funding – Rules, Funding Process, and Technical Platforms

## Evaluation Phase Rules
- **Profit Target:** Each evaluation account has a fixed goal. Example: a **$50,000** account must earn **$3,000**.
- **Trailing Drawdown:** Real-time max loss that trails peak balance. Example: the $50k plan has a **$2,500** trailing drawdown.
- **Minimum Trading Days:** Trade at least **7 separate days**. Half-day market sessions **do not count**.
- **End-of-Day Flat:** All positions and orders must be closed by **4:59 PM ET**.
- **Scaling:** No contract scaling limits during evaluation; you may use the full contract allotment.
- **News Trading:** Permitted unless Apex issues a specific restriction.
- **Resets:** Account can be reset at cost and begins a new evaluation cycle.
- **Pass Criteria:** Reach profit target, respect trailing drawdown, and trade 7 qualifying days.

### Evaluation Account Example
| Plan Balance | Profit Target | Trailing Drawdown | Max Contracts* |
|--------------|---------------|------------------|----------------|
| $50,000      | $3,000        | $2,500           | 10 | 

\*Max contracts are defined by Apex's plan; no scaling rules apply in evaluation.

## Funded Phase Rules
- **30% Consistency Rule:** No single day may exceed **30%** of total profits at payout. Violations can deny payout and place the account on **consistency probation**.
- **Loss Limits:** Breaching the trailing drawdown or the daily loss cap closes the account.
- **Mandatory Stop-Loss:** Every order must include a protective stop.
- **Risk/Reward Cap:** Targets may be no more than **5×** the stop distance (max **5:1 R/R**).
- **Half-Contract Scaling:** Trade **half** the account’s max contracts until the trailing drawdown buffer is cleared.
- **Trailing Drawdown Lock-In:** Once balance reaches starting balance plus drawdown (e.g., $52,500 on a $50k PA), the drawdown locks at the start balance.
- **No Gambling Strategies:** Apex may terminate for unsound tactics or reckless trading.
- **Account Limits:** Up to **20** active Performance Accounts per trader; **no resets** allowed.
- **Payout Structure:** First **$25,000** kept **100%**, then **90/10** split until the **6th payout**, after which split returns to **100%**.
- **Payout Cadence:** Minimum **8 trading days** between withdrawals.
- **Payout Caps:** Payout #1 capped at **$2,000**, #2 at **$2,500**, #3 at **$5,000**; caps removed after third payout.
- **Safety Net:** After each payout, account must retain trailing-drawdown amount.
- **Transition to Live Trading:** After consistent performance, trader may elect to go live with a broker.

## Funding Step-by-Step
1. **Sign Up:** Purchase evaluation plan and choose platform (Rithmic/NinjaTrader, Tradovate/TradingView, or WealthCharts).
2. **Platform Setup:** Install or access the platform with credentials from Apex.
3. **Trade Evaluation:** Follow evaluation rules, monitor trailing drawdown, and flat by 4:59 PM ET.
4. **Hit Targets:** Reach profit goal and complete 7 qualifying days.
5. **Sign PA Contract:** Apex emails Performance Account agreement; pay **$85/month** fee.
6. **Trade Funded Account:** Apply funded rules and build consistency.
7. **Request Payout:** After 8 trading days and meeting consistency, request withdrawal via Apex dashboard.

## Technical Platforms
### Rithmic + NinjaTrader
- **Difficulty:** 7/10
- **Pros:** Low-latency data, advanced charting, automation via NinjaScript.
- **Cons:** Windows-only, requires software installation, steep learning curve.
- **Setup Tips:** Use Apex-provided Rithmic credentials; configure NinjaTrader connection manually.
- **Apex Restrictions:** One Rithmic login per machine; Apex data only.

### Tradovate + TradingView
- **Difficulty:** 3/10
- **Pros:** Web and mobile access, intuitive UI, native TradingView charts.
- **Cons:** Limited automation, dependent on cloud connectivity.
- **Setup Tips:** Create Tradovate login through Apex; link account to TradingView if charting there.
- **Apex Restrictions:** Cannot share credentials; close all browser sessions before switching accounts.

### WealthCharts
- **Difficulty:** 4/10
- **Pros:** Turnkey layouts tailored for Apex, built-in liquidation indicator.
- **Cons:** Closed ecosystem, less third-party integration.
- **Setup Tips:** Use Chrome; enable Apex template for trailing-drawdown overlay.
- **Apex Restrictions:** Trading limited to provided symbols and time frames.

### Platform Comparison
| Platform                | Difficulty | Pros                               | Cons                        | Apex Nuances                      |
|-------------------------|-----------|------------------------------------|-----------------------------|-----------------------------------|
| Rithmic + NinjaTrader   | 7/10      | Low latency, automation            | Windows only, complex setup | One login per machine             |
| Tradovate + TradingView | 3/10      | Web/mobile, easy to start          | Limited automation          | Logout before switching accounts  |
| WealthCharts            | 4/10      | Apex presets, liquidation alerts   | Closed ecosystem            | Only Apex-approved instruments    |

## Comparison Table – Evaluation vs Funded Accounts
| Rule / Feature              | Evaluation Account                           | Funded/Performance Account                       |
|----------------------------|----------------------------------------------|--------------------------------------------------|
| Trailing Drawdown          | Real-time; trails until target hit           | Locks once start balance + drawdown is reached   |
| Minimum Trading Days       | 7 days; half-days excluded                   | 8 trading days between payouts                   |
| Scaling                    | No scaling limits                            | Half-contract rule until buffer built            |
| Resets                     | Allowed (paid)                               | Not permitted                                    |
| News Trading               | Allowed                                      | Allowed unless Apex issues restriction           |
| Consistency Rule           | Not enforced                                 | 30% daily profit cap; violations deny payout     |
| Payout Structure           | N/A                                          | 1st $25k 100%; then 90/10 until 6th payout       |
| Payout Caps                | N/A                                          | $2k / $2.5k / $5k for payouts #1-#3              |
| Stop-Loss Requirement      | Not mandatory (recommended)                  | Mandatory on every order                         |
| Transition Option          | Move to funded after pass                    | Can opt into live trading after consistency      |


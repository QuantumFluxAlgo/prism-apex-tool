# Prism Apex Operator Dashboard

## What It Does
The dashboard is the operator's command center. It displays:
- **Trade Tickets** from ORB and VWAP strategies.
- **Account Status** with balance, drawdown, and open positions.
- **Alerts** for Apex violations, EOD requirements, and scaling notices.
- **Reports** summarizing historical performance.

## How to Use
1. Open the dashboard in your browser.
2. Review the **Tickets** tab for trades to input into Tradovate.
3. Monitor **Account Status** for balance and drawdown.
4. Watch the **Alerts** panel for Apex risk warnings.
5. Switch to **Reports** to inspect simulator metrics and win rates.

## Data Sources
All information is fetched from the API endpoints:
- `/tickets`
- `/account`
- `/alerts`
- `/reports`

Alerts refresh automatically every 5 seconds.

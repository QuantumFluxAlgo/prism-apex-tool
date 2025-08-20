# Multi-Account Management — Operator Guide

## What This Does
- Shows all your Apex accounts grouped by **trader group** (you).
- **Blocks hedging**: you cannot be long and short the same symbol across your accounts.
- **Copy-Trade** helper: generates same-direction tickets per account with safe sizes.

## Plain English Rules
- **No Hedging:** If one account is **BUY ES**, another account in your group **cannot** be **SELL ES** at the same time.
- **Same Direction Copying:** You may place the **same direction** across your accounts if each account obeys its own limits.
- **Sizing:** We cap sizes by each account’s `maxContracts`. If a funded account has no buffer, we auto **half-size**.

## How to Use
1) Open the dashboard → **Multi-Account** section.
2) Click **Preview Copy-Trade** on your group.
3) If preview is ✅, the system lists per-account tickets for you to enter in Tradovate.
4) If ❌ shows **would_create_hedge**, you must close the opposite position first.

## Alerts & Logs
- Any detected hedge triggers a **🚫 Slack/Email alert** and appears in **audit logs**.
- All copy-trade generations are logged as **OPERATOR_ACTION**.

```mermaid
flowchart TD
    A[Strategy Ticket] --> B[Copy-Trader Preview]
    B -->|OK| C[Per-Account Tickets (Same Direction)]
    B -->|Hedge| D[BLOCK + Alert]
    C --> Operator[Manual Entry in Tradovate]
```

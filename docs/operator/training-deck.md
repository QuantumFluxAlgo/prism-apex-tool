# Prism Apex Tool — Operator Training Deck (MVP)

## 1) Context & Roles
- **What you do:** Manually key trades into **Tradovate** from system-generated **tickets**.
- **What you don’t do:** You **do not** pick instruments, sides, or sizes.
- **Why:** Apex rules require strict guardrails; our system computes signals and monitors risk.

## 2) Daily Flow (High-Level)
1. **SOD:** Health check → recipients → session time.
2. **Execute:** Read ticket → enter order in Tradovate **with OCO stop + target**.
3. **Monitor:** Watch alerts (Slack/Email) and dashboard status.
4. **EOD:** **Flat by 21:59 GMT** → confirm zero positions.
5. **Incidents:** Use the escalation playbook.

```mermaid
flowchart TD
    A[SOD Checks] --> B[Read Ticket]
    B --> C[Enter in Tradovate (OCO)]
    C --> D[Monitor Alerts & Rules]
    D --> E[EOD Flat by 21:59 GMT]
    D --> F{Alert?}
    F -->|WARN/CRIT| G[Pause & Escalate]
```

## 3) Tickets (Plain English)
A ticket contains: symbol, side (BUY/SELL), entry, stop, target, size.

Stop is mandatory. Target is capped at ≤5R by our system.

If the dashboard shows Pause or OCO Missing, do not enter new trades.

## 4) Alerts (What They Mean)
WARN (amber): Approaching a limit (e.g., 70% daily loss). Be cautious.

CRITICAL (red): Breach imminent or detected (e.g., 85% daily loss; missing OCO). Stop and escalate.

EOD T–10 / T–5: Close out to be flat by 21:59 GMT.

## 5) EOD Flat (Non-Negotiable)
By 21:59 GMT, zero open positions.

The system nudges you but you own the final check.

## 6) Do / Don’t
**Do**
Double-check stop and target are attached (OCO).

Confirm account and symbol match the ticket.

Take screenshots of anomalies.

**Don’t**
Don’t freestyle entries or sizes.

Don’t trade past 21:59 GMT.

Don’t ignore CRITICAL alerts.

## 7) Escalation
Post in #ops-incidents with a one-liner (time, symbol, issue).

Ping Solutions Architect → IT PM → CTO (if needed).

If positions are at risk, close then escalate.

[Placeholder: screenshot of dashboard with tickets and alerts]

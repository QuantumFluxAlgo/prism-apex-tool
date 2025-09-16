
Operator Console Guide (Prism-Apex → Tradovate OCO)

You don’t need to code. Follow these steps exactly. Prism-Apex never places orders—you do, using the ticket details shown in the dashboard or API.

1) Find the Ticket

Open the local dashboard (or call the API):

GET /tickets?date=YYYY-MM-DD[&strategy=STRATEGY] → list of today’s tickets (optionally filter by strategy)

GET /export/tickets?date=YYYY-MM-DD → CSV export

Each ticket shows: symbol, side, entry, stop, target, qty, accountId, rr, sizingHint.

Quick Copy Format

When you copy from the ticket, use this exact line:

SYMBOL SIDE QTY ENTRY STOP TARGET


Example:

MESZ5 BUY 2 5550.25 5544.25 5560.25

2) Enter as OCO in Tradovate (Manual)

You’ll create one entry order and attach two linked exits (OCO: target + stop).

A. Entry

Select account shown on the ticket (e.g., APEX-123456).

Select contract = symbol (e.g., MESZ5).

Choose BUY or SELL (from side).

Type: use Limit at entry price (or Market if strategy specifies; default is Limit).

Qty: set to qty (sizingHint may recommend half-size).

Enable Bracket/OCO (Tradovate calls this Bracket or OSO).

Do not send yet.

B. Exits (OCO children)

Take Profit (Limit) at target.

Stop Loss (Stop/Stop-Market) at stop.

Tip: If Tradovate uses ticks for offsets, just switch to absolute price mode and type the prices directly.

C. Submit

Send the bracketed order.

After the entry fills, the two exits become active OCO legs. If one exits, the other auto-cancels.

3) Fanout (Same Ticket to Multiple Accounts)

If you operate multiple Apex accounts:

Repeat the exact OCO entry per account.

If the ticket’s qty is per account, keep it.
If it’s total size, divide by number of accounts and round down.

Keep identical prices across accounts to preserve the intended risk:reward.

4) Rejection Codes (what the console will show)

A ticket may be rejected (you won’t enter it). Reasons appear on the ticket as a list:

STOP_REQUIRED: Stop is required by policy.

STOP_SIDE_INVALID: Stop not on the safe side for the side (buy/sell).

RR_OUT_OF_RANGE: Risk:Reward outside [min,max].

SIZE_CLAMPED: Size reduced by policy (anti-windfall / half-size until buffer).

TRAILING_DRAWDOWN: Account drawdown risk exceeded.

EOD_WINDOW: Inside End-Of-Day flat window (no new positions).

OUT_OF_HOURS: Strategy session closed.

CONFIG_DISABLED: Strategy turned off by config/schedule.

DUPLICATE_SIGNAL: De-dupe caught a repeat.

SYMBOL_INVALID: Contract/symbol not tradeable under current rules.

If a ticket shows accepted=false, do not enter it.

5) EOD Countdown

The console shows time remaining until the EOD flat window starts.

When countdown reaches zero:

New tickets are suppressed (you won’t see any accepted=true).

Manage any open positions normally inside Tradovate as per your plan.

6) Quick Troubleshooting

No tickets appear: strategy may be disabled or out of session; check the countdown and config.

Prices look off: confirm contract month (e.g., MESZ5) and decimal format.

Size changes: sizingHint may be half-size due to risk buffer; follow the qty in the ticket.

Account mismatch: ensure the Tradovate account in the top-right matches accountId on the ticket.

7) Reference Shapes (read-only)

JSON Ticket

{"symbol":"MESZ5","side":"BUY","entry":5550.25,"stop":5544.25,"target":5560.25,"qty":2,"accountId":"APEX-123456","timestampUtc":"2025-09-09T14:31:22Z","meta":{"strategy":"vwap-first-touch","rr":1.5,"guardrails":["stopSideOk","rrInRange"],"sizingHint":"half-size"},"accepted":true,"reasons":[]}


CSV Export (columns)

symbol,side,entry,stop,target,qty,accountId,timestampUtc,strategy,rr,accepted,reasons,sizingHint


That’s it. Copy the line, enter the OCO, and you’re done.

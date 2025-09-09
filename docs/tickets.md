
Tickets — Canonical Schema & Exports

Tickets are the only way Prism-Apex communicates trade ideas. Operators copy the values into Tradovate as an OCO. No API orders.

1) Canonical JSON Schema (shape, not a JSON-Schema file)
{
  "symbol": "MESZ5",
  "side": "BUY|SELL",
  "entry": 5550.25,
  "stop": 5544.25,
  "target": 5560.25,
  "qty": 2,
  "accountId": "APEX-123456",
  "timestampUtc": "2025-09-09T14:31:22Z",
  "meta": {
    "strategy": "vwap-first-touch | osb-breakout | ...",
    "rr": 1.5,
    "guardrails": ["stopSideOk","rrInRange","sizeHalfUntilBuffer"],
    "sizingHint": "half-size | normal | reduced",
    "consistencyNotes": "optional string"
  },
  "accepted": true,
  "reasons": []
}


Field notes:

Prices are absolute (not ticks).

qty is contracts to enter on this account unless the ticket states otherwise.

accepted = true means operator MAY enter; false means do NOT.

2) Rejection Codes (when accepted=false)

A ticket can be rejected by guardrails. Reasons appear as an array of strings:

STOP_REQUIRED — policy requires a stop.

STOP_SIDE_INVALID — stop not on safe side for side.

RR_OUT_OF_RANGE — risk:reward outside allowed [min,max].

SIZE_CLAMPED — reduced per anti-windfall / half-size until buffer.

TRAILING_DRAWDOWN — account’s trailing drawdown risk exceeded.

EOD_WINDOW — inside end-of-day flat window.

OUT_OF_HOURS — not in session window for the strategy.

CONFIG_DISABLED — strategy disabled by config/schedule.

DUPLICATE_SIGNAL — duplicate within de-dupe horizon.

SYMBOL_INVALID — symbol/contract not permitted.

If any of these appear, the UI/API will show accepted=false — do not place the order.

3) CSV Export Shape

Endpoint: GET /export/tickets?date=YYYY-MM-DD

Header

symbol,side,entry,stop,target,qty,accountId,timestampUtc,strategy,rr,accepted,reasons,sizingHint


Example Row

MESZ5,BUY,5550.25,5544.25,5560.25,2,APEX-123456,2025-09-09T14:31:22Z,vwap-first-touch,1.5,true,,half-size


reasons is a ;-joined list if multiple (or empty).

strategy and sizingHint are derived from meta.

4) Operator Copy Format (one-liner)

Use this exact order for quick copy from UI to the platform:

SYMBOL SIDE QTY ENTRY STOP TARGET


Example:

MESZ5 BUY 2 5550.25 5544.25 5560.25


This maps directly to Tradovate inputs:

Contract = SYMBOL

Side = SIDE

Quantity = QTY

Entry (Limit) = ENTRY (or Market per ticket)

Stop = STOP (Stop-Market)

Target = TARGET (Limit)

5) Sizing & Fanout Notes

qty respects sizing policies (e.g., half-size until buffer clears).

For multiple accounts, either:

Use qty per account, or

Split a total across accounts and round down per account.

Keep identical prices across accounts to preserve R:R.

6) EOD Suppression

Tickets created within the configured EOD flat window are suppressed.

Suppressed tickets show accepted=false and include EOD_WINDOW in reasons.

Dashboard displays an EOD countdown to flat window start.

7) Endpoints (read-only)

GET /tickets?date=YYYY-MM-DD — JSONL aggregation for the day.

GET /export/tickets?date=YYYY-MM-DD — CSV snapshot.

Operational tip: If a ticket is accepted but you decide not to enter it, no API changes are needed—this is operator-assisted by design.

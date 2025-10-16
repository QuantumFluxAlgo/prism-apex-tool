# Consistency Metrics

The Consistency Enforcer computes Apex-style payout eligibility metrics:

- **Top-day share** must be \u2264 30% of total net.
- At least **5 profit days** with \u2265 $50 net in the last 8 days.

For now the system runs in **metrics-only** mode. Tickets include
`meta.consistencyNotes = "metrics-only; enforce=false"`.

An optional flag `CONSISTENCY_ENFORCE=true` prepares the system for
pre-blocking funded accounts but is disabled until real PnL telemetry
arrives.

## API

`GET /report/consistency?accountId=<id>&window=8`

Returns the computed metrics and pass/fail reasons. A mock PnL provider is
used for tests and development. Real PnL will be supplied in PR-C1.

# Guardrails & Sizing (Env)

| Key | Default | Notes |
| --- | --- | --- |
| MIN_RR | 1.5 | minimum risk/reward |
| MAX_RR | 5 | maximum risk/reward (≤5) |
| FLAT_BY_UTC | 20:59 | EOD flat cutoff (UTC) |
| SIZE_POLICY | percent-of-max | sizing policy |
| PCT_OF_MAX_WHEN_NO_BUFFER | 0.5 | percent of max contracts without buffer |
| PCT_OF_MAX_WHEN_BUFFER | 1.0 | percent of max contracts after buffer |
| HALF_SIZE_UNTIL_BUFFER | true | start half size until buffer cleared |
| CONSISTENCY_TRACKING_ENABLED | true | metrics only; no enforcement in V1 |
| CONSISTENCY_DAY_SHARE_LIMIT | 0.3 | 30% single-day share limit |
| CONSISTENCY_MIN_PROFIT_DAY_USD | 50 | minimum profit to count a day |
| CONSISTENCY_WINDOW_DAYS | 8 | rolling summary window |
| MIN_PROFIT_TICKS | (blank) | profit floor disabled |
| MIN_EXPECTED_PROFIT_USD | (blank) | profit floor disabled |

Consistency is tracked only in V1; enforcement comes later.

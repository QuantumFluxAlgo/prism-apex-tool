# Ticket Schema and Guardrails

## Canonical Ticket

```ts
export type Ticket = {
  symbol: string;            // full contract, e.g., ESZ4
  side: "BUY" | "SELL";
  entry: number;
  stop: number;
  target: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta: {
    strategy: "VWAP_FT" | "OSB";
    rr: number;
    guardrails: string[];
    sizingHint?: string;
    consistencyNotes?: string;
  };
  accepted: boolean;
  reasons?: string[];
};
```

## Guardrails

- Phase policy (eval/funded)
- RR bounds `MIN_RR`–`MAX_RR`
- Stop required when funded
- Apex contract caps & half-size until buffer
- Anti-windfall sizing
- Pre‑close suppression (last five minutes before `FLAT_BY_UTC`)

Consistency checks are deferred; tickets include `meta.consistencyNotes` as a placeholder.

## Examples

### JSON

```json
{
  "symbol": "ESZ4",
  "side": "BUY",
  "entry": 100,
  "stop": 99,
  "target": 102,
  "qty": 1,
  "accountId": "A1",
  "timestampUtc": "2024-01-01T14:30:00Z",
  "meta": {
    "strategy": "VWAP_FT",
    "rr": 2,
    "guardrails": ["phase:funded", "rr-clamp"],
    "consistencyNotes": "consistency:metrics-only"
  },
  "accepted": true
}
```

### CSV Row

```
symbol,side,entry,stop,target,qty,accountId,timestampUtc,meta.strategy,meta.rr,accepted,reasons
ESZ4,BUY,100,99,102,1,A1,2024-01-01T14:30:00Z,VWAP_FT,2,true,
```

## Query & Export

Paginate tickets by passing the `cursor` returned from the previous request:

```
GET /tickets?date=2024-01-01
GET /tickets?date=2024-01-01&cursor=50
```

Example JSON response:

```json
{
  "tickets": [{ "symbol": "ESZ4", "side": "BUY", "entry": 100, "stop": 99, "target": 102, "qty": 1, "accountId": "A1", "timestampUtc": "2024-01-01T14:30:00Z", "meta": { "strategy": "VWAP_FT", "rr": 2, "guardrails": [] }, "accepted": true }],
  "nextCursor": null
}
```

CSV export returns canonical fields plus strategy metadata:

```
symbol,side,entry,stop,target,qty,accountId,timestampUtc,meta.strategy,meta.rr,accepted,reasons
ESZ4,BUY,100,99,102,1,A1,2024-01-01T14:30:00Z,VWAP_FT,2,true,
```

## Dashboard

The dashboard listens for the `ticket` bus event to refresh views when new tickets arrive.


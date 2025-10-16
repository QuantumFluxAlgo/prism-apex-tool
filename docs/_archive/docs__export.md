# Ticket export

`GET /export/tickets?date=YYYY-MM-DD&format=json|csv&accountId=ID`

Exports tickets for a given UTC date. The default `format` is `json`. Use `format=csv` for a compact CSV output. When `accountId` is supplied and the account exists, sizing suggestions are included.

## JSON example

```json
[
  {
    "when": "2024-08-24T12:00:00Z",
    "symbol": "ES",
    "side": "BUY",
    "qty": 1,
    "entry": 1,
    "stop": 0,
    "target": 2,
    "accepted": true,
    "rr": 2,
    "reasons": [],
    "preCloseSuppressed": false,
    "flatByUtc": "20:59",
    "sizeSuggested": 2,
    "sizeAllowed": 2,
    "halfSizeSuggested": false,
    "overAllowed": false,
    "jumpExceeded": false
  }
]
```

## CSV example

```
ts,symbol,side,entry,stop,target,rr,accepted,reason_summary,pre_close,flat_by_utc,size_suggested,size_allowed,half_size_suggested,over_allowed,jump_exceeded
2024-08-24T12:00:00Z,ES,BUY,1,0,2,2,true,,false,20:59,2,2,false,false,false
```

Sizing fields appear only when `accountId` is provided and an account file exists in the data directory. `sizeAllowed` mirrors `sizeSuggested` for backward compatibility. `overAllowed` and `jumpExceeded` appear when the stored ticket includes a `qty`.

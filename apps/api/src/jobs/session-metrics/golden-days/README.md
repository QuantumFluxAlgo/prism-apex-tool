# Golden Day Fixtures & Replay Harness

This directory contains **Golden Day** fixtures and a replay harness for the SessionMetrics pipeline.

## Purpose

- Capture a small set of representative sessions ("Golden Days") as deterministic fixtures.
- Re-run the SessionMetrics pipeline against those fixtures so strategy/metrics changes can be validated before risking capital.
- Provide a lightweight replay harness plus placeholder tests to plug into CI later.

## Fixture shape (conceptual)

Each fixture is a JSON document with the following structure:

```jsonc
{
  "symbol": "ES",
  "sessionDate": "2025-01-15",
  "timezone": "America/Chicago",
  "bars1m": [
    {
      "ts": "2025-01-15T14:30:00.000Z",
      "open": 4800.0,
      "high": 4801.0,
      "low": 4799.5,
      "close": 4800.5,
      "volume": 1234
    }
    // ... more bars ...
  ],
  "expectedSessionMetrics": {
    "orHigh": 4810.0,
    "orLow": 4790.0,
    "orWidth": 20.0,
    "orToAtrRatio": 1.2,
    "vwapSlopeClassification": "UP"
  }
}
```

Notes:
- `bars1m` is the raw data replayed through the SessionMetrics runtime.
- `expectedSessionMetrics` is optional; we can gradually add assertions as fixtures are validated.

## Replay harness

- Loads a Golden Day fixture (by name for now).
- Calls `createSessionMetricsService().getForSymbolSession({ symbol, sessionDate })` to recompute metrics.
- Returns both recomputed metrics and any expectations so tests/tools can compare them.
- Early iterations operate manually; later we can wire them into CI once the fixtures are stable.


## Naming convention and layout

- Fixtures live as JSON files in this directory.
- Recommended naming pattern: `<symbol>_<sessionDate>.json` (e.g. `ES_2025-01-15.json`).
- Diagnostic/example fixtures may use other names (e.g. `fixtures.example.json`), but replay tooling should prefer the naming pattern for real Golden Days.
- Keep fixtures anonymised/sanitised as needed; they should contain only the data required to replay SessionMetrics.

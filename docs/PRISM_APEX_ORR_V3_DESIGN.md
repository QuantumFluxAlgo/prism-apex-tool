# Prism-Apex – ORR v3 Design

## 1. Purpose

ORR v3 (Opening Range Reversion / Opening Range Regime) is a **pure strategy module**
that consumes the Phase 1 data layer (SessionMetrics + SessionFlags) and emits
**deterministic, read-only signals** per (symbol, sessionDateUtc) session.

It **does not**:

- Place orders
- Touch balances, positions, or Apex funding logic
- Know about account size, drawdowns, or trailing thresholds

Instead, ORR v3 acts as a *signal generator* that the Strategy Orchestrator and
future risk_engine_v2 can consume.

---

## 2. Inputs

Conceptually, ORR v3 runs per **session** and sees:

- `symbol`: root futures symbol (e.g. ES, NQ, CL)
- `sessionDateUtc`: `YYYY-MM-DD`, aligned with Phase 1 keys
- **SessionMetrics summary** (from Phase 1):
  - Opening Range (OR) high/low/width
  - OR:ATR ratio
  - VWAP slope classification (UP / DOWN / FLAT)
  - Session high/low, close, and derived ranges
- **SessionFlags summary**:
  - `flags: SessionFlag[]` — NEWS / FOMC / ROLL / HOLIDAY / OTHER
  - `hasNewsFlag: boolean` — NEWS or FOMC present
- **Optional bar/price context** (v3 scope):
  - Simple price bands relative to OR (e.g., “currently above/below OR high/low”)
  - High-level regime tags (“trend up”, “chop”, “vol crush”) derived from metrics

In code, the v3 engine gets a **context object** with primitives and small
string unions; the concrete mapping from SessionMetrics/SessionFlags to that
context lives in a separate adapter later.

---

## 3. Outputs

ORR v3 emits a *set of candidate actions* for the orchestrator to consume.

### 3.1 Signal vocabulary

At minimum:

- `direction`: `'LONG' | 'SHORT'`
- `regime`: `'OR_BREAK' | 'INSIDE_OR' | 'NO_TRADE' | 'POST_OR_FADE'`
- `priority`: `'A' | 'B' | 'C'` (internal ordering for ORR-only)
- `rMultipleTarget`: number (target R multiple, e.g., 2.0)
- `maxRiskPerContract`: number (basis points or currency, to be interpreted by risk engine)
- `tags`: string[] (free-form tags like `["breaking_OR_high", "trend_up"]`)

### 3.2 Session-level result

The engine returns:

- `sessionKey` — `{ symbol, sessionDateUtc }`
- `signals: OrrSignal[]` — zero or more signals
- `notes?: string[]` — debug/traceable reasons, safe to expose in internal UI
- `diagnostics?: Record<string, unknown>` — optional, for debugging only

No PnL, no position sizing, and no account-level state is embedded here.

---

## 4. Behavioural Rules (v3 scope)

v3 focuses on **clear, testable behaviours**, not on “perfect” trade logic:

1. **Regime classification first**
   - Determine regime strictly from SessionMetrics:
     - `OR_BREAK`: price has broken OR high/low by a configured threshold.
     - `INSIDE_OR`: price is still within the OR band.
     - `NO_TRADE`: regimes excluded by flags (e.g. NEWS/FOMC) or extreme ATR.
     - `POST_OR_FADE`: after OR window, price is reverting toward VWAP.

2. **News / special session handling**
   - If `hasNewsFlag === true` and the config says “no ORR on news”:
     - Emit `regime = 'NO_TRADE'` and `signals = []`.
   - Alternative behaviours (reduced size, delayed start) can be added later via
     configuration, not hard-coded.

3. **OR break template**
   - When price breaks **above OR high** with supportive metrics:
     - Consider a LONG signal with `regime = 'OR_BREAK'`, `direction = 'LONG'`.
   - When price breaks **below OR low**:
     - Consider a SHORT signal with `regime = 'OR_BREAK'`, `direction = 'SHORT'`.
   - Each signal is purely descriptive; risk_engine_v2 will decide whether it is
     actionable.

4. **Inside OR / no-signal cases**
   - When price remains inside the OR or metrics are inconclusive:
     - Either emit no signals or a low-priority “watch-only” signal.
   - The orchestrator is free to ignore “watch-only” signals later.

5. **Determinism**
   - Given the same context (inputs), ORR v3 must always return the same set of
     signals. No randomness, no external I/O.

---

## 5. ORR v3 Engine Interface (conceptual)

At the boundary, we want:

- A small, serializable context type
- A deterministic engine
- No side effects

Conceptual TypeScript shape:

```ts
export type OrrDirection = 'LONG' | 'SHORT';

export type OrrRegime =
  | 'OR_BREAK'
  | 'INSIDE_OR'
  | 'NO_TRADE'
  | 'POST_OR_FADE';

export interface OrrSessionKey {
  symbol: string;
  sessionDateUtc: string;
}

export interface OrrContext {
  session: OrrSessionKey;
  // Phase 1 summaries, adapted to simple primitives:
  orWidth: number | null;
  orToAtrRatio: number | null;
  vwapSlope: 'UP' | 'DOWN' | 'FLAT' | 'UNKNOWN';
  hasNewsFlag: boolean;
  // Optional extra features (all optional for v3):
  priceRelativeToOr?: 'ABOVE_OR_HIGH' | 'BELOW_OR_LOW' | 'INSIDE_OR' | 'UNKNOWN';
  volatilityBucket?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface OrrSignal {
  direction: OrrDirection;
  regime: OrrRegime;
  priority: 'A' | 'B' | 'C';
  rMultipleTarget: number;
  maxRiskPerContract?: number | null;
  tags?: string[];
}

export interface OrrResult {
  session: OrrSessionKey;
  signals: OrrSignal[];
  notes?: string[];
  diagnostics?: Record<string, unknown>;
}
```

The actual implementation in v3 will be a thin, pure function or an object with
a single evaluateSession(context) method.

## 6. Integration Points

ORR v3 is not responsible for:
- Strategy orchestration ordering → handled by the Strategy Orchestrator.
- Risk limits, sizing, Apex rules → handled by risk_engine_v2.
- UI formatting → handled by Worklist/Tickets.

### 6.1 From Orchestrator perspective

The orchestrator will:
- Build an OrrContext using Phase 1 data (SessionMetrics + SessionFlags).
- Call orrEngine.evaluateSession(context).
- Receive OrrResult and attach it to the combined strategy outputs.

### 6.2 From Risk Engine perspective (future)

risk_engine_v2 will later receive:
- ORR signals (plus VWAP FT, OSB signals)
- Account/risk state

It will then decide:
- Which signals become ticket drafts
- Which are suppressed due to Apex guardrails

ORR v3 itself stays “dumb” about risk.

## 7. Testing Strategy

To keep v3 testable:

Unit tests should:
- Construct small OrrContext fixtures (no DB, no external services).
- Verify:
  - regime classification choices,
  - presence/absence of signals under NEWS/FOMC flags,
  - behaviour under extreme OR:ATR ratios.

Golden Day fixtures from Phase 1 can be used to create higher-level “regression”
tests in a later phase, but v3 unit tests should not depend on DB or I/O.

For now, we will ship a skeleton only and add tests in a dedicated 2.3b step.

## 8. Non-goals for v3

Out of scope for this iteration:

- Final production trade rules or live deployment.
- Full multi-session state (e.g. weekly regimes).
- Cross-symbol coordination (e.g. ES vs NQ lead/lag).

Those can be layered on top once the basic ORR v3 engine is stable and
well-tested.

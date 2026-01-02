# Prism-Apex – Risk Engine v2 Design

## 1. Purpose & Non-Goals

**Purpose (v2):**

- Provide a **pure, deterministic, read-only** risk engine that:
  - Evaluates **ticket drafts** produced by the Strategy Orchestrator.
  - Enforces **Apex-style guardrails** and local configuration:
    - Max daily loss / trailing drawdown constraints.
    - Per-strategy and per-symbol contract caps.
    - Simple session-level limits (e.g., max tickets per session).
  - Returns **decisions** and **diagnostics**, but does **not** place orders,
    mutate state, or talk to external systems.

**Non-Goals (v2):**

- No live broker calls, no margin calculations, no P&L persistence.
- No long-running or cross-session state in the core engine.
- No automatic liquidation / position management (manual operator only).

**Future expansion hooks (allowed by design, not activated in v2):**

- Injected providers for:
  - **Account snapshots** (balance, realized/unrealized P&L, trailing drawdown).
  - **Open exposure** per strategy / symbol.
  - **Historical risk summaries** for dashboards and reports.
- These will be optional DI parameters into the engine factory and default
  to simple in-memory or “no data” stubs in v2.

---

## 2. Inputs & Outputs

### 2.1 Inputs

The Risk Engine v2 runs on **explicit inputs** provided by upstream layers:

- `RiskEngineContext` (per evaluation):
  - `sessionKey` (symbol, sessionDateUtc).
  - `accountConfig` (Apex-like rules — max daily loss, trailing drawdown,
    per-contract margin approximations).
  - `strategyConfigs` per strategy:
    - `maxContractsPerTicket`
    - `maxContractsPerSession`
    - `maxNotionalPerSession` (optional)
    - `enabled` flag
  - `sessionStateSnapshot` (derived, not stored by engine):
    - `realizedPnl`
    - `unrealizedPnl`
    - `maxDrawdownToday`
    - `contractsOpenByStrategy`
  - `flags` (summarised SessionFlags & other regime tags):
    - `hasNewsFlag`
    - `hardBlockTrading` (future flag).

- `TicketDraft` (from the Strategy Orchestrator):
  - `strategyId`
  - `symbol`
  - `sessionKey`
  - `side` (LONG / SHORT)
  - `entryPrice`
  - `stopPrice`
  - `targetPrice`
  - `contracts`
  - Optional: metadata (confidence, regime tags, source engine).

In Phase 3 v2, **context and drafts are fully supplied by callers**; the
risk engine does not self-populate them.

### 2.2 Outputs

Risk decisions are **pure values**:

- `RiskDecision`:
  - `allowed`: boolean
  - `reason`: string (human-readable)
  - `codes`: string[] (machine-consumable reason codes, e.g., `[
    "DAILY_DD_HARD_LIMIT"]`)
  - `maxContractsAllowed`: number | null (if clamping is applied)
  - `warnings`: string[] (non-blocking risk notes)

- `RiskEngineV2Result` (batch):
  - `decisions`: Array<{ draft: TicketDraft; decision: RiskDecision }>
  - `summary`:
    - `blockedCount`
    - `allowedCount`
    - `hardBlockReasons`: Record<string, number> (reason → count)
    - `warningsCount`

---

## 3. Behaviour & Rules (v2)

Order of evaluation (per draft):

1. **Global hard blocks**
   - If `flags.hasNewsFlag` and strategy is configured as `blockOnNews: true`
     → `allowed = false`, reason `"NEWS_HARD_BLOCK"`.
   - If `accountConfig.tradingDisabled === true`
     → hard block with `"TRADING_DISABLED"`.

2. **Account-level constraints** (read-only evaluation)
   - Compute projected `sessionDrawdown` if draft stops out.
   - If projected drawdown > `maxDailyLoss` or `maxTrailingDrawdown`
     → `allowed = false`, reason `"DAILY_DD_HARD_LIMIT"`.

3. **Strategy-level caps**
   - Check `contracts + contractsOpenByStrategy[strategyId]`.
   - If > `maxContractsPerSession` → `allowed = false`, reason
     `"STRATEGY_SESSION_CONTRACT_CAP"`.
   - If `contracts > maxContractsPerTicket` → clamp `maxContractsAllowed` and
     optionally return `allowed = false` or `allowed = true` with a warning,
     based on config.

4. **Symbol-level caps (optional / future)**
   - Symbol-specific max contracts or notional; kept simple in v2 but prepared
     for future use.

5. **Output decision**
   - If no blockers → `allowed = true`, `codes = []`, warnings may include e.g.
     "HIGH_RISK_R_MULTIPLE".

All rules are **pure functions**; no internal mutation across calls.

---

## 4. Architecture & Interfaces

### 4.1 Core Types

```ts
export type RiskReasonCode =
  | 'OK'
  | 'TRADING_DISABLED'
  | 'NEWS_HARD_BLOCK'
  | 'DAILY_DD_HARD_LIMIT'
  | 'STRATEGY_SESSION_CONTRACT_CAP'
  | 'STRATEGY_TICKET_SIZE_CAP'
  | 'INTERNAL_ERROR';

export interface RiskDecision {
  allowed: boolean;
  reason: string;
  codes: RiskReasonCode[];
  maxContractsAllowed: number | null;
  warnings: string[];
}

export interface RiskEngineContext {
  sessionKey: {
    symbol: string;
    sessionDateUtc: string;
  };
  accountConfig: {
    maxDailyLoss: number | null;
    maxTrailingDrawdown: number | null;
    tradingDisabled?: boolean;
  };
  strategyConfigs: Record<
    string,
    {
      enabled: boolean;
      maxContractsPerTicket: number | null;
      maxContractsPerSession: number | null;
      blockOnNews: boolean;
    }
  >;
  sessionStateSnapshot: {
    realizedPnl: number;
    unrealizedPnl: number;
    maxDrawdownToday: number;
    contractsOpenByStrategy: Record<string, number>;
  };
  flags: {
    hasNewsFlag: boolean;
  };
}

export interface TicketDraft {
  id: string;
  strategyId: string;
  symbol: string;
  sessionKey: {
    symbol: string;
    sessionDateUtc: string;
  };
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  contracts: number;
}
```

### 4.2 Engine Factory (with optional future hooks)

```ts
export interface RiskEngineV2Deps {
  // Future: optional providers for account snapshots, exposure, etc.
  readonly accountSnapshotProvider?: unknown;
  readonly exposureProvider?: unknown;
}

export interface RiskEngineV2 {
  evaluateDraft(draft: TicketDraft, ctx: RiskEngineContext): RiskDecision;
  evaluateBatch(
    drafts: TicketDraft[],
    ctx: RiskEngineContext
  ): {
    decisions: Array<{ draft: TicketDraft; decision: RiskDecision }>;
    summary: {
      blockedCount: number;
      allowedCount: number;
      hardBlockReasons: Record<string, number>;
      warningsCount: number;
    };
  };
}

export function createRiskEngineV2(deps?: RiskEngineV2Deps): RiskEngineV2 {
  // v2 ignores deps; hooks reserved for future phases.
  return { evaluateDraft, evaluateBatch };
}
```

For v2, `deps` is accepted but unused; this preserves the DI seam without
forcing any live integrations yet.

---

## 5. Integration Points

- Upstream: Strategy Orchestrator calls `riskEngine.evaluateBatch(drafts, ctx)`
  before surfacing tickets to operators.
- Downstream: Tickets API / dashboards can surface risk decisions (allowed vs
  blocked, codes, warnings) in Worklist/Tickets.
- **No** API orders: Risk Engine NEVER places/cancels orders; it only emits values.

---

## 6. Testing Strategy

Unit tests for:

- News hard block.
- Trading-disabled block.
- Daily drawdown cap violation (stubbed in v2).
- Strategy per-ticket/per-session caps.
- Happy-path allowed decision.

Golden Day-style fixtures for risk scenarios can be added later (Phase 3.x);
v2 only needs deterministic direct input tests.

# Prism-Apex – OSB Strategy v1 Design

## Purpose
OSB (Opening Swing Breakout) is a Phase 2 strategy that consumes Phase 1 SessionMetrics/SessionFlags and emits read-only signals (no live orders). In v1, it stays pure/deterministic, providing guardrail-aware LONG/SHORT/NO_TRADE decisions for the Strategy Orchestrator. All risk gating and ticket generation happens downstream.

## Inputs
- SessionMetrics summary: `orWidth`, `orToAtrRatio`, `vwapSlopeClassification`.
- SessionFlags summary: `hasNewsFlag`, `flags: SessionFlag[]`.
- OSB consumes these via a compact `OsbEngineInput` (no DB access).

## Guardrails
1. News guardrail – if `hasNewsFlag`, emit `NO_TRADE` (reason `NEWS_GUARDRAIL`).
2. Missing metrics – if any key metric is `null`/`undefined`, emit `NO_TRADE` (`MISSING_METRICS`).
3. Volatility band – enforce OR:ATR range `[minOrToAtr, maxOrToAtr]` (defaults `[0.75, 2.5]`). If outside, emit `NO_TRADE` (`OR_ATR_OUT_OF_RANGE`).

## Signals
OSB v1 emits one signal per evaluation:
- `LONG_SETUP` – breakout bias to the upside (VWAP slope `UP`).
- `SHORT_SETUP` – breakout bias to the downside (VWAP slope `DOWN`).
- `NO_TRADE` – guardrail or FLAT slope.

## Engine Interface
```ts
export interface OsbEngineInput {
  metrics: SessionMetricsSummary | null | undefined;
  flags: SessionFlagsSummary | null | undefined;
}

export interface OsbEngineConfig {
  minOrToAtr?: number;
  maxOrToAtr?: number;
}

export type OsbSignalType = 'LONG_SETUP' | 'SHORT_SETUP' | 'NO_TRADE';
export interface OsbSignal { type: OsbSignalType; reason: string; }

export function createOsbEngine(config?: OsbEngineConfig): (input: OsbEngineInput) => OsbSignal;
```
Pure, deterministic, side-effect free.

## Testing Plan
`apps/api/src/strategy/osb/osb.test.ts`
- Guardrails: news, missing metrics, OR:ATR band.
- Directional tests: slope `UP` → LONG, `DOWN` → SHORT, `FLAT` → NO_TRADE.
- Run via `pnpm vitest src/strategy/osb/osb.test.ts src/strategy/vwap-ft/vwap-ft.test.ts src/strategy/orr/orr-v3.test.ts src/strategy/orchestrator/orchestrator.test.ts` during RUN gate.

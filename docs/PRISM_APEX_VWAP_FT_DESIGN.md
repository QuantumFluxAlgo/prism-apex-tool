# Prism-Apex – VWAP First Touch (VWAP FT) – Strategy Design

## Purpose
VWAP FT is a read-only Phase 2 strategy operating after OR formation. It consumes SessionMetrics/Flags and emits deterministic signals (no order placement).

## Inputs
- symbol, sessionDateUtc
- SessionMetrics subset: `orToAtrRatio`, `vwapSlopeClassification`
- SessionFlags: `hasNewsFlag`

## Outputs
`VwapFtSignal[]` with `kind: 'VWAP_FT_SETUP'`, `direction: 'LONG' | 'SHORT'`, `reason` string.

## Behaviour v1
1. Block sessions when `hasNewsFlag`.
2. Require metrics; if missing, emit no signals.
3. Enforce OR:ATR band `[minOrToAtr, maxOrToAtr]` (defaults `[0.3, 2.5]`).
4. VWAP slope `'UP'` → LONG_SETUP, `'DOWN'` → SHORT_SETUP, otherwise no signal.

## Engine API
```ts
export type VwapFtContext = { symbol: string; sessionDateUtc: string; sessionMetrics?: { orToAtrRatio?: number | null; vwapSlopeClassification?: 'UP' | 'DOWN' | 'FLAT' | null } | null; sessionFlags?: { hasNewsFlag: boolean } | null };
export type VwapFtSignal = { kind: 'VWAP_FT_SETUP'; direction: 'LONG' | 'SHORT'; reason: string };
export type VwapFtEngineConfig = { minOrToAtr?: number; maxOrToAtr?: number };
export function createVwapFtEngine(config?: VwapFtEngineConfig): (ctx: VwapFtContext) => VwapFtSignal[];
```

## Tests
Vitest file `apps/api/src/strategy/vwap-ft/vwap-ft.test.ts` covers news guardrail, missing metrics, OR:ATR band, and slope behaviour. Run via `pnpm vitest src/strategy/vwap-ft/vwap-ft.test.ts`.

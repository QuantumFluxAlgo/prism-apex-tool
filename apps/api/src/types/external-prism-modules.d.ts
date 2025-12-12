// Lightweight "any"-based shims for external packages so tsc can typecheck apps/api
// without having the full private packages present.

declare module '@prism-apex/clients-tradovate' {
  export function createTradovateDemoClient(...args: any[]): any;
}

declare module '@prism-apex/clients-tradovate/telemetry' {
  export type TelemetrySnapshot = any;
  export function createTelemetryClient(...args: any[]): any;
}

declare module '@prism-apex/indicators' {
  export function atrWilderSeries(...args: any[]): any[];
  export type Bar1m = any;
  export type Bar = any;
  export function initialVwapState(...args: any[]): any;
  export function updateVwap(...args: any[]): any;
  export function swings(...args: any[]): any;
  export type VwapState = any;
  const rest: any;
  export default rest;
}

declare module '@prism-apex/strategies' {
  export function vwapFirstTouch(...args: any[]): any;
  export function openingSwingBreakout(...args: any[]): any;
  export type Suggestion = any;
  const rest: any;
  export = rest;
}

declare module '@prism-apex/strategy-apx-ddb01' {
  export function planLongOnlyRetest(...args: any[]): any;
}

declare module '@prism-apex/analytics' {
  export function trackEvent(...args: any[]): any;
}

declare module '@prism-apex/audit' {
  export function lastAudit(...args: any[]): any;
}

declare module '@prism-apex/metrics/consistency' {
  export function computeConsistency(...args: any[]): any;
  export function loadDailyPnLFromDisk(...args: any[]): any;
}

declare module '@prism-apex/consistency' {
  export function computeConsistency(...args: any[]): any;
}

declare module '@prism-apex/signals' {
  export function osbSuggest(...args: any[]): any;
  export function vwapFirstTouchSuggest(...args: any[]): any;
  export type Bar = any;
}

declare module '@prism-apex/runtime' {
  export function getHealth(...args: any[]): any;
  export function setJobBeat(...args: any[]): any;
}

declare module '@prism-apex/accounts' {
  export type AccountsFile = any;
  export type AccountRecord = any;
  export function loadAccounts(...args: any[]): any;
}

declare module '@prism-apex/rules-apex' {
  export type AccountPhase = 'eval' | 'funded';
  export type StrategyId = 'VWAP_FT' | 'OSB' | 'APX-DDB-01';
  export type Suggestion = {
    symbol: string;
    side: 'BUY' | 'SELL';
    entry: number;
    stop?: number;
    qty: number;
    strategy: StrategyId;
    target?: number;
  };
  export type Ticket = {
    symbol: string;
    side: 'BUY' | 'SELL';
    entry: number;
    stop: number;
    qty: number;
    accountId: string;
    timestampUtc: string;
    meta: {
      strategy: StrategyId;
      rr: number;
      guardrails: string[];
      sizingHint?: string;
      consistencyNotes?: string;
    };
    target: number;
  };
  export type GuardContext = {
    phase: AccountPhase;
    account: { id: string; maxContracts: number };
    bufferCleared: boolean;
    recentSizes: number[];
    contract: string;
    now?: Date;
  };
  export function applyGuardWithSizing(
    suggestion: Suggestion,
    context: GuardContext,
  ): { accepted: boolean; ticket?: Ticket; reasons?: string[] };
}

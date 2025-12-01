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
  export type TicketInput = any;
  export function evaluateTicket(...args: any[]): any;
  export function withinSuppressionWindow(...args: any[]): any;
  export function suggestPercent(...args: any[]): any;
  const rest: any;
  export default rest;
}

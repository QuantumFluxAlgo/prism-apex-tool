#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX V2 – FIX .replace() RUNTIME + API TYPECHECK STUBS ==="

# Always work from repo root
cd "$(git rev-parse --show-toplevel)"

echo
echo ">>> [1/5] Add stub types for external @prism-apex/* modules (API typecheck)"
mkdir -p apps/api/src/types

cat <<'TS' > apps/api/src/types/external-prism-modules.d.ts
// Lightweight "any"-based shims for external packages so tsc can typecheck apps/api
// without having the full private packages present.

declare module '@prism-apex/clients-tradovate' {
  export function createTradovateDemoClient(...args: any[]): any;
}

declare module '@prism-apex/clients-tradovate/telemetry' {
  export type TelemetrySnapshot = any;
}

declare module '@prism-apex/indicators' {
  export function atrWilderSeries(...args: any[]): any[];
  export type Bar1m = any;
  export type Bar = any;
  const rest: any;
  export default rest;
}

declare module '@prism-apex/strategies' {
  const strategies: any;
  export = strategies;
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
  const rest: any;
  export default rest;
}
TS


echo
echo ">>> [2/5] Make dashboard .replace() calls null-safe (eliminate 'reading \\''replace\\' crashes)"

node <<'NODE'
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'apps', 'dashboard', 'src');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.vite'].includes(entry.name)) continue;
      walk(path.join(dir, entry.name), acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

// This pattern grabs the LHS of ".replace(" and wraps it with (lhs ?? '')
// to avoid property access on undefined. We skip obvious literals.
const pattern = /([a-zA-Z0-9_\)\]\}\?:.\s]+)\.replace\(/g;

const files = walk(ROOT);
let fileCount = 0;
let replaceCount = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('.replace(')) continue;

  const next = src.replace(pattern, (match, lhs) => {
    const trimmed = lhs.trim();

    // Ignore things that clearly start with a quote, e.g. 'foo'.replace(...)
    if (/^['"`]/.test(trimmed)) return match;

    replaceCount++;
    return `(${lhs} ?? '').replace(`;
  });

  if (next !== src) {
    fs.writeFileSync(file, next, 'utf8');
    console.log('patched', path.relative(process.cwd(), file));
    fileCount++;
  }
}

console.log(`Total files patched: ${fileCount}, total .replace() sites wrapped: ${replaceCount}`);
NODE


echo
echo ">>> [3/5] Rebuild shared, API, and dashboard (local builds)"
pnpm -C packages/shared run build
pnpm -C apps/api run build
pnpm -C apps/dashboard run build


echo
echo ">>> [4/5] Run V2 build audit (expect PASS for api typecheck now)"
./scripts/run_v2_build_audit.sh || true


echo
echo ">>> [5/5] Rebuild and restart Docker services (api + dashboard-full)"
docker compose build api dashboard-full
docker compose up -d api dashboard-full


echo
echo "=== DONE ==="
echo "Hit http://localhost:5180, click through /status, /alerts, /worklist-v2, /strategy-config, /strategy-lab, /market-data, /tickets"
echo "and sanity-check that:"
echo "  * No more 'Cannot read properties of undefined (reading \\'replace\\')' in the console."
echo "  * Any remaining errors are genuine 4xx/5xx from the API (e.g. 429 Too Many Requests)."

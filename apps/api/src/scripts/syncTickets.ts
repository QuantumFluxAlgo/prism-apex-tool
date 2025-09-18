import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yahooFinance from 'yahoo-finance2';

// Keep this local to avoid coupling builds to internal types
type Ticket = {
  symbol: string;
  side: 'BUY'|'SELL'|string;
  entry: number;
  stop: number;
  target: number;
  qty: number;
  accountId: string;
  timestampUtc: string;
  meta: { strategy: 'APX-DDB-01'; rr: number; guardrails: string[]; sizingHint?: string };
  accepted: boolean;
  reasons: string[];
  hash: string;
};

function parseArgs() {
  const args = new Map<string,string>();
  for (let i=2;i<process.argv.length;i+=2) {
    const k = process.argv[i]; const v = process.argv[i+1];
    if (!k?.startsWith('--')) continue;
    if (v == null) continue;
    args.set(k.slice(2), v);
  }
  return {
    symbols: (args.get('symbols') ?? 'AAPL,MSFT,TSLA')
      .split(',').map(s=>s.trim()).filter(Boolean),
    intervalSec: Number(args.get('interval') ?? '60'),
    once: args.get('once') === '1'
  };
}

function toISODateUTC(d = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth()+1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

// Minimal, deterministic hash so dup cycles don't spam file
function hashTicket(t: Omit<Ticket,'hash'>): string {
  const key = [t.symbol, t.timestampUtc, t.side, t.entry].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Toy ORR-ish placeholder: compares price vs previous close, builds RR, bounded stops/targets.
// Replace with your fuller ORR logic when ready (weekly vwap + prior RTH high, etc).
function buildOrrTicket(symbol: string, price: number, previousClose: number, whenIso: string): Ticket {
  const diff = price - previousClose;
  const side = diff >= 0 ? 'BUY' : 'SELL';
  const entry = price;
  const stop  = side === 'BUY' ? Math.max(0, price - Math.max(0.01, Math.abs(diff) * 0.5))
                               :              price + Math.max(0.01, Math.abs(diff) * 0.5);
  const target= side === 'BUY' ? price + Math.max(0.02, Math.abs(diff))
                               : Math.max(0.01, price - Math.max(0.02, Math.abs(diff)));
  const rr    = Math.abs((target - entry) / Math.max(0.01, (entry - stop)));

  const base = {
    symbol,
    side,
    entry: Number(entry.toFixed(2)),
    stop: Number(stop.toFixed(2)),
    target: Number(target.toFixed(2)),
    qty: 1,
    accountId: 'YF-DELAYED',
    timestampUtc: whenIso,
    meta: { strategy: 'APX-DDB-01', rr: Number(rr.toFixed(2)), guardrails: [] as string[] },
    accepted: true,
    reasons: [] as string[],
  } as const;

  return { ...base, hash: hashTicket(base as any) };
}

function appendJSONL(filePath: string, rows: Ticket[]) {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const buf = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(filePath, buf, 'utf8');
}

async function runOnce(outFile: string, symbols: string[]) {
  const dateIso = toISODateUTC();
  const when = `${dateIso}T15:59:00Z`; // near official close; dashboard filters by date
  const out: Ticket[] = [];

  for (const symbol of symbols) {
    try {
      const q = await yahooFinance.quote(symbol);
      const price = Number(q?.regularMarketPrice ?? NaN);
      const prev  = Number(q?.regularMarketPreviousClose ?? NaN);
      if (!Number.isFinite(price) || !Number.isFinite(prev)) {
        console.error('[orr] skip symbol (no price/prev):', symbol);
        continue;
      }
      out.push(buildOrrTicket(symbol, price, prev, when));
    } catch (e) {
      console.error('[orr] yahoo error for', symbol, e);
    }
  }

  appendJSONL(outFile, out);
  console.log(`[orr] ${out.length} tickets appended to ${outFile}`);
}

async function main() {
  const { symbols, intervalSec, once } = parseArgs();
  const outFile = process.env.TICKETS_FILE || '/data/tickets.jsonl';

  if (once) {
    await runOnce(outFile, symbols);
    return;
  }
  for (;;) {
    const start = Date.now();
    await runOnce(outFile, symbols);
    const elapsed = Date.now() - start;
    const sleepMs = Math.max(0, intervalSec * 1000 - elapsed);
    await new Promise(r => setTimeout(r, sleepMs));
  }
}

main().catch((err) => {
  console.error('[orr] fatal', err);
  process.exit(1);
});

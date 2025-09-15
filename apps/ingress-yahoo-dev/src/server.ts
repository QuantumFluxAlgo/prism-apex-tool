import express, { Request, Response } from 'express';
import morgan from 'morgan';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { barsFile, appendJSONL } from '@prism-apex/data-yahoo';
import { stepAVWAP, valueAVWAP } from '@prism-apex/data-yahoo';
import { planLongOnlyRetest } from '@prism-apex/strategy-apx-ddb01';
import { canAfford, addRisk, resetIfNewDay } from '@prism-apex/risk-state';

const app: express.Express = express();
app.use(express.json({ limit: '256kb' }));
app.use(morgan('tiny'));

// Feature flag (default off)
const ENABLE = (process.env.APEX_ENABLE_YAHOO_INGRESS || 'false').toLowerCase() === 'true';
const SECRET = process.env.APEX_YAHOO_SHARED_SECRET || '';
const OUTDIR = process.env.APEX_TICKETS_OUTDIR || 'tickets';
const ACCOUNT_RISK = Number(process.env.APEX_ACCOUNT_RISK_USD || '200');
const MAX_DAILY_RISK = Number(process.env.APEX_MAX_DAILY_RISK_USD || '800');
const MIN_RR = Number(process.env.APEX_MIN_RR || '2.0');
const BUF_TICKS = Number(process.env.APEX_BUFFER_TICKS || '2');
const LONG_ONLY = (process.env.APEX_LONG_ONLY || 'true').toLowerCase() === 'true';
const DISABLE_NEWS = (process.env.APEX_NEWS_BLACKOUT || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

type ProductConfig = Record<string, { tickSize?: number; tickValue?: number }>;
interface SessionConfig {
  roots?: Record<string, { flat_by?: string }>;
}
type RollMapConfig = Record<string, { month?: string }>;

// Static configs
const products = safeJson<ProductConfig>('config/products.json');
const sessions = safeJson<SessionConfig>('config/sessions.json');
const rollmap = safeJson<RollMapConfig>('config/roll.json');

function safeJson<T>(p: string): T {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T;
  } catch {
    return {} as T;
  }
}

app.post('/ingress/yahoo/v1/bar', async (req: Request, res: Response) => {
  try {
    if (!ENABLE) return res.status(403).json({ error: 'disabled' });
    if (SECRET && req.headers['x-apex-secret'] !== SECRET)
      return res.status(401).json({ error: 'unauthorized' });

    const b = req.body || {};
    const sym = String(b.symbol || '');
    const ts = String(b.ts || '');
    const H = Number(b.high),
      L = Number(b.low),
      C = Number(b.close),
      V = Number(b.volume);

    if (
      !sym ||
      !ts ||
      !Number.isFinite(H) ||
      !Number.isFinite(L) ||
      !Number.isFinite(C) ||
      !Number.isFinite(V)
    )
      return res.status(400).json({ error: 'bad payload' });
    if (!(V > 0)) return res.json({ ok: true, skipped: 'no-volume' });

    // Daily risk reset
    const ymd = ts.slice(0, 10);
    resetIfNewDay(ymd);

    // Cache bar (append-only)
    const pathBars = barsFile('.cache/bars', sym, ymd);
    appendJSONL(pathBars, { symbol: sym, ts, high: H, low: L, close: C, volume: V });

    // Weekly AVWAP state (by week key)
    const wkKey = ymd.replace(/-/g, '').slice(0, 8);
    const avDir = '.cache/avwap';
    mkdirSync(avDir, { recursive: true });
    const avFile = join(avDir, `${sym}.${wkKey}.json`);
    let av = existsSync(avFile)
      ? JSON.parse(readFileSync(avFile, 'utf8'))
      : { tpv: 0, vol: 0, anchorISO: ts };
    av = stepAVWAP(av, H, L, C, V);
    writeFileSync(avFile, JSON.stringify(av));
    const weeklyVwap = valueAVWAP(av);
    if (!Number.isFinite(weeklyVwap)) return res.json({ ok: true, skipped: 'no-vwap' });

    // Prior RTH High: naive (aggregate yesterday's bars). In production, slice RTH window from sessions.
    const prev = new Date(ts);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevYmd = prev.toISOString().slice(0, 10);
    const prevFile = barsFile('.cache/bars', sym, prevYmd);
    if (!existsSync(prevFile)) return res.json({ ok: true, skipped: 'no-prior' });
    const lines = readFileSync(prevFile, 'utf8').trim().split('\n').filter(Boolean);
    let priorHigh = -Infinity;
    for (const ln of lines) {
      const x = JSON.parse(ln);
      if (typeof x.high === 'number' && x.high > priorHigh) priorHigh = x.high;
    }
    if (!(priorHigh > 0)) return res.json({ ok: true, skipped: 'bad-prior' });

    // Root map (Yahoo continuous -> our root)
    const root = mapRoot(sym);
    if (!root) return res.json({ ok: true, skipped: 'root-map' });
    if (!LONG_ONLY) return res.json({ ok: true, skipped: 'not-long-only' });

    const tickSize = products[root]?.tickSize ?? 0.25;
    const tickValue = products[root]?.tickValue ?? 1.25;
    const minStop = { MES: 12, MNQ: 20, GC: 15, CL: 15 }[root] ?? 12;

    // News blackout (simple time-key match placeholder)
    if (isNewsBlackout(ts)) return res.json({ ok: true, skipped: 'news-blackout' });

    // Plan (long-only)
    const plan = planLongOnlyRetest({
      tickSize,
      currentPrice: C,
      weeklyVwap,
      priorHigh,
      bufferTicks: BUF_TICKS,
      minStopTicks: minStop,
      rr: MIN_RR,
    });
    if (!plan) return res.json({ ok: true, skipped: 'no-plan' });

    // Sizing & guardrails
    const stopTicks = plan.stopTicks;
    const riskPerContract = stopTicks * tickValue;
    const qtyRaw = Math.floor(ACCOUNT_RISK / riskPerContract);
    const maxContracts = 10; // configurable per root if desired
    const qty = Math.max(1, Math.min(qtyRaw, maxContracts));
    const worstCase = qty * riskPerContract;

    if (!canAfford(worstCase, MAX_DAILY_RISK)) return res.json({ ok: true, skipped: 'daily-cap' });

    // Targets & prices
    const targetTicks = Math.round(plan.rr * stopTicks);
    const entry = round(plan.entry, tickSize);
    const stopPx = round(entry - stopTicks * tickSize, tickSize);
    const tgtPx = round(entry + targetTicks * tickSize, tickSize);

    // Resolve month for operator note
    const month = rollmap[root]?.month || 'Z5';
    const symbolForTicket = `${root}${month}`;

    // Enforce no-overnight via expiry (set a safe cut-off; UI/operator still flattens manually)
    const expiryISO = computeExpiry(ts, root);

    const ticket = {
      id: genId(),
      ts,
      symbol: symbolForTicket,
      root,
      side: 'Buy',
      strategy: 'APX-DDB-01',
      qty,
      entry: { type: 'limit', price: entry },
      stop: { type: 'stopMarket', price: stopPx, ticks: stopTicks },
      targets: [{ type: 'limit', price: tgtPx, ticks: targetTicks, qty }],
      rr: plan.rr,
      tickSize,
      tickValue,
      expiry: expiryISO,
      notes: `${plan.notes}; levels from ${sym}; month=${month}`,
      meta: {
        source: 'delayed-bias',
        rulesApplied: {
          accountRisk: ACCOUNT_RISK,
          maxDailyRisk: MAX_DAILY_RISK,
          minStopTicks: minStop,
          rrMin: MIN_RR,
        },
        calc: { weeklyVwap, priorHigh, bufferTicks: BUF_TICKS },
      },
    };

    // Persist ticket (append-only file)
    const dayDir = join(OUTDIR, ymd);
    mkdirSync(dayDir, { recursive: true });
    const tPath = join(dayDir, `${symbolForTicket}.${ticket.id}.json`);
    writeFileSyncAtomic(tPath, JSON.stringify(ticket, null, 2) + '\n');

    // Book risk after successful write
    addRisk(worstCase);

    return res.json({ ok: true, ticket });
  } catch (e: any) {
    // JSON log error
    console.error(
      JSON.stringify({ level: 'error', msg: e?.message || 'internal', stack: e?.stack }),
    );
    return res.status(500).json({ error: 'internal' });
  }
});

function mapRoot(y: string): 'MES' | 'MNQ' | 'GC' | 'CL' | null {
  if (y === 'ES=F') return 'MES';
  if (y === 'NQ=F') return 'MNQ';
  if (y === 'GC=F') return 'GC';
  if (y === 'CL=F') return 'CL';
  return null;
}
function round(p: number, t: number) {
  return Number((Math.round(p / t) * t).toFixed(10));
}
function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}
function writeFileSyncAtomic(path: string, data: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, data, 'utf8');
  appendFileSync(path, ''); // ensure file handle state ok on some FS
  // rename is atomic on POSIX; on some FS this is safe-enough for our JSON files
  require('node:fs').renameSync(tmp, path);
}
function isNewsBlackout(_iso: string): boolean {
  // Simple stub: if env contains any tokens, always skip (operator-defined calendar could be added)
  return DISABLE_NEWS.length > 0;
}
function computeExpiry(iso: string, root: string): string {
  try {
    const r = sessions?.roots?.[root];
    const flatBy = r?.flat_by || '15:00:00';
    // Naive computation: same day flat_by; operator SOP still enforces manual flat
    const day = iso.slice(0, 10);
    return new Date(`${day}T${flatBy}Z`).toISOString();
  } catch {
    return new Date(Date.now() + 6 * 3600e3).toISOString();
  }
}

const port = Number(process.env.PORT || 8080);
app.get('/health', (_, _res) => _res.json({ ok: true, service: 'ingress-yahoo-dev' }));
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.info(
      JSON.stringify({ level: 'info', msg: `ingress listening on ${port}`, enable: ENABLE }),
    );
  });
}
export default app;

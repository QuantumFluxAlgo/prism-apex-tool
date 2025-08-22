import crypto from 'node:crypto';
import { TvPayloadSchema, type TvPayload, type ParseResult, type TvAlert, type HumanAlert } from './types';

/**
 * Normalize arbitrary TradingView alert payloads (JSON or free text) into a TvAlert + HumanAlert.
 * - Robust to keys: {alert_id, symbol, side, price, reason, ts}
 * - If only free-text available, try to recognize: symbol (A-Z futures like ES, NQ, MES, MNQ),
 *   side (BUY/SELL/LONG/SHORT), and a price number.
 * - Candidate generation (optional): only when symbol, side, and price are present.
 */
export function parseTradingViewPayload(input: unknown, receivedAtISO: string): ParseResult {
  const payload = TvPayloadSchema.parse(input) as TvPayload;

  // Extract fields if object-like
  const obj = payload as Record<string, unknown>;
  const msg = String((obj.message ?? '') || '');

  const textBlob = stringifyCompact(obj);

  const symbol = normalizeSymbol(
    (obj.symbol as string) || extractSymbolFromText(msg) || extractSymbolFromText(textBlob)
  );

  const side = normalizeSide(
    (obj.side as string) || extractSideFromText(msg) || extractSideFromText(textBlob)
  );

  const price = toNumber(obj.price) ?? extractPriceFromText(msg) ?? extractPriceFromText(textBlob);

  const reason: string | undefined =
    (obj.reason as string) ||
    extractReasonFromText(msg) ||
    undefined;

  const ts = (typeof obj.ts === 'string' && isIso(obj.ts)) ? obj.ts : receivedAtISO;

  const idSeed = [
    (obj.alert_id as string) || '',
    ts,
    symbol || '',
    side || '',
    price != null ? String(price) : '',
    hash(textBlob).slice(0, 12),
  ].join('|');

  const id = hash(idSeed);

  const alert: TvAlert = {
    id,
    symbol: symbol || undefined,
    side: side || undefined,
    price: price ?? undefined,
    reason,
    ts,
    raw: input,
  };

  const human: HumanAlert = {
    id,
    text: humanize(alert),
  };

  const candidate =
    symbol && side && typeof price === 'number'
      ? { symbol, side, entry: price }
      : undefined;

  return { alert, human, candidate };
}

// ---------- helpers ----------

function stringifyCompact(obj: unknown): string {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

function extractSymbolFromText(t: string): string | null {
  // Simple match for ES|NQ|MES|MNQ (case-insensitive). Extend as needed.
  const m = t.match(/\b(ES|NQ|MES|MNQ)\b/i);
  return m ? m[1].toUpperCase() : null;
}

function normalizeSymbol(s?: string | null): string | null {
  if (!s) return null;
  const u = s.toUpperCase();
  if (['ES','NQ','MES','MNQ'].includes(u)) return u;
  // Accept futures root like ESU5 -> return ES
  const root = u.replace(/[^A-Z]/g, '');
  if (['ES','NQ','MES','MNQ'].includes(root)) return root;
  return null;
}

function extractSideFromText(t: string): 'BUY' | 'SELL' | null {
  if (/\b(BUY|LONG)\b/i.test(t)) return 'BUY';
  if (/\b(SELL|SHORT)\b/i.test(t)) return 'SELL';
  return null;
}
function normalizeSide(s?: string | null): 'BUY' | 'SELL' | null {
  if (!s) return null;
  const u = s.toUpperCase();
  if (u === 'BUY' || u === 'LONG') return 'BUY';
  if (u === 'SELL' || u === 'SHORT') return 'SELL';
  return null;
}

function extractPriceFromText(t: string): number | null {
  // Pick first numeric with decimal, typical futures price ranges handled by later layers.
  const m = t.match(/(\d{3,5}(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function extractReasonFromText(t: string): string | null {
  // Capture sentence around 'reason:' or any bracketed detail
  const r1 = t.match(/reason[:=]\s*([^\n\r]+)/i);
  if (r1) return r1[1].trim();
  const r2 = t.match(/\[(.*?)\]/);
  if (r2) return r2[1].trim();
  return null;
}

function isIso(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(s);
}

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function humanize(a: TvAlert): string {
  const parts = [];
  parts.push(a.symbol ? a.symbol : 'Unknown symbol');
  parts.push(a.side ? (a.side === 'BUY' ? 'BUY' : 'SELL') : 'NO-SIDE');
  parts.push(a.price != null ? `@ ${a.price}` : '@ ?');
  if (a.reason) parts.push(`— ${a.reason}`);
  parts.push(`(${a.ts})`);
  return parts.join(' ');
}

function hash(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

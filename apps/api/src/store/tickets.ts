import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Ticket, TicketStrategy } from '../schemas/ticket.js';
export type { Ticket, TicketStrategy } from '../schemas/ticket.js';
import { resolveDataDir } from '../utils/dirs.js';

const DATA_DIR = resolveDataDir();
const FILE = path.join(DATA_DIR, 'tickets.jsonl');

type Stored = Ticket & { hash: string };

const records: Stored[] = [];
const hashes = new Set<string>();
const days = new Map<string, Stored[]>();
let lastWrite = '';

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

/**
 * Normalize any inbound/legacy strategy identifier to the canonical persisted IDs.
 *
 * Canonical (persisted):
 * - APX-DDB-01
 * - APX-OSB-01
 * - APX-VWAP-FT
 *
 * Accepted aliases (normalized):
 * - ORR / orr / DDB / etc -> APX-DDB-01
 * - OSB / APX-OSB-01 -> APX-OSB-01
 * - VWAP_FT / VWAP-FT / vwapft / vwap_ft / APX-VWAP-FT -> APX-VWAP-FT
 */
function normalizeTicketStrategy(raw: unknown): TicketStrategy {
  if (typeof raw !== 'string' || !raw.trim().length) return 'APX-DDB-01';
  const v = raw.trim().toUpperCase();

  if (v.includes('VWAP')) return 'APX-VWAP-FT';
  if (v.includes('OSB')) return 'APX-OSB-01';
  return 'APX-DDB-01';
}

function indexRecord(rec: Stored) {
  records.push(rec);
  hashes.add(rec.hash);
  const day = rec.timestampUtc.slice(0, 10);
  if (!days.has(day)) days.set(day, []);
  days.get(day)!.push(rec);
  lastWrite = rec.timestampUtc;
}

function load() {
  ensureDir();
  if (!fs.existsSync(FILE)) return;
  const lines = fs.readFileSync(FILE, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as Stored;

      // Defensive: normalize historical/legacy stored strategy values.
      if (rec && typeof rec === 'object' && rec.meta && typeof rec.meta === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta: any = rec.meta as any;
        meta.strategy = normalizeTicketStrategy(meta.strategy);
      }

      indexRecord(rec);
    } catch {}
  }
}

load();

function makeHash(t: Ticket): string {
  return crypto
    .createHash('sha256')
    .update([t.symbol, t.timestampUtc, t.side, t.entry].join('|'))
    .digest('hex');
}

export async function saveTicket(t: Ticket): Promise<void> {
  ensureDir();

  // Normalize strategy on write to prevent namespace drift in the JSONL store.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (t as any).meta ?? {};
  const normalized: Ticket = {
    ...t,
    meta: {
      ...meta,
      strategy: normalizeTicketStrategy(meta.strategy),
    },
  } as Ticket;

  const hash = makeHash(normalized);
  if (hashes.has(hash)) return;

  const rec: Stored = { ...normalized, hash };
  fs.appendFileSync(FILE, JSON.stringify(rec) + '\n');
  indexRecord(rec);
}

export function countTickets(date: string, strategy?: string): number {
  const day = days.get(date) ?? [];
  const strategyFilterRaw = strategy?.trim();
  const strategyFilter = strategyFilterRaw ? normalizeTicketStrategy(strategyFilterRaw) : undefined;
  return strategyFilter ? day.filter((ticket) => ticket.meta.strategy === strategyFilter).length : day.length;
}

export function listTickets(
  date: string,
  cursor = 0,
  limit = 50,
  strategy?: string,
): {
  items: Ticket[];
  nextCursor?: number;
} {
  const day = days.get(date) ?? [];
  const strategyFilterRaw = strategy?.trim();
  const strategyFilter = strategyFilterRaw ? normalizeTicketStrategy(strategyFilterRaw) : undefined;

  const filtered = strategyFilter ? day.filter((ticket) => ticket.meta.strategy === strategyFilter) : day;

  const slice = filtered.slice(cursor, cursor + limit).map(({ hash: _hash, ...t }) => t);
  const nextCursor = cursor + limit < filtered.length ? cursor + limit : undefined;
  return { items: slice, nextCursor };
}

export function exportTickets(date: string): Ticket[] {
  return (days.get(date) ?? []).map(({ hash: _hash, ...t }) => t);
}

export function getRecentTicketSizes(accountId: string, n = 10): number[] {
  return records
    .filter((r) => r.accountId === accountId && r.accepted)
    .slice(-n)
    .map((r) => r.qty);
}

export function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  return { lastWrite, ticketsToday: days.get(today)?.length ?? 0 };
}

// test helpers
export function _clear() {
  records.length = 0;
  hashes.clear();
  days.clear();
  lastWrite = '';
  try {
    fs.unlinkSync(FILE);
  } catch {}
}

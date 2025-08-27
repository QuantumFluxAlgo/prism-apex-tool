import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Ticket } from '../schemas/ticket.js';
export type { Ticket } from '../schemas/ticket.js';

const DATA_DIR = process.env.DATA_DIR || '/var/lib/prism-apex-tool';
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
  const hash = makeHash(t);
  if (hashes.has(hash)) return;
  const rec: Stored = { ...t, hash };
  fs.appendFileSync(FILE, JSON.stringify(rec) + '\n');
  indexRecord(rec);
}

export function listTickets(
  date: string,
  cursor = 0,
  limit = 50,
): {
  items: Ticket[];
  nextCursor?: number;
} {
  const day = days.get(date) ?? [];
  const slice = day.slice(cursor, cursor + limit).map(({ hash, ...t }) => t);
  const nextCursor = cursor + limit < day.length ? cursor + limit : undefined;
  return { items: slice, nextCursor };
}

export function exportTickets(date: string): Ticket[] {
  return (days.get(date) ?? []).map(({ hash, ...t }) => t);
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

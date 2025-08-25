import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Ticket } from '../schemas/ticket.js';

const DATA_DIR = process.env.DATA_DIR || '/var/lib/prism-apex-tool';
const FILE = path.join(DATA_DIR, 'tickets.jsonl');

type Stored = Ticket & { hash: string };

const records: Stored[] = [];
const hashes = new Set<string>();

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function load() {
  ensureDir();
  if (!fs.existsSync(FILE)) return;
  const lines = fs.readFileSync(FILE, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as Stored;
      records.push(rec);
      hashes.add(rec.hash);
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
  records.push(rec);
  hashes.add(hash);
}

export function listTickets(date: string, cursor = 0, limit = 100): {
  items: Ticket[];
  nextCursor?: number;
} {
  const day = records.filter((r) => r.timestampUtc.startsWith(date));
  const slice = day.slice(cursor, cursor + limit).map(({ hash, ...t }) => t);
  const nextCursor = cursor + limit < day.length ? cursor + limit : undefined;
  return { items: slice, nextCursor };
}

export function exportTickets(date: string): Ticket[] {
  return records
    .filter((r) => r.timestampUtc.startsWith(date))
    .map(({ hash, ...t }) => t);
}

export function recentSizes(accountId: string): number[] {
  return records
    .filter((r) => r.accountId === accountId && r.accepted)
    .slice(-10)
    .map((r) => r.qty);
}

// test helpers
export function _clear() {
  records.length = 0;
  hashes.clear();
  try {
    fs.unlinkSync(FILE);
  } catch {}
}


import fs from 'node:fs';
import path from 'node:path';

export type MockTicket = {
  id: string;
  ts: string;
  symbol: string;
  strategy: string;
  side?: 'LONG' | 'SHORT';
  price?: number;
  size?: number;
  status?: string;
  meta?: Record<string, unknown>;
};

function dataDir(): string {
  const base = process.env.DATA_DIR || path.join(process.cwd(), 'var', 'mock-api');
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function filePath(): string {
  return path.join(dataDir(), 'tickets.jsonl');
}

export function appendTickets(tix: MockTicket[]): void {
  if (!tix || tix.length === 0) return;
  const lines = tix.map((t) => JSON.stringify(t)).join('\n') + '\n';
  fs.appendFileSync(filePath(), lines, 'utf8');
}

export function readTickets(limit = 500): MockTicket[] {
  const fp = filePath();
  if (!fs.existsSync(fp)) return [];
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = lines
    .map((ln) => {
      try {
        return JSON.parse(ln) as MockTicket;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as MockTicket[];
  return rows.slice(-limit);
}

export function toCsv(tix: MockTicket[]): string {
  const header = ['id', 'ts', 'symbol', 'strategy', 'side', 'price', 'size', 'status'];
  const rows = tix.map((t) => [
    t.id,
    t.ts,
    t.symbol,
    t.strategy,
    t.side ?? '',
    t.price ?? '',
    t.size ?? '',
    t.status ?? '',
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
}

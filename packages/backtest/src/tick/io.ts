import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import type { Tick } from './types';

export function loadTickCSV(path: string): Tick[] {
  const raw = fs.readFileSync(path, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  return rows.map((r: any) => ({
    ts: String(r.ts),
    price: Number(r.price),
    size: r.size ? Number(r.size) : undefined,
    bid: r.bid ? Number(r.bid) : undefined,
    ask: r.ask ? Number(r.ask) : undefined
  }));
}

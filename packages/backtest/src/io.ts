import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import type { Bar, BacktestConfig } from './types';

export function loadCSV(path: string): Bar[] {
  const raw = fs.readFileSync(path, 'utf8');
  const rows: unknown[] = parse(raw, { columns: true, skip_empty_lines: true });
  const schema = z.object({
    ts: z.string(),
    open: z.coerce.number(),
    high: z.coerce.number(),
    low: z.coerce.number(),
    close: z.coerce.number(),
    volume: z.coerce.number().optional(),
  });
  return rows.map(r => schema.parse(r));
}

export function saveJSON(path: string, obj: unknown) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
}

export function saveCSV(path: string, rows: Array<Record<string, unknown>>) {
  const keys = Array.from(new Set(rows.flatMap(Object.keys)));
  const header = keys.join(',');
  const lines = rows.map(r => keys.map(k => String(r[k] ?? '')).join(','));
  fs.writeFileSync(path, [header, ...lines].join('\n'));
}

export function loadConfigYaml(yamlText: string): BacktestConfig {
  // lightweight YAML (no dep): expect simple "key: value" lines
  const lines = yamlText.split('\n').filter(Boolean);
  const obj: Record<string, unknown> = {};
  for (const line of lines) {
    const [k, ...rest] = line.split(':');
    obj[k.trim()] = rest.join(':').trim();
  }
  // minimal coercion; real projects can use 'yaml' pkg
  const cfg: BacktestConfig = {
    symbol: obj.symbol as string,
    barInterval: obj.barInterval as '1m' | '5m',
    tz: obj.tz as BacktestConfig['tz'],
    session: { open: obj['session.open'] as string, close: obj['session.close'] as string },
    slippageTicks: Number(obj.slippageTicks || 0),
    tickValue: Number(obj.tickValue),
    maxRiskReward: Number(obj.maxRiskReward || 5),
    dailyLossCapUsd: obj.dailyLossCapUsd ? Number(obj.dailyLossCapUsd) : undefined,
    rngSeed: obj.rngSeed ? Number(obj.rngSeed) : undefined,
    mode: obj.mode as BacktestConfig['mode'],
  };
  return cfg;
}

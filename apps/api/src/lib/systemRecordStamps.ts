import crypto from 'node:crypto';
import { ENGINE_VERSION as STRATEGY_ENGINE_VERSION } from '../services/strategy-engine/index.js';

export const SYSTEM_RECORDS_SCHEMA_VERSION = 1;

export type SystemRecordStamps = {
  engine_version: string;
  config_fingerprint: string;
  schema_version: number;
  computed_at_utc: string; // ISO-8601 (UTC)
};

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function canonicalize(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) return null;

  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;

  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') return null;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => canonicalize(v, seen));
  }

  if (value instanceof Map) {
    const entries = Array.from(value.entries()).map(([k, v]) => [
      String(k),
      canonicalize(v, seen),
    ]);
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return entries;
  }

  if (value instanceof Set) {
    const items = Array.from(value.values()).map((v) => canonicalize(v, seen));
    return items
      .map((v) => ({ v, k: JSON.stringify(v) }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
      .map((x) => x.v);
  }

  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const k of keys) out[k] = canonicalize(obj[k], seen);

    return out;
  }

  return String(value);
}

function stableJsonStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const canonical = canonicalize(value, seen);
  return JSON.stringify(canonical);
}

export function getEngineVersion(): string {
  const env = (process.env.ENGINE_VERSION || '').trim();
  if (env) return env;

  const fallback = (STRATEGY_ENGINE_VERSION || '').trim();
  if (fallback) return fallback;

  return 'unknown';
}

export function fingerprintConfig(config: unknown): string {
  try {
    return sha256Hex(stableJsonStringify(config));
  } catch {
    return sha256Hex(String(config));
  }
}

export function makeSystemRecordStamps(config: unknown): SystemRecordStamps {
  return {
    engine_version: getEngineVersion(),
    config_fingerprint: fingerprintConfig(config),
    schema_version: SYSTEM_RECORDS_SCHEMA_VERSION,
    computed_at_utc: new Date().toISOString(),
  };
}

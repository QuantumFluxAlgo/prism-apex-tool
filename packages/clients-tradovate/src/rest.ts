import { z } from 'zod';
import { fromEnv, TokenManager } from './auth';
import {
  TradovateClientError,
  AccountSchema,
  type Account,
  PositionSchema,
  type Position,
  OrderSchema,
  type Order,
  BarSchema,
  type Bar,
  LastSchema,
  type Last,
} from './types';

// Simple in-memory LRU/TTL cache for getBars
type CacheKey = string;
interface CacheEntry<T> { value: T; expiresAt: number }
class TTLCache {
  private map = new Map<CacheKey, CacheEntry<any>>();
  constructor(private ttlMs: number = 5000) {}
  get<T>(key: CacheKey): T | null {
    const ent = this.map.get(key);
    if (!ent) return null;
    if (Date.now() > ent.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return ent.value as T;
  }
  set<T>(key: CacheKey, value: T) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
const barsCache = new TTLCache(5000);

function jitter(ms: number) {
  const j = Math.floor(Math.random() * Math.min(250, ms * 0.1));
  return ms + j;
}
async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchJson<T>(
  tokenMgr: TokenManager,
  url: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit
): Promise<T> {
  const maxAttempts = 3;
  let attempt = 0;
  let lastErr: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const headers = Object.assign(
        { 'content-type': 'application/json' },
        init?.headers ?? {},
        await tokenMgr.authHeader()
      );
      const resp = await fetch(url, { ...init, headers });
      if (resp.status === 401 && attempt < maxAttempts) {
        await (tokenMgr as any).refreshWithBackoff?.().catch(() => {});
        continue;
      }
      if ((resp.status === 429 || resp.status >= 500) && attempt < maxAttempts) {
        await sleep(jitter(300 * attempt));
        continue;
      }
      if (!resp.ok) {
        throw new TradovateClientError(`HTTP ${resp.status} for ${url}`);
      }
      const json = await resp.json();
      return schema.parse(json);
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts) break;
      await sleep(jitter(200 * attempt));
    }
  }
  throw new TradovateClientError(`Request failed after retries: ${String(lastErr)}`);
}

export interface ClientConfig {
  baseUrl?: string; // override (tests)
}

export class TradovateClient {
  private tokenMgr: TokenManager;
  private baseUrl: string;

  constructor(cfg?: ClientConfig) {
    this.tokenMgr = fromEnv();
    const envBase = process.env.TRADOVATE_BASE_URL || '';
    this.baseUrl = cfg?.baseUrl || envBase;
    if (!this.baseUrl) throw new TradovateClientError('Missing TRADOVATE_BASE_URL');
  }

  async getAccount(): Promise<Account> {
    return fetchJson(this.tokenMgr, `${this.baseUrl}/account`, AccountSchema);
  }

  async getPositions(): Promise<Position[]> {
    const arr = await fetchJson(
      this.tokenMgr,
      `${this.baseUrl}/positions`,
      z.array(PositionSchema)
    );
    return arr;
  }

  async getOrders(): Promise<Order[]> {
    const arr = await fetchJson(
      this.tokenMgr,
      `${this.baseUrl}/orders`,
      z.array(OrderSchema)
    );
    return arr;
  }

  async getBars(symbol: string, tf: '1m' | '5m', limit: number = 500): Promise<Bar[]> {
    const key = `${symbol}|${tf}|${limit}`;
    const cached = barsCache.get<Bar[]>(key);
    if (cached) return cached;
    const arr = await fetchJson(
      this.tokenMgr,
      `${this.baseUrl}/bars?symbol=${encodeURIComponent(symbol)}&tf=${tf}&limit=${limit}`,
      z.array(BarSchema)
    );
    barsCache.set(key, arr);
    return arr;
  }

  async getLast(symbol: string): Promise<Last> {
    return fetchJson(
      this.tokenMgr,
      `${this.baseUrl}/last?symbol=${encodeURIComponent(symbol)}`,
      LastSchema
    );
  }
}


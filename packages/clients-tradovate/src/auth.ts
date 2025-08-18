import { TradovateClientError } from './types';

export interface AuthConfig {
  baseUrl: string; // e.g., https://demo.tradovateapi.com/v1
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

function jitter(ms: number) {
  const j = Math.floor(Math.random() * Math.min(250, ms * 0.1));
  return ms + j;
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export class TokenManager {
  private cfg: AuthConfig;
  private token: TokenBundle | null = null;

  constructor(cfg: AuthConfig) {
    this.cfg = cfg;
    this.validateEnv();
  }

  private validateEnv() {
    const miss: string[] = [];
    if (!this.cfg.baseUrl) miss.push('TRADOVATE_BASE_URL');
    if (!this.cfg.username) miss.push('TRADOVATE_USERNAME');
    if (!this.cfg.password) miss.push('TRADOVATE_PASSWORD');
    if (!this.cfg.clientId) miss.push('TRADOVATE_CLIENT_ID');
    if (!this.cfg.clientSecret) miss.push('TRADOVATE_CLIENT_SECRET');
    if (miss.length) {
      throw new TradovateClientError(`Missing env vars: ${miss.join(', ')}`);
    }
  }

  private isExpiredSoon(): boolean {
    if (!this.token) return true;
    const skew = 30_000; // 30s
    return Date.now() + skew >= this.token.expiresAt;
  }

  async getAccessToken(): Promise<string> {
    if (!this.token || this.isExpiredSoon()) {
      await this.refreshWithBackoff();
    }
    if (!this.token) throw new TradovateClientError('No token available after refresh');
    return this.token.accessToken;
  }

  private async refreshWithBackoff(): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: unknown;

    while (attempt < maxAttempts) {
      try {
        if (!this.token) {
          this.token = await this.login();
        } else {
          this.token = await this.refresh(this.token.refreshToken);
        }
        return;
      } catch (e) {
        lastErr = e;
        attempt++;
        if (attempt >= maxAttempts) break;
        await sleep(jitter(300 * attempt)); // exp backoff with jitter
      }
    }
    throw new TradovateClientError(`Auth failed after retries: ${String(lastErr)}`);
  }

  private async login(): Promise<TokenBundle> {
    const resp = await fetch(`${this.cfg.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: this.cfg.username,
        password: this.cfg.password,
        clientId: this.cfg.clientId,
        clientSecret: this.cfg.clientSecret,
      }),
    });

    if (!resp.ok) throw new TradovateClientError(`Login failed: ${resp.status}`);
    const data = (await resp.json()) as any;
    const access = String(data?.accessToken ?? '');
    const refresh = String(data?.refreshToken ?? '');
    const ttlSec = Number(data?.expiresIn ?? 0);

    if (!access || !refresh || !(ttlSec > 0)) {
      throw new TradovateClientError('Malformed login response');
    }

    return {
      accessToken: access,
      refreshToken: refresh,
      expiresAt: Date.now() + ttlSec * 1000,
    };
  }

  private async refresh(refreshToken: string): Promise<TokenBundle> {
    const resp = await fetch(`${this.cfg.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) throw new TradovateClientError(`Refresh failed: ${resp.status}`);
    const data = (await resp.json()) as any;
    const access = String(data?.accessToken ?? '');
    const newRefresh = String(data?.refreshToken ?? refreshToken);
    const ttlSec = Number(data?.expiresIn ?? 0);
    if (!access || !(ttlSec > 0)) {
      throw new TradovateClientError('Malformed refresh response');
    }
    return {
      accessToken: access,
      refreshToken: newRefresh,
      expiresAt: Date.now() + ttlSec * 1000,
    };
  }

  async authHeader(): Promise<{ Authorization: string }> {
    const token = await this.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }
}

export function fromEnv(): TokenManager {
  return new TokenManager({
    baseUrl: process.env.TRADOVATE_BASE_URL || '',
    username: process.env.TRADOVATE_USERNAME || '',
    password: process.env.TRADOVATE_PASSWORD || '',
    clientId: process.env.TRADOVATE_CLIENT_ID || '',
    clientSecret: process.env.TRADOVATE_CLIENT_SECRET || '',
  });
}


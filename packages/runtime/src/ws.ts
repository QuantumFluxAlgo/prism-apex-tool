import { expBackoff } from './backoff.js';

interface WsLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: any }) => void) | null;
  send(data: any): void;
  close(): void;
}

export interface WSOptions {
  url: string;
  getToken: () => Promise<string>;
  subscribe: (ws: WsLike) => void;
  WebSocketCtor?: new (url: string) => WsLike;
  onMessage?: (data: any) => void;
}

export class ResilientWS {
  private ws: WsLike | null = null;
  private hb?: NodeJS.Timeout;
  private staleCheck?: NodeJS.Timeout;
  private tokenTimer?: NodeJS.Timeout;
  private lastRx = 0;
  private attempts = 0;
  private token = '';
  private WsCtor: new (url: string) => WsLike;

  constructor(private cfg: WSOptions) {
    this.WsCtor = cfg.WebSocketCtor || (globalThis as any).WebSocket;
    if (!this.WsCtor) throw new Error('No WebSocket implementation');
  }

  async connect() {
    this.token ||= await this.cfg.getToken();
    this.ws = new this.WsCtor(this.cfg.url);
    this.ws.onopen = () => {
      this.attempts = 0;
      this.lastRx = Date.now();
      this.startHeartbeat();
      this.startStaleWatcher();
      this.cfg.subscribe(this.ws!);
    };
    this.ws.onmessage = (ev) => {
      this.lastRx = Date.now();
      this.cfg.onMessage?.(ev.data);
    };
    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.stopStaleWatcher();
      this.scheduleReconnect();
    };
    this.scheduleTokenRefresh();
  }

  private startHeartbeat() {
    this.hb = setInterval(() => this.ws?.send('[]'), 2500);
  }

  private stopHeartbeat() {
    if (this.hb) clearInterval(this.hb);
    this.hb = undefined;
  }

  private startStaleWatcher() {
    this.staleCheck = setInterval(() => {
      if (Date.now() - this.lastRx > 5000) {
        this.ws?.close();
      }
    }, 1000);
  }

  private stopStaleWatcher() {
    if (this.staleCheck) clearInterval(this.staleCheck);
    this.staleCheck = undefined;
  }

  private scheduleReconnect() {
    const delay = expBackoff(this.attempts++);
    setTimeout(() => this.connect(), delay);
  }

  private scheduleTokenRefresh() {
    if (this.tokenTimer) clearTimeout(this.tokenTimer);
    this.tokenTimer = setTimeout(
      async () => {
        this.token = await this.cfg.getToken();
        this.scheduleTokenRefresh();
      },
      60 * 60 * 1000,
    );
  }

  close() {
    this.stopHeartbeat();
    this.stopStaleWatcher();
    if (this.tokenTimer) clearTimeout(this.tokenTimer);
    this.ws?.close();
  }
}

export async function retryWithPenalty<T>(
  fn: (ticket?: string) => Promise<{ status: number; value?: T; pTicket?: string; pTime?: number }>,
): Promise<T> {
  let ticket: string | undefined;
  while (true) {
    const res = await fn(ticket);
    if (res.status !== 429) {
      return res.value as T;
    }
    ticket = res.pTicket;
    const waitMs = expBackoff(0, {
      baseMs: (res.pTime || 1) * 1000,
      maxMs: (res.pTime || 1) * 1000,
    });
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

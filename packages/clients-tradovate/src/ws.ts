import { TradovateClientError } from './types.js';

export interface TradovateQuotePayload {
  fullSymbol: string;
  ts?: number | string;
  last?: number | string;
  bid?: number | string;
  ask?: number | string;
  volume?: number | string;
  [key: string]: unknown;
}

export interface TradovateSubscriptionAck {
  type: 'subscription' | 'unsubscription' | 'subscriptionStatus';
  success?: boolean;
  symbol?: string;
  requestId?: number;
  [key: string]: unknown;
}

export interface TradovateErrorPayload {
  type: 'error';
  code?: number | string;
  message?: string;
  [key: string]: unknown;
}

export type TradovateStructuredMessage =
  | TradovateQuotePayload
  | TradovateSubscriptionAck
  | TradovateErrorPayload;

export type TradovateMessage = string | ArrayBufferLike | TradovateStructuredMessage;

interface WsLike {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: TradovateMessage }) => void) | null;
  send(data: string | ArrayBufferLike): void;
  close(): void;
}

export interface WSConfig {
  url: string;
  token: string;
  WebSocketCtor?: new (url: string) => WsLike;
  onMessage?: (data: TradovateMessage) => void;
}

export class MarketDataWS {
  private cfg: WSConfig;
  private ws: WsLike | null = null;
  private hb?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private WsCtor: new (url: string) => WsLike;

  constructor(cfg: WSConfig) {
    this.cfg = cfg;
    this.WsCtor = cfg.WebSocketCtor || (globalThis as any).WebSocket;
    if (!this.WsCtor) throw new TradovateClientError('No WebSocket implementation');
  }

  connect() {
    this.ws = new this.WsCtor(this.cfg.url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.ws?.send(`authorize\n1\n${this.cfg.token}\n`);
      this.startHeartbeat();
    };
    this.ws.onmessage = (ev) => this.cfg.onMessage?.(ev.data);
    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.scheduleReconnect();
    };
  }

  private startHeartbeat() {
    this.hb = setInterval(() => {
      this.ws?.send('[]');
    }, 2500);
  }

  private stopHeartbeat() {
    if (this.hb) clearInterval(this.hb);
    this.hb = undefined;
  }

  private scheduleReconnect() {
    const delay = Math.min(30_000, Math.pow(2, this.reconnectAttempts) * 1000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay + Math.floor(Math.random() * 250));
  }

  close() {
    this.stopHeartbeat();
    this.ws?.close();
  }
}

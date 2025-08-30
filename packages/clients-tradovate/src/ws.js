import { TradovateClientError } from './types.js';
export class MarketDataWS {
  cfg;
  ws = null;
  hb;
  reconnectAttempts = 0;
  WsCtor;
  constructor(cfg) {
    this.cfg = cfg;
    this.WsCtor = cfg.WebSocketCtor || globalThis.WebSocket;
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
  startHeartbeat() {
    this.hb = setInterval(() => {
      this.ws?.send('[]');
    }, 2500);
  }
  stopHeartbeat() {
    if (this.hb) clearInterval(this.hb);
    this.hb = undefined;
  }
  scheduleReconnect() {
    const delay = Math.min(30_000, Math.pow(2, this.reconnectAttempts) * 1000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay + Math.floor(Math.random() * 250));
  }
  close() {
    this.stopHeartbeat();
    this.ws?.close();
  }
}

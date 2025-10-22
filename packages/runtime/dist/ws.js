import { expBackoff } from './backoff.js';
export class ResilientWS {
    cfg;
    ws = null;
    hb;
    staleCheck;
    tokenTimer;
    lastRx = 0;
    attempts = 0;
    token = '';
    WsCtor;
    constructor(cfg) {
        this.cfg = cfg;
        this.WsCtor = cfg.WebSocketCtor || globalThis.WebSocket;
        if (!this.WsCtor)
            throw new Error('No WebSocket implementation');
    }
    async connect() {
        this.token ||= await this.cfg.getToken();
        this.ws = new this.WsCtor(this.cfg.url);
        this.ws.onopen = () => {
            this.attempts = 0;
            this.lastRx = Date.now();
            this.startHeartbeat();
            this.startStaleWatcher();
            this.cfg.subscribe(this.ws);
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
    startHeartbeat() {
        this.hb = setInterval(() => this.ws?.send('[]'), 2500);
    }
    stopHeartbeat() {
        if (this.hb)
            clearInterval(this.hb);
        this.hb = undefined;
    }
    startStaleWatcher() {
        this.staleCheck = setInterval(() => {
            if (Date.now() - this.lastRx > 5000) {
                this.ws?.close();
            }
        }, 1000);
    }
    stopStaleWatcher() {
        if (this.staleCheck)
            clearInterval(this.staleCheck);
        this.staleCheck = undefined;
    }
    scheduleReconnect() {
        const delay = expBackoff(this.attempts++);
        setTimeout(() => this.connect(), delay);
    }
    scheduleTokenRefresh() {
        if (this.tokenTimer)
            clearTimeout(this.tokenTimer);
        this.tokenTimer = setTimeout(async () => {
            this.token = await this.cfg.getToken();
            this.scheduleTokenRefresh();
        }, 60 * 60 * 1000);
    }
    close() {
        this.stopHeartbeat();
        this.stopStaleWatcher();
        if (this.tokenTimer)
            clearTimeout(this.tokenTimer);
        this.ws?.close();
    }
}
export async function retryWithPenalty(fn) {
    let ticket;
    while (true) {
        const res = await fn(ticket);
        if (res.status !== 429) {
            return res.value;
        }
        ticket = res.pTicket;
        const waitMs = expBackoff(0, {
            baseMs: (res.pTime || 1) * 1000,
            maxMs: (res.pTime || 1) * 1000,
        });
        await new Promise((r) => setTimeout(r, waitMs));
    }
}

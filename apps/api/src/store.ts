import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Ticket } from '../../../packages/shared/src/types';
import type { ParseResult } from '../../../packages/adapters-tradingview/src/types';

const DATA_DIR = process.env.DATA_DIR || '/var/lib/prism-apex-tool';
const DATA_FILE = path.join(DATA_DIR, 'data.json');

type TicketEntry = { when: string; ticket: Ticket; reasons: string[] };

type AlertEntry = {
  id: string;
  ts: string;
  symbol?: string;
  side?: 'BUY'|'SELL';
  price?: number;
  reason?: string;
  human: string;
  raw: unknown;
  acknowledged: boolean;
  hash: string; // for dedup window
};

type Recipients = {
  email: string[];
  telegram: string[];
  slack: string[];
  sms: string[];
  tags?: string[];
};

type DataShape = {
  tickets: TicketEntry[];
  alerts: AlertEntry[];
  recipients: Recipients;
  riskContext: {
    netLiqHigh: number;
    ddAmount: number;
    maxContracts: number;
    bufferAchieved: boolean;
    todayProfit: number;
    periodProfit: number;
  };
};

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }

function load(): DataShape {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    const init: DataShape = {
      tickets: [],
      alerts: [],
      recipients: { email: [], telegram: [], slack: [], sms: [] },
      riskContext: {
        netLiqHigh: 52000,
        ddAmount: 3000,
        maxContracts: 4,
        bufferAchieved: false,
        todayProfit: 0,
        periodProfit: 0,
      },
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw) as DataShape;
}

function save(d: DataShape) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

let state: DataShape = load();

function hash(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function dedupKey(a: { id: string; ts: string; symbol?: string; side?: string; price?: number; human: string }): string {
  return hash([a.id, a.ts, a.symbol || '', a.side || '', a.price ?? '', a.human].join('|'));
}

export const store = {
  getRiskContext() { return state.riskContext; },
  setRiskContext(patch: Partial<DataShape['riskContext']>) {
    state.riskContext = { ...state.riskContext, ...patch };
    save(state);
  },
  appendTicket(entry: TicketEntry) {
    state.tickets.push(entry);
    save(state);
  },
  buildDailyReport(date: string) {
    const dayTickets = state.tickets.filter(t => t.when.startsWith(date));
    const trades = dayTickets.length;
    const blocked = dayTickets.filter(t => t.reasons.length > 0).length;
    return {
      date,
      trades,
      blocked,
      ddAmount: state.riskContext.ddAmount,
      maxContracts: state.riskContext.maxContracts,
      bufferAchieved: state.riskContext.bufferAchieved,
      notes: 'MVP report (extend post-MVP)',
    };
  },

  // ---- Alerts queue ----
  enqueueAlert(parsed: ParseResult): AlertEntry {
    const a = parsed.alert;
    const entry: AlertEntry = {
      id: a.id,
      ts: a.ts,
      symbol: a.symbol,
      side: a.side,
      price: a.price,
      reason: a.reason,
      human: parsed.human.text,
      raw: parsed.alert.raw,
      acknowledged: false,
      hash: dedupKey({ id: a.id, ts: a.ts, symbol: a.symbol, side: a.side, price: a.price, human: parsed.human.text }),
    };

    // Deduplicate within 24h (same hash)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    state.alerts = state.alerts.filter(x => new Date(x.ts).getTime() >= dayAgo);
    if (state.alerts.some(x => x.hash === entry.hash)) {
      return entry; // ignore duplicate; do not store again
    }

    state.alerts.push(entry);
    save(state);
    return entry;
  },

  peekAlerts(limit: number): AlertEntry[] {
    return state.alerts.filter(a => !a.acknowledged).slice(0, limit);
  },

  ackAlert(id: string): boolean {
    const a = state.alerts.find(x => x.id === id && !x.acknowledged);
    if (!a) return false;
    a.acknowledged = true;
    save(state);
    return true;
  },

  getTicketsForDate(date: string) {
    return state.tickets.filter(t => t.when.startsWith(date));
  },

  getAlertsForDate(date: string) {
    return state.alerts.filter(a => a.ts.startsWith(date));
  },

  getRecipients(): Recipients {
    return state.recipients;
  },

  addRecipients(update: Partial<Recipients> & { tags?: string[] }) {
    const r = state.recipients;
    if (update.email?.length) r.email = Array.from(new Set([...(r.email || []), ...update.email]));
    if (update.telegram?.length) r.telegram = Array.from(new Set([...(r.telegram || []), ...update.telegram]));
    if (update.slack?.length) r.slack = Array.from(new Set([...(r.slack || []), ...update.slack]));
    if (update.sms?.length) r.sms = Array.from(new Set([...(r.sms || []), ...update.sms]));
    if (update.tags?.length) r.tags = Array.from(new Set([...(r.tags || []), ...update.tags]));
    state.recipients = r;
    save(state);
    return r;
  },
};

import fs from 'node:fs';
import path from 'node:path';
import type { Ticket } from '../../../packages/shared/src/types.ts';

const DATA_DIR = process.env.DATA_DIR || '/var/lib/prism-apex-tool';
const DATA_FILE = path.join(DATA_DIR, 'data.json');

type TicketEntry = { when: string; ticket: Ticket; reasons: string[] };

type DataShape = {
  tickets: TicketEntry[];
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
};

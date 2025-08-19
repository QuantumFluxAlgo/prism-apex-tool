/**
 * Seed the API data store with safe demo values (no credentials).
 * Usage:
 *   npx ts-node apps/api/scripts/seed.ts
 * or via Make: `make seed`
 */
import fs from 'node:fs';
import path from 'node:path';

type Recipients = { email: string[]; telegram: string[]; slack: string[]; sms: string[]; tags?: string[] };
type TicketEntry = { id: string; symbol: string; side: 'BUY'|'SELL'; entry: number; stop: number; target: number; size: number; time: string };
type AlertEntry = { level: 'INFO'|'WARN'|'CRITICAL'; message: string; ts: string; tags?: string[] };

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
  flags?: { ocoMissing?: boolean };
};

const DATA_DIR = process.env.DATA_DIR || path.resolve('.data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function seed(): DataShape {
  const now = new Date().toISOString();
  const demo: DataShape = {
    tickets: [
      { id: 'T-ES-001', symbol: 'ES', side: 'BUY', entry: 5000, stop: 4990, target: 5010, size: 1, time: now },
      { id: 'T-NQ-002', symbol: 'NQ', side: 'SELL', entry: 15800, stop: 15820, target: 15760, size: 1, time: now }
    ],
    alerts: [
      { level: 'INFO', message: 'System seeded for demo', ts: now, tags: ['SEED'] }
    ],
    recipients: { email: ['ops@example.com'], telegram: [], slack: [], sms: [] },
    riskContext: { netLiqHigh: 52000, ddAmount: 3000, maxContracts: 2, bufferAchieved: false, todayProfit: 0, periodProfit: 0 },
    flags: { ocoMissing: false }
  };
  return demo;
}

(function main() {
  ensureDir();
  const demo = seed();
  fs.writeFileSync(DATA_FILE, JSON.stringify(demo, null, 2));
  console.log(`[SEED] Wrote ${DATA_FILE}`);
})();


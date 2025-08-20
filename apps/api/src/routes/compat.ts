import type { FastifyInstance } from 'fastify';
import { store } from '../store';

// Helper to get YYYY-MM-DD (UTC) which matches how store filters by prefix
const today = () => new Date().toISOString().slice(0, 10);

export async function compatRoutes(app: FastifyInstance) {
  // Health check for the dashboard proxy
  app.get('/health', async () => ({ ok: true }));

  // Dashboard expects: { balance, drawdown, openPositions }
  app.get('/account', async () => {
    const rc = store.getRiskContext();
    const balance = rc?.netLiqHigh ?? 52000; // placeholder until wired to broker
    const drawdown = rc?.ddAmount ?? 0;
    const openPositions = 0;
    return { balance, drawdown, openPositions };
  });

  // Dashboard expects: { win_rate, avg_r, max_dd, rule_breaches }
  app.get('/reports', async () => {
    const d = today();
    const rpt = store.buildDailyReport(d);
    return {
      win_rate: 0.0,                 // MVP placeholder
      avg_r: 0.0,                    // MVP placeholder
      max_dd: rpt.ddAmount ?? 0,     // reuse ddAmount
      rule_breaches: rpt.blocked ?? 0,
    };
  });

  // Alerts: return array of { message }
  app.get('/alerts', async () => {
    const alerts = store.peekAlerts(50).map(a => ({
      message: a.human ?? a.reason ?? `[${a.symbol ?? '-'}] ${a.side ?? ''} ${a.price ?? ''}`.trim(),
    }));
    return alerts;
  });

  // Tickets: MVP returns empty array (can be wired to real shape later)
  app.get('/tickets', async () => {
    // Example wiring if needed post-MVP:
    // const rows = store.getTicketsForDate(today()).map(...)
    return [];
  });

  // ---------- DEV SEEDING ----------

  // POST /compat/dev/seed — populate sample data for quick UI validation
  app.post('/dev/seed', async () => {
    // Minimal "reset-ish": acknowledge any outstanding alerts so new ones surface clearly
    // (We don't have a bulk clear; just leave existing data and push fresh items.)
    // Prime risk context
    store.setRiskContext({
      netLiqHigh: 52500,
      ddAmount: 2800,
      maxContracts: 3,
      bufferAchieved: false,
    });
    store.setTodayProfit(125);     // +$125 today
    store.setPeriodProfit(640);    // +$640 this evaluation period

    // Append one example ticket for today's date
    const d = today();
    store.appendTicket({
      when: `${d}T13:30:00.000Z`,
      ticket: {
        symbol: 'ESU5',
        side: 'BUY',
        qty: 1,
        entry: 5400.25,
        stop: 5394.75,
        target: 5410.25,
      } as any, // ticket type is sourced from packages/shared; keep loose for seed
      reasons: [], // no blocks
    });

    // Enqueue three alerts with distinct content
    const now = new Date();
    const mkTs = (offsetMs: number) => new Date(now.getTime() - offsetMs).toISOString();

    const samples = [
      {
        alert: {
          id: 'A1',
          ts: mkTs(60_000),
          symbol: 'ESU5',
          side: 'BUY' as const,
          price: 5401.00,
          reason: 'Opening Range Breakout',
          raw: { source: 'seed' },
        },
        human: { text: 'ESU5 BUY @ 5401 — ORB long candidate' },
        candidate: { symbol: 'ESU5', side: 'BUY' as const, entry: 5401.00 },
      },
      {
        alert: {
          id: 'A2',
          ts: mkTs(40_000),
          symbol: 'NQU5',
          side: 'SELL' as const,
          price: 20250.75,
          reason: 'VWAP First Touch (short)',
          raw: { source: 'seed' },
        },
        human: { text: 'NQU5 SELL @ 20250.75 — VWAP first touch' },
        candidate: { symbol: 'NQU5', side: 'SELL' as const, entry: 20250.75 },
      },
      {
        alert: {
          id: 'A3',
          ts: mkTs(20_000),
          symbol: 'CLV5',
          side: 'BUY' as const,
          price: 78.35,
          reason: 'Session Breakout Retest',
          raw: { source: 'seed' },
        },
        human: { text: 'CLV5 BUY @ 78.35 — session breakout retest' },
        candidate: { symbol: 'CLV5', side: 'BUY' as const, entry: 78.35 },
      },
    ];

    for (const s of samples) {
      // store.enqueueAlert expects a ParseResult-like shape
      // @ts-ignore: keep lightweight for seed
      store.enqueueAlert(s);
    }

    return { ok: true, seeded: { alerts: samples.length, tickets: 1 } };
  });

  // GET alias for quick manual seeding from a browser
  app.get('/dev/seed', async (_req, reply) => {
    const res = await app.inject({ method: 'POST', url: '/dev/seed' });
    reply.code(res.statusCode).headers(res.headers).send(res.body);
  });
}

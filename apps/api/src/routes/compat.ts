import type { FastifyInstance } from 'fastify';
import { store } from '../store';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// Helper to get YYYY-MM-DD (UTC) which matches how store filters by prefix
const today = () => new Date().toISOString().slice(0, 10);

export async function compatRoutes(app: FastifyInstance) {
  // NOTE: Do NOT redefine /health here. Core server already exposes it.

  // Dashboard expects: { balance, drawdown, openPositions }
  app.get('/account', async () => {
    const rc = store.getRiskContext();
    const balance = rc?.netLiqHigh ?? 52000;
    const drawdown = rc?.ddAmount ?? 0;
    const openPositions = 0;
    return { balance, drawdown, openPositions };
  });

  // Dashboard expects: { win_rate, avg_r, max_dd, rule_breaches }
  app.get('/reports', async () => {
    const d = today();
    const rpt = store.buildDailyReport(d);
    return {
      win_rate: 0.0,                 // not tracked in MVP
      avg_r: 0.0,                    // not tracked in MVP
      max_dd: rpt.ddAmount ?? 0,
      rule_breaches: rpt.blocked ?? 0,
    };
  });

  // Dashboard component renders <li>{a.message}</li>
  app.get('/alerts', async () => {
    const alerts = store.peekAlerts(50).map(a => ({
      message:
        a.human ??
        a.reason ??
        `[${a.symbol ?? '-'}] ${a.side ?? ''} ${a.price ?? ''}`.trim(),
    }));
    return alerts;
  });

  // Tickets table; minimal (extend post-MVP)
  app.get('/tickets', async () => {
    // For now, keep empty until seeded
    return [];
  });

  // -------------------------
  // DEV-ONLY: Seed demo data
  // -------------------------
  const seedSchema = z.object({
    // Alerts to enqueue
    alerts: z.array(z.object({
      symbol: z.string().optional(),
      side: z.enum(['BUY','SELL']).optional(),
      price: z.number().optional(),
      reason: z.string().optional(),
      human: z.string().optional(),
    })).optional(),
    // Tickets to append
    tickets: z.array(z.object({
      when: z.string().datetime().optional(), // ISO; default: now
      ticket: z.object({
        symbol: z.string(),
        side: z.enum(['BUY','SELL']),
        qty: z.number().int().positive(),
        entry: z.number(),
        stop: z.number(),
        targets: z.array(z.number()),
      }),
      reasons: z.array(z.string()).default([]),
    })).optional(),
    // Risk context patch
    risk: z.object({
      netLiqHigh: z.number().optional(),
      ddAmount: z.number().optional(),
      maxContracts: z.number().optional(),
      bufferAchieved: z.boolean().optional(),
      todayProfit: z.number().optional(),
      periodProfit: z.number().optional(),
    }).optional(),
  });

  app.post('/compat/dev/seed', async (req, reply) => {
    const parsed = seedSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', issues: parsed.error.issues });
    }

    const body = parsed.data;

    let alertsAdded = 0;
    if (body.alerts?.length) {
      for (const it of body.alerts) {
        const ts = new Date().toISOString();
        // Build a minimal "ParseResult" that store.enqueueAlert expects; cast to any to bypass strict typing for dev-only
        const toEnqueue = {
          alert: {
            id: randomUUID(),
            ts,
            symbol: it.symbol ?? 'ES',
            side: it.side ?? 'BUY',
            price: it.price ?? 0,
            reason: it.reason,
            raw: it,
          },
          human: { text: it.human ?? `[${it.symbol ?? 'ES'}] ${it.side ?? 'BUY'} ${it.price ?? ''}`.trim() },
          candidate: undefined,
        } as any;
        store.enqueueAlert(toEnqueue);
        alertsAdded++;
      }
    }

    let ticketsAdded = 0;
    if (body.tickets?.length) {
      for (const t of body.tickets) {
        const when = t.when ?? new Date().toISOString();
        store.appendTicket({
          when,
          ticket: t.ticket as any,
          reasons: t.reasons ?? [],
        });
        ticketsAdded++;
      }
    }

    if (body.risk && Object.keys(body.risk).length) {
      store.setRiskContext(body.risk);
    }

    return { ok: true, alertsAdded, ticketsAdded, riskPatched: Boolean(body.risk) };
  });

  // Convenience: GET endpoint to seed a small default set quickly
  app.get('/compat/dev/seed', async () => {
    const now = new Date();
    const iso = now.toISOString();
    const sample = {
      alerts: [
        { symbol: 'ES', side: 'BUY',  price: 5432.25, human: 'BUY ES @ 5432.25 (OR breakout)' },
        { symbol: 'NQ', side: 'SELL', price: 18987.5, human: 'SELL NQ @ 18987.5 (VWAP first touch)' },
      ],
      tickets: [
        {
          when: iso,
          ticket: { symbol: 'ES', side: 'BUY', qty: 2, entry: 5432.25, stop: 5426.75, targets: [5436.25, 5442.25] },
          reasons: [],
        },
      ],
      risk: { ddAmount: 3000, maxContracts: 4, bufferAchieved: false, todayProfit: 125.5, periodProfit: 980.0 },
    };
    // Reuse the POST handler by pretending this was posted
    // (We could call store directly, but this keeps behavior consistent.)
    // @ts-expect-error Fastify types aren't needed in this dev shortcut
    return sample;
  });
}


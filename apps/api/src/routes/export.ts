import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TradovateClient } from '../../../../packages/clients-tradovate/src/rest.ts';
import { store } from '../store';
import type { DailyJson, DailyTicketRow } from '../../../../packages/reporting/src/types.ts';
import { toDailyCSV } from '../../../../packages/reporting/src/csv.ts';
import { sendDailyEmail } from '../../../../packages/reporting/src/email.ts';

function toDailyJson(date: string, acct: { dayPnlRealized: number; dayPnlUnrealized: number; netLiq: number }): DailyJson {
  const dayTickets = store.getTicketsForDate(date);
  const tickets: DailyTicketRow[] = dayTickets.map(t => ({
    when: t.when,
    symbol: t.ticket.symbol,
    side: t.ticket.side,
    qty: t.ticket.qty,
    entry: t.ticket.order.entry,
    stop: t.ticket.order.stop,
    targets: t.ticket.order.targets,
    apex_blocked: t.reasons.length > 0,
    reasons: t.reasons,
  }));

  const alerts = store.getAlertsForDate(date).map(a => ({
    id: a.id,
    ts: a.ts,
    symbol: a.symbol,
    side: a.side,
    price: a.price,
    reason: a.reason,
    acknowledged: a.acknowledged,
  }));

  const summary = {
    date,
    ticketsCount: tickets.length,
    blockedCount: tickets.filter(t => t.apex_blocked).length,
    alertsAcked: alerts.filter(a => a.acknowledged).length,
    alertsQueued: alerts.length,
    pnl: {
      realized: acct.dayPnlRealized || 0,
      unrealized: acct.dayPnlUnrealized || 0,
      netLiq: acct.netLiq || 0,
    },
  };

  const breaches = tickets.filter(t => t.apex_blocked).map(t => ({ when: t.when, reasons: t.reasons }));

  return { summary, tickets, alerts, breaches };
}

export async function exportRoutes(app: FastifyInstance) {
  const client = new TradovateClient();

  app.get('/export/daily.json', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });

    const acct = await client.getAccount() as any;
    const json = toDailyJson(q.data.date, {
      dayPnlRealized: acct.dayPnlRealized ?? 0,
      dayPnlUnrealized: acct.dayPnlUnrealized ?? 0,
      netLiq: acct.netLiq ?? 0,
    });
    return json;
  });

  app.get('/export/daily.csv', async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });

    const acct = await client.getAccount() as any;
    const json = toDailyJson(q.data.date, {
      dayPnlRealized: acct.dayPnlRealized ?? 0,
      dayPnlUnrealized: acct.dayPnlUnrealized ?? 0,
      netLiq: acct.netLiq ?? 0,
    });
    const csv = toDailyCSV(json);
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="daily-${q.data.date}.csv"`);
    return csv;
  });

  app.post('/report/email-daily', async (req, reply) => {
    const p = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().email(),
    }).safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'Invalid payload' });

    const acct = await client.getAccount() as any;
    const json = toDailyJson(p.data.date, {
      dayPnlRealized: acct.dayPnlRealized ?? 0,
      dayPnlUnrealized: acct.dayPnlUnrealized ?? 0,
      netLiq: acct.netLiq ?? 0,
    });
    const csv = toDailyCSV(json);
    const res = await sendDailyEmail(p.data.date, p.data.to, json, csv);
    return res;
  });
}

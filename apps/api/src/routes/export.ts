import { FastifyPluginAsync } from 'fastify';
import { store } from '../store';
import { z } from 'zod';

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/export/tickets', async (req, reply) => {
    const q = z
      .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });
    const date = q.data.date;
    const ticketsRaw = store.getTicketsForDate(date);
    const tickets = ticketsRaw.map((t) => ({
      when: t.when,
      symbol: (t.ticket as any).symbol,
      side: (t.ticket as any).side,
      qty: (t.ticket as any).qty,
      entry: (t.ticket as any).entry,
      stop: (t.ticket as any).stop,
      targets: ((t.ticket as any).targets ?? []) as number[],
      apex_blocked: t.reasons.length > 0,
      reasons: t.reasons,
    }));
    const alerts = store.getAlertsForDate(date).map((a) => ({
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
      blockedCount: tickets.filter((t) => t.apex_blocked).length,
      alertsAcked: alerts.filter((a) => a.acknowledged).length,
      alertsQueued: alerts.filter((a) => !a.acknowledged).length,
      pnl: { realized: 0, unrealized: 0, netLiq: 0 },
    };
    const json = { summary, tickets, alerts, breaches: [] };
    let csv: string;
    try {
      const mod = await import('@prism-apex-tool/reporting');
      csv = mod.toDailyCSV(json as any);
    } catch {
      const header = 'date,time,symbol,side,qty,entry,stop,targets,apex_blocked,reasons';
      const rows = tickets.map((t) => {
        const d = new Date(t.when);
        const dateStr = d.toISOString().slice(0, 10);
        const timeStr = d.toISOString().slice(11, 19);
        return [
          dateStr,
          timeStr,
          t.symbol,
          t.side,
          String(t.qty),
          String(t.entry),
          String(t.stop),
          t.targets.join('|'),
          String(t.apex_blocked),
          t.reasons.join(' | '),
        ].join(',');
      });
      csv = [header, ...rows].join('\n');
    }
    return reply.type('text/csv').send(csv);
  });
};

export default exportRoutes;

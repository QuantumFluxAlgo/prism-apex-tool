import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../store';

export const exportRoutes: FastifyPluginAsync = async (app) => {
  let reporting: any;
  try {
    reporting = await import('@prism-apex-tool/reporting');
  } catch {}

  app.get('/export/tickets', async (req, reply) => {
    const q = z
      .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid date' });

    const tickets = store.getTicketsForDate(q.data.date);
    const alerts = store.getAlertsForDate(q.data.date);
    let csv: string;

    if (reporting && 'toDailyCSV' in reporting) {
      const rows = tickets.map(t => ({
        when: t.when,
        symbol: (t.ticket as any).symbol ?? '',
        side: (t.ticket as any).side ?? '',
        qty: Number((t.ticket as any).qty ?? 0),
        entry: Number((t.ticket as any).entry ?? 0),
        stop: Number((t.ticket as any).stop ?? 0),
        targets: ((t.ticket as any).targets as number[] | undefined) ?? [],
        apex_blocked: (t.ticket as any).apex_blocked ?? false,
        reasons: t.reasons,
      }));
      csv = reporting.toDailyCSV({
        summary: {
          date: q.data.date,
          ticketsCount: rows.length,
          blockedCount: rows.filter(r => r.apex_blocked || r.reasons.length > 0).length,
          alertsAcked: alerts.filter(a => a.acknowledged).length,
          alertsQueued: alerts.filter(a => !a.acknowledged).length,
          pnl: { realized: 0, unrealized: 0, netLiq: 0 },
        },
        tickets: rows,
        alerts: alerts.map(a => ({
          id: a.id,
          ts: a.ts,
          symbol: a.symbol,
          side: a.side,
          price: a.price,
          reason: a.reason,
          acknowledged: a.acknowledged,
        })),
        breaches: [],
      });
    } else {
      const header = 'id,ts,symbol,side,price,reason,reasons';
      const lines = [header];
      for (const t of tickets) {
        const ticket: any = t.ticket;
        lines.push([
          ticket.id,
          t.when,
          ticket.symbol ?? '',
          ticket.side ?? '',
          ticket.price ?? '',
          ticket.reason ?? '',
          t.reasons.join('|'),
        ].join(','));
      }
      csv = lines.join('\n');
    }

    reply.header('Content-Type', 'text/csv');
    return reply.send(csv);
  });
};

export default exportRoutes;

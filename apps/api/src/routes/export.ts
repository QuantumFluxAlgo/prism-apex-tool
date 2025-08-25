import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../store.js';
import { getConfig } from '../config/env.js';
import {
  evaluateTicket,
  withinSuppressionWindow,
  suggestPercent,
  type TicketInput,
} from '@prism-apex-tool/rules-apex';
import { Accounts } from '../lib/accounts.js';

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/export/tickets', async (req, reply) => {
    const q = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        format: z.enum(['json', 'csv']).optional(),
        accountId: z.string().optional(),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'Invalid query' });
    const { date, format: formatRaw, accountId } = q.data;
    const format = formatRaw ?? 'json';

    const cfg = getConfig();
    const account = accountId ? await Accounts.get(accountId) : undefined;

    const now = new Date();
    const rawTickets = store.getTicketsForDate(date);
    const tickets = rawTickets.map((t) => {
      const input: TicketInput = {
        symbol: (t.ticket as any).symbol,
        side: ((t.ticket as any).side === 'BUY' ? 'long' : 'short') as any,
        entry: (t.ticket as any).entry,
        stop: (t.ticket as any).stop,
        target: ((t.ticket as any).targets ?? [])[0],
        timestampUtc: t.when,
      };
      const preCloseSuppressed = withinSuppressionWindow(now, cfg.time.flatByUtc, 5);
      const res = evaluateTicket(input, {
        minRR: cfg.guardrails.minRR,
        maxRR: cfg.guardrails.maxRR,
        flatByUtc: cfg.time.flatByUtc,
        now,
      });
      let sizeSuggested: number | undefined;
      let halfSizeSuggested: boolean | undefined;
      if (account) {
        const sizing = suggestPercent(
          account.maxContracts,
          account.bufferCleared,
          cfg.sizing.percent.noBuffer,
          cfg.sizing.percent.withBuffer,
        );
        sizeSuggested = sizing.contracts;
        halfSizeSuggested = sizing.halfSizeSuggested;
      }
      return {
        when: t.when,
        symbol: (t.ticket as any).symbol,
        side: (t.ticket as any).side,
        qty: (t.ticket as any).qty,
        entry: (t.ticket as any).entry,
        stop: (t.ticket as any).stop,
        target: ((t.ticket as any).targets ?? [])[0],
        accepted: res.decision === 'accept',
        rr: res.rr,
        reasons: res.reasons.length ? res.reasons : undefined,
        preCloseSuppressed,
        flatByUtc: cfg.time.flatByUtc,
        sizeSuggested,
        halfSizeSuggested,
      };
    });

    if (format === 'csv') {
      const header =
        'ts,symbol,side,entry,stop,target,rr,accepted,reason_summary,pre_close,flat_by_utc,size_suggested,half_size_suggested';
      const rows = tickets.map((t) => {
        const cols = [
          t.when,
          t.symbol,
          t.side,
          String(t.entry),
          String(t.stop),
          String(t.target ?? ''),
          t.rr !== undefined ? String(t.rr) : '',
          String(t.accepted),
          t.reasons?.[0] ?? '',
          String(t.preCloseSuppressed),
          t.flatByUtc,
          t.sizeSuggested !== undefined ? String(t.sizeSuggested) : '',
          t.halfSizeSuggested !== undefined ? String(t.halfSizeSuggested) : '',
        ];
        // remove trailing empty cells
        let end = cols.length;
        while (end > 0 && cols[end - 1] === '') end--;
        return cols.slice(0, end).join(',');
      });
      const csv = [header, ...rows].join('\n');
      return reply.type('text/csv').send(csv);
    }

    return tickets;
  });
};

export default exportRoutes;

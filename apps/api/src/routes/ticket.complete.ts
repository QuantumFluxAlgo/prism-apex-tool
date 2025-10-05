import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

export default async function ticketCompleteRoute(app: FastifyInstance) {
  const handler = async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { note?: string; user?: string };

    if (!id) {
      return reply.code(400).send({ error: 'missing_id' });
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const update = await client.query(
        `
        UPDATE tickets
           SET status = 'COMPLETE',
               completed_at_utc = COALESCE(completed_at_utc, NOW()),
               completed_by = COALESCE($2, completed_by),
               completed_note = COALESCE($3, completed_note)
         WHERE id = $1
           AND status <> 'COMPLETE'
        RETURNING id, symbol, strategy, direction, status,
                  session_date_utc, opened_at_utc, closed_at_utc,
                  entry_price, exit_price, stop_price, target_price,
                  pnl, meta,
                  completed_at_utc, completed_by, completed_note
        `,
        [id, body.user ?? null, body.note ? String(body.note).slice(0, 80) : null],
      );

      if (update.rowCount > 0) {
        return reply.send({ ok: true, row: update.rows[0] });
      }

      const existing = await client.query(
        `
        SELECT id, symbol, strategy, direction, status,
               session_date_utc, opened_at_utc, closed_at_utc,
               entry_price, exit_price, stop_price, target_price,
               pnl, meta,
               completed_at_utc, completed_by, completed_note
          FROM tickets
         WHERE id = $1
        `,
        [id],
      );

      if (existing.rowCount === 0) {
        return reply.code(404).send({ error: 'not_found' });
      }

      return reply.send({ ok: true, row: existing.rows[0] });
    } finally {
      await client.end();
    }
  };

  app.patch('/tickets/:id/complete', handler);
  app.patch('/api/tickets/:id/complete', handler);
}

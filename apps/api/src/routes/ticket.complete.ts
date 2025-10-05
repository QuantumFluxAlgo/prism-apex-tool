import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';

export default async function ticketCompleteRoute(app: FastifyInstance) {
  const handler = async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { user?: string; note?: string };

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const { rows } = await client.query(
        `SELECT id, actionable, non_actionable_reason AS reason, status
           FROM tickets
          WHERE id = $1
          LIMIT 1`,
        [id],
      );

      const current = rows[0];
      if (!current) {
        return reply.code(404).send({ error: 'not_found' });
      }

      if (current.status !== 'COMPLETE' && !current.actionable) {
        return reply.code(422).send({ ok: false, error: 'not_actionable', reason: current.reason ?? 'Not actionable' });
      }

      const { rows: updated } = await client.query(
        `UPDATE tickets
            SET status = 'COMPLETE',
                completed_by = COALESCE($2, completed_by),
                completed_note = COALESCE($3, completed_note),
                completed_at_utc = COALESCE(completed_at_utc, NOW() AT TIME ZONE 'UTC')
          WHERE id = $1
        RETURNING *`,
        [id, body.user ?? null, body.note ?? null],
      );

      return reply.send({ ok: true, row: updated[0] });
    } finally {
      await client.end();
    }
  };

  app.patch('/tickets/:id/complete', handler);
  app.patch('/api/tickets/:id/complete', handler);
}

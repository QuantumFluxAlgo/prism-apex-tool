import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';
import { getInstrumentSpec } from '../risk/contractMath.js';
import { getSessionRisk, addRiskUsed } from '../store/operatorSessionRisk.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const OPERATOR_ID = 'DEFAULT';

type TicketRow = {
  id: string;
  status: string;
  actionable: boolean;
  session_date_utc: string;
  entry_price: number;
  stop_price: number | null;
  symbol: string;
  meta: any;
};

function resolveQty(meta: any): number | null {
  const pendingQty = meta?.operatorDailyRiskPending?.qty;
  if (typeof pendingQty === 'number' && Number.isFinite(pendingQty) && pendingQty > 0) {
    return pendingQty;
  }
  const legacyQty =
    typeof meta?.contracts === 'number' && Number.isFinite(meta.contracts)
      ? meta.contracts
      : typeof meta?.qty === 'number' && Number.isFinite(meta.qty)
      ? meta.qty
      : null;
  return legacyQty;
}

function computeRiskUsd(row: TicketRow): number {
  const meta = row.meta ?? {};
  const pendingRisk = meta?.operatorDailyRiskPending?.riskUsd;
  if (typeof pendingRisk === 'number' && Number.isFinite(pendingRisk) && pendingRisk > 0) {
    return pendingRisk;
  }
  const entry = typeof row.entry_price === 'number' ? row.entry_price : null;
  const stop = typeof row.stop_price === 'number' ? row.stop_price : entry;
  const qty = resolveQty(meta);
  if (entry === null || stop === null || !(qty && qty > 0)) return 0;
  try {
    const spec = getInstrumentSpec(row.symbol);
    const ticks = Math.abs(entry - stop) / spec.tickSize;
    if (!Number.isFinite(ticks) || ticks <= 0) return 0;
    return ticks * spec.dollarsPerTick * qty;
  } catch {
    return Math.abs(entry - stop) * (qty ?? 0);
  }
}

const ticketEnteredRoute: FastifyInstance['register'] = async (app) => {
  const handler = async (req: any, reply: any) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { operatorId?: string };
    const operatorId =
      typeof body.operatorId === 'string' && body.operatorId.trim().length
        ? body.operatorId.trim()
        : OPERATOR_ID;

    const client = new Client({
      connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    });
    await client.connect();
    try {
      const { rows } = await client.query<TicketRow>(
        `SELECT id, status, actionable, session_date_utc, entry_price, stop_price, symbol, meta
           FROM tickets
          WHERE id = $1
          LIMIT 1`,
        [id],
      );
      if (!rows.length) {
        return reply.code(404).send({ error: 'not_found' });
      }
      const row = rows[0];
      if (row.status !== 'OPEN' || row.actionable !== true) {
        return reply.code(409).send({ error: 'ticket_not_actionable' });
      }
      const sessionRisk = await getSessionRisk(OPERATOR_ID, row.session_date_utc);
      if (!sessionRisk) {
        return reply.code(409).send({ error: 'daily-risk-limit-not-set' });
      }
      const riskUsd = computeRiskUsd(row);
      if (!(riskUsd > 0)) {
        return reply.code(409).send({ error: 'invalid-risk' });
      }

      const addResult = await addRiskUsed(OPERATOR_ID, row.session_date_utc, riskUsd);
      if (!addResult.ok || typeof addResult.limitUsd !== 'number') {
        return reply.code(409).send({ error: 'daily-risk-limit-exceeded' });
      }

      const limitUsd = addResult.limitUsd;
      const usedUsd =
        typeof addResult.usedUsd === 'number'
          ? addResult.usedUsd
          : sessionRisk.riskUsedUsd + riskUsd;
      const remainingUsd = Math.max(0, limitUsd - usedUsd);

      const meta = (row.meta ?? {}) as Record<string, unknown>;
      const updatedMeta = {
        ...meta,
        operatorDailyRisk: {
          dailyRiskLimitUsd: limitUsd,
          riskUsedUsd: usedUsd,
          riskRemainingUsd: remainingUsd,
          enteredRiskUsd: riskUsd,
          enteredBy: operatorId,
        },
      };
      delete (updatedMeta as any).operatorDailyRiskPending;

      await client.query(
        `UPDATE tickets
            SET status = 'ENTERED',
                actionable = FALSE,
                entered_at_utc = now() AT TIME ZONE 'UTC',
                entered_by = $3,
                meta = $2::jsonb
          WHERE id = $1`,
        [id, JSON.stringify(updatedMeta), operatorId],
      );

      return reply.send({
        ok: true,
        riskUsedUsd: usedUsd,
        riskRemainingUsd: remainingUsd,
      });
    } finally {
      await client.end();
    }
  };

  app.patch('/tickets/:id/entered', handler);
  app.patch('/api/tickets/:id/entered', handler);
};

export default ticketEnteredRoute;

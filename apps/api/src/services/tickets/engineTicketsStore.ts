import { Pool } from 'pg';
import type { EngineSignal } from '../../dto/strategy-engine/index.js';
import type { HardStopDecision } from '../../risk/hardStop.js';
import type { MinimalTicket } from './engineTickets.js';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

export interface EngineTicketPersistContext {
  symbol: string;
  strategy: string;
  sessionDate: string;
  engineVersion: string;
  riskEngineVersion: string;
  strategyConfigVersion: number | null;
  tickets: MinimalTicket[];
  rejected: {
    signal: EngineSignal;
    decision: HardStopDecision;
  }[];
  meta?: Record<string, unknown>;
}

export interface EngineTicketRow {
  symbol: string;
  strategy: string;
  direction: 'LONG' | 'SHORT';
  contracts: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number | null;
  riskDollars: number;
  engineTimestamp: string;
  sessionDate: string;
  status: 'approved' | 'rejected';
  rejectionReason: string | null;
  engineVersion: string;
  meta: Record<string, unknown> | null;
}

export function mapEngineTicketsToRows(ctx: EngineTicketPersistContext): EngineTicketRow[] {
  const {
    symbol,
    strategy,
    sessionDate,
    engineVersion,
    riskEngineVersion,
    strategyConfigVersion,
    tickets,
    rejected,
    meta,
  } = ctx;
  const sharedMeta = meta ?? null;
  const rows: EngineTicketRow[] = [];

  for (const ticket of tickets) {
    const metaPayload: Record<string, unknown> = sharedMeta ? { ...sharedMeta } : {};
    metaPayload.riskEngineVersion = riskEngineVersion;
    metaPayload.strategyConfigVersion = strategyConfigVersion;
    metaPayload.contracts = ticket.contracts;
    metaPayload.riskDollars = ticket.riskDollars;
    if (typeof ticket.rewardDollars === 'number' && Number.isFinite(ticket.rewardDollars)) {
      metaPayload.rewardDollars = ticket.rewardDollars;
    }
    if (typeof ticket.rrMultiple === 'number' && Number.isFinite(ticket.rrMultiple)) {
      metaPayload.rrMultiple = ticket.rrMultiple;
    }

    rows.push({
      symbol,
      strategy,
      direction: ticket.direction,
      contracts: ticket.contracts,
      entryPrice: ticket.entryPrice,
      stopPrice: ticket.stopPrice,
      targetPrice: ticket.targetPrice,
      riskDollars: ticket.riskDollars,
      engineTimestamp: ticket.engineTimestamp,
      sessionDate,
      status: 'approved',
      rejectionReason: null,
      engineVersion,
      meta: metaPayload,
    });
  }

  for (const { signal, decision } of rejected) {
    const entryPrice =
      typeof signal.entryPrice === 'number' && Number.isFinite(signal.entryPrice)
        ? signal.entryPrice
        : signal.price;
    const stopPrice =
      typeof signal.stopPrice === 'number' && Number.isFinite(signal.stopPrice)
        ? signal.stopPrice
        : entryPrice;
    const targetPrice =
      typeof signal.targetPrice === 'number' && Number.isFinite(signal.targetPrice)
        ? signal.targetPrice
        : null;

    const metaPayload: Record<string, unknown> = sharedMeta ? { ...sharedMeta } : {};
    metaPayload.riskEngineVersion = riskEngineVersion;
    metaPayload.strategyConfigVersion = strategyConfigVersion;
    metaPayload.contracts = 0;
    metaPayload.riskDollars = 0;

    rows.push({
      symbol,
      strategy,
      direction: signal.direction,
      contracts: 0,
      entryPrice,
      stopPrice,
      targetPrice,
      riskDollars: 0,
      engineTimestamp: signal.timestamp,
      sessionDate,
      status: 'rejected',
      rejectionReason: decision.reason ?? null,
      engineVersion,
      meta: metaPayload,
    });
  }

  return rows;
}

export async function persistEngineTickets(ctx: EngineTicketPersistContext): Promise<void> {
  const rows = mapEngineTicketsToRows(ctx);
  if (!rows.length) {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const text = `
      INSERT INTO engine_tickets (
        symbol,
        strategy,
        direction,
        contracts,
        entry_price,
        stop_price,
        target_price,
        risk_dollars,
        engine_timestamp,
        session_date,
        status,
        rejection_reason,
        engine_version,
        meta
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14::jsonb
      )
    `;

    for (const row of rows) {
      const values = [
        row.symbol,
        row.strategy,
        row.direction,
        row.contracts,
        row.entryPrice,
        row.stopPrice,
        row.targetPrice,
        row.riskDollars,
        row.engineTimestamp,
        row.sessionDate,
        row.status,
        row.rejectionReason,
        row.engineVersion,
        row.meta ? JSON.stringify(row.meta) : null,
      ];
      await client.query(text, values);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

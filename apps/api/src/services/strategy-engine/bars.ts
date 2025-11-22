import { Pool } from 'pg';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL });

export interface EngineBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Load all minute bars for the given symbol/session, ordered ascending by timestamp.
 */
export async function loadBarsForSession(symbol: string, sessionDate: string): Promise<EngineBar[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
        SELECT ts_utc, open, high, low, close, volume
        FROM bars_1m
        WHERE symbol = $1
          AND ts_utc::date = $2::date
        ORDER BY ts_utc ASC
      `,
      [symbol, sessionDate],
    );

    return result.rows.map((row) => ({
      timestamp: row.ts_utc instanceof Date ? row.ts_utc.toISOString() : new Date(row.ts_utc).toISOString(),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume ?? 0),
    }));
  } finally {
    client.release();
  }
}

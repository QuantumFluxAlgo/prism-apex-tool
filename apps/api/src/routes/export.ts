import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Client } from 'pg';
import fs from 'node:fs';
import { join } from 'node:path';
import { exportTickets as exportFromStore } from '../store/tickets.js';
import { isMockDbEnabled } from '../utils/testMode.js';
import { readTickets, toCsv } from '../utils/mockStore.js';
import { computeNextTradeSizingForDate } from '../services/operatorRisk.js';

const FOURTEEN_DAYS_MS = 28 * 24 * 60 * 60 * 1000; // now 28-day window
const DEFAULT_ROW_LIMIT = 50000;
const DEFAULT_SIZING_MIN_CONTRACTS = parseEnvNumber(process.env.EXPORT_SIZING_MIN_CONTRACTS, 1);
const DEFAULT_SIZING_MAX_CONTRACTS = parseEnvNumber(process.env.EXPORT_SIZING_MAX_CONTRACTS, 10);
const DEFAULT_SIZING_RISK_FRACTION = parseEnvNumber(process.env.EXPORT_SIZING_RISK_FRACTION, 0.25);

const SIZING_COLUMN_DEFS = [
  { key: 'sizing_suggested_contracts', label: 'sizing_suggested_contracts' },
  { key: 'sizing_min_contracts', label: 'sizing_min_contracts' },
  { key: 'sizing_max_contracts', label: 'sizing_max_contracts' },
  { key: 'sizing_per_contract_risk', label: 'sizing_per_contract_risk' },
  { key: 'sizing_projected_daily_risk_pct', label: 'sizing_projected_daily_risk_pct' },
  { key: 'sizing_remaining_drawdown_pct', label: 'sizing_remaining_drawdown_pct' },
  { key: 'sizing_utilisation_pct', label: 'sizing_utilisation_pct' },
];

function asUtcIso(value?: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function clampWindow14d(startIso: string, endIso: string) {
  let startValue = Date.parse(startIso);
  let endValue = Date.parse(endIso);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
    return { startIso, endIso };
  }
  if (endValue < startValue) {
    [startValue, endValue] = [endValue, startValue];
  }
  if (endValue - startValue > FOURTEEN_DAYS_MS) {
    endValue = startValue + FOURTEEN_DAYS_MS;
  }
  return {
    startIso: new Date(startValue).toISOString(),
    endIso: new Date(endValue).toISOString(),
  };
}

function ensureRange(startIso?: string, endIso?: string) {
  let start = startIso;
  let end = endIso;
  const now = Date.now();

  if (!start && !end) {
    end = new Date(now).toISOString();
    start = new Date(now - FOURTEEN_DAYS_MS).toISOString();
  } else if (!start && end) {
    const endValue = Date.parse(end);
    if (Number.isFinite(endValue)) {
      start = new Date(endValue - FOURTEEN_DAYS_MS).toISOString();
    }
  } else if (start && !end) {
    const startValue = Date.parse(start);
    if (Number.isFinite(startValue)) {
      end = new Date(Math.min(Date.now(), startValue + FOURTEEN_DAYS_MS)).toISOString();
    }
  }

  if (!start || !end) {
    const fallbackEnd = new Date(now).toISOString();
    const fallbackStart = new Date(now - FOURTEEN_DAYS_MS).toISOString();
    return { startIso: fallbackStart, endIso: fallbackEnd };
  }

  return clampWindow14d(start, end);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const header = columns.map((col) => col.label).join(',');
  const data = rows.map((row) => columns.map((col) => csvEscape(row[col.key])).join(','));
  return [header, ...data].join('\n');
}

function parseEnvNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPercent(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export async function exportRoutes(app: FastifyInstance) {
  const appendSizingData = async (rows: Record<string, unknown>[]) => {
    const enriched: Record<string, unknown>[] = [];
    for (const row of rows) {
      const next = { ...row };
      const entry = toNumber(row.entry_price);
      const stop = toNumber(row.stop_price);
      const openedAt = typeof row.opened_at_utc === 'string' ? row.opened_at_utc : null;
      const dateUtc = openedAt ? openedAt.slice(0, 10) : undefined;
      const perContractRisk = entry != null && stop != null ? Math.abs(entry - stop) : null;

      if (perContractRisk && perContractRisk > 0 && dateUtc) {
        try {
          const result = await computeNextTradeSizingForDate({
            dateUtc,
            perContractRisk,
            minContracts: DEFAULT_SIZING_MIN_CONTRACTS,
            maxContractsCap: DEFAULT_SIZING_MAX_CONTRACTS,
            riskFractionPerTrade: DEFAULT_SIZING_RISK_FRACTION,
          });
          const projectedPct = toPercent(result.sizing.suggestedRiskAmount ?? null, result.snapshot.maxDailyLossAmount);
          const remainingPct = toPercent(result.snapshot.remainingRiskCapacity ?? null, result.snapshot.maxDailyLossAmount);
          const utilisationPct = toPercent(result.sizing.suggestedRiskAmount ?? null, result.snapshot.remainingRiskCapacity ?? null);

          next.sizing_suggested_contracts = result.sizing.suggestedContracts ?? null;
          next.sizing_min_contracts = DEFAULT_SIZING_MIN_CONTRACTS;
          next.sizing_max_contracts = DEFAULT_SIZING_MAX_CONTRACTS;
          next.sizing_per_contract_risk = perContractRisk;
          next.sizing_projected_daily_risk_pct = projectedPct != null ? Number(projectedPct.toFixed(2)) : null;
          next.sizing_remaining_drawdown_pct = remainingPct != null ? Number(remainingPct.toFixed(2)) : null;
          next.sizing_utilisation_pct = utilisationPct != null ? Number(utilisationPct.toFixed(2)) : null;
        } catch (err) {
          app.log.warn(
            { err, symbol: row.symbol, openedAt },
            'Failed to compute sizing fields for ticket export row',
          );
        }
      }

      enriched.push(next);
    }
    return enriched;
  };
  app.get('/api/export/readme.md', async (_, reply) => {
    const readmePath = join(process.cwd(), 'README.md');
    if (!fs.existsSync(readmePath)) {
      reply.code(404);
      return reply.send({ error: 'README not found' });
    }
    reply
      .header('Content-Type', 'text/markdown; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="README.md"');
    return reply.send(fs.createReadStream(readmePath));
  });

  app.get('/api/export/bars.csv', async (request, reply) => {
    const { symbol, start, end, limit, all } = (request.query ?? {}) as {
      symbol?: string;
      start?: string;
      end?: string;
      limit?: string;
      all?: string;
    };

    const wantAll = (all === '1') || (symbol?.toUpperCase() === 'ALL');
    if (!wantAll && !symbol) {
      reply.code(400);
      return reply.send({ error: 'symbol is required (or use all=1)' });
    }

    const startIso = asUtcIso(start);
    const endIso = asUtcIso(end);
    const range = ensureRange(startIso, endIso);

    const rowLimit = Math.max(1, Math.min(DEFAULT_ROW_LIMIT, Number(limit ?? DEFAULT_ROW_LIMIT)));

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const whereClauses: string[] = [];
      const params: unknown[] = [];

      if (!wantAll) {
        params.push(symbol);
        whereClauses.push(`symbol = $${params.length}`);
      }

      params.push(range.startIso);
      whereClauses.push(`ts_utc >= $${params.length}`);

      params.push(range.endIso);
      whereClauses.push(`ts_utc < $${params.length}`);

      const whereSql = whereClauses.join(' AND ');

      const query = `
        SELECT symbol, ts_utc, open, high, low, close, volume
          FROM bars_1m
         WHERE ${whereSql}
         ORDER BY ${wantAll ? 'symbol ASC, ' : ''}ts_utc ASC
         LIMIT ${rowLimit}
      `;

      const { rows } = await client.query(query, params);

      const csv = buildCsv(rows, [
        { key: 'symbol', label: 'symbol' },
        { key: 'ts_utc', label: 'ts_utc' },
        { key: 'open', label: 'open' },
        { key: 'high', label: 'high' },
        { key: 'low', label: 'low' },
        { key: 'close', label: 'close' },
        { key: 'volume', label: 'volume' },
      ]);

      const fileLabel = wantAll ? 'ALL' : symbol;
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="bars-${fileLabel}.csv"`);
      return reply.send(csv);
    } finally {
      await client.end();
    }
  });

  const ticketsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { strategy, status, direction, source, start, end, limit, symbol } = (request.query ?? {}) as {
      strategy?: string;
      status?: string;
      direction?: string;
      source?: string;
      start?: string;
      end?: string;
      limit?: string;
      symbol?: string;
      date?: string;
    };

    const startIso = asUtcIso(start);
    const endIso = asUtcIso(end);
    const range = startIso && endIso ? clampWindow14d(startIso, endIso) : ensureRange(startIso, endIso);

    const rowLimit = Math.max(1, Math.min(DEFAULT_ROW_LIMIT, Number(limit ?? DEFAULT_ROW_LIMIT)));

    if (isMockDbEnabled()) {
      const date = (request.query as Record<string, string | undefined>).date;
      if (!date) {
        reply.code(400);
        return reply.send({ error: 'date query param required in mock mode' });
      }
      const tickets = exportFromStore(date).slice(0, rowLimit);
      const rows = tickets.map((ticket) => ({
        symbol: ticket.symbol,
        strategy: ticket.meta.strategy,
        direction: ticket.side,
        status: ticket.accepted ? 'ACCEPTED' : 'REJECTED',
        opened_at_utc: ticket.timestampUtc,
        entry_price: ticket.entry,
        stop_price: ticket.stop,
        target_price: ticket.target,
        'meta.strategy': ticket.meta.strategy,
        'meta.rr': ticket.meta.rr ?? '',
      }));
      const rowsWithSizing = await appendSizingData(rows);
      const csv = buildCsv(rowsWithSizing, [
        { key: 'symbol', label: 'symbol' },
        { key: 'strategy', label: 'strategy' },
        { key: 'direction', label: 'direction' },
        { key: 'status', label: 'status' },
        { key: 'opened_at_utc', label: 'opened_at_utc' },
        { key: 'meta.strategy', label: 'meta.strategy' },
        { key: 'meta.rr', label: 'meta.rr' },
        ...SIZING_COLUMN_DEFS,
      ]);
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="tickets-${date}.csv"`);
      return reply.send(csv);
    }

    const clauses: string[] = [];
    const params: unknown[] = [];

    const addClause = (sql: string, value?: string) => {
      if (!value) return;
      params.push(value);
      clauses.push(sql.replace('?', `$${params.length}`));
    };

    addClause('symbol = ?', symbol);
    addClause('strategy = ?', strategy);
    addClause('status = ?', status);
    addClause('direction = ?', direction);
    addClause('source = ?', source);

    if (range.startIso) {
      params.push(range.startIso);
      clauses.push(`opened_at_utc >= $${params.length}`);
    }
    if (range.endIso) {
      params.push(range.endIso);
      clauses.push(`opened_at_utc < $${params.length}`);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
      const query = `
        SELECT opened_at_utc, symbol, strategy, direction, status, source,
               entry_price, stop_price, target_price, rr, actionable, non_actionable_reason
          FROM tickets
          ${whereSql}
         ORDER BY opened_at_utc ASC
         LIMIT ${rowLimit}
      `;
      const { rows } = await client.query(query, params);
      const rowsWithSizing = await appendSizingData(rows);

      const csv = buildCsv(rowsWithSizing, [
        { key: 'opened_at_utc', label: 'opened_at_utc' },
        { key: 'symbol', label: 'symbol' },
        { key: 'strategy', label: 'strategy' },
        { key: 'direction', label: 'direction' },
        { key: 'status', label: 'status' },
        { key: 'source', label: 'source' },
        { key: 'entry_price', label: 'entry_price' },
        { key: 'stop_price', label: 'stop_price' },
        { key: 'target_price', label: 'target_price' },
        { key: 'rr', label: 'rr' },
        { key: 'actionable', label: 'actionable' },
        { key: 'non_actionable_reason', label: 'non_actionable_reason' },
        ...SIZING_COLUMN_DEFS,
      ]);

      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="tickets.csv"');
      return reply.send(csv);
    } finally {
      await client.end();
    }
  };

  const ticketsCsvMockHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (isMockDbEnabled() && !(request.query as Record<string, string | undefined>)?.date) {
      const rows = readTickets(5000);
      const csv = toCsv(rows);
      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="tickets.csv"');
      return reply.send(csv);
    }

    return ticketsHandler(request, reply);
  };

  app.get('/export/tickets', ticketsHandler);
  app.get('/api/export/tickets.csv', ticketsCsvMockHandler);
  app.get('/export/tickets.csv', ticketsCsvMockHandler);
}

export default exportRoutes;

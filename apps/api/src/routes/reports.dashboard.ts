import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Client } from 'pg';

const DAY_MS = 24 * 60 * 60 * 1000;

type DashboardQuery = {
  symbol?: string;
  from?: string;
  to?: string;
  interval?: 'hour' | 'day';
  strategy?: string;
};

type DashboardResponse = {
  generatedAt: string;
  appliedFilters: {
    symbol: string;
    fromUtc: string;
    toUtc: string;
    interval: 'hour' | 'day';
    strategy: string;
  };
  availableSymbols: string[];
  availableStrategies: string[];
  symbolCoverage: Array<{
    symbol: string;
    bars: number;
    minTsUtc: string | null;
    maxTsUtc: string | null;
    latestTsUtc: string | null;
    latestClose: number | null;
    latestVolume: number | null;
  }>;
  priceSeries: {
    points: Array<{ bucket: string; close: number | null; volume: number | null }>;
    baseline: number | null;
    change: { absolute: number | null; percent: number | null };
  };
  ticketSeries: {
    points: Array<{ bucket: string; trades: number; pnl: number | null }>;
  };
  ticketSummary: {
    total: number;
    inRange: number;
    last24h: number;
    avgPnl: number | null;
    grossPnl: number | null;
    bySymbol: Array<{ symbol: string; trades: number; pnl: number | null }>;
    byStrategy: Array<{ strategy: string; trades: number; pnl: number | null }>;
  };
};

const DEFAULT_SYMBOL = 'ES=F';

function parseDateInput(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value) return fallback;
  let parsed: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  } else {
    parsed = new Date(value);
  }
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function computeChange(points: Array<{ close: number | null }>) {
  const first = points.find((p) => typeof p.close === 'number')?.close ?? null;
  const last = [...points].reverse().find((p) => typeof p.close === 'number')?.close ?? null;
  if (first === null || last === null) {
    return { baseline: first, change: { absolute: null, percent: null } };
  }
  const absolute = last - first;
  const percent = first !== 0 ? (absolute / first) * 100 : null;
  return { baseline: first, change: { absolute, percent } };
}

export default async function reportsDashboardRoute(app: FastifyInstance) {
  app.get(
    '/api/reports/dashboard',
    async (req: FastifyRequest<{ Querystring: DashboardQuery }>) => {
      const now = new Date();
      const symbol = (req.query.symbol ?? DEFAULT_SYMBOL).trim() || DEFAULT_SYMBOL;
      const strategy = (req.query.strategy ?? 'ALL').trim().toUpperCase() || 'ALL';
      const interval = req.query.interval === 'day' ? 'day' : 'hour';

      const defaultTo = new Date(now);
      const defaultFrom = new Date(now.getTime() - 7 * DAY_MS);

      const toDate = parseDateInput(req.query.to, defaultTo, true);
      let fromDate = parseDateInput(req.query.from, defaultFrom);
      if (fromDate > toDate) {
        fromDate = new Date(toDate.getTime() - 7 * DAY_MS);
      }
      const rangeLimitMs = 60 * DAY_MS;
      if (toDate.getTime() - fromDate.getTime() > rangeLimitMs) {
        fromDate = new Date(toDate.getTime() - rangeLimitMs);
      }

      const databaseUrl = process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
      const client = new Client({ connectionString: databaseUrl });

      const response: DashboardResponse = {
        generatedAt: now.toISOString(),
        appliedFilters: {
          symbol,
          strategy,
          fromUtc: fromDate.toISOString(),
          toUtc: toDate.toISOString(),
          interval,
        },
        availableSymbols: [],
        availableStrategies: [],
        symbolCoverage: [],
        priceSeries: {
          points: [],
          baseline: null,
          change: { absolute: null, percent: null },
        },
        ticketSeries: {
          points: [],
        },
        ticketSummary: {
          total: 0,
          inRange: 0,
          last24h: 0,
          avgPnl: null,
          grossPnl: null,
          bySymbol: [],
          byStrategy: [],
        },
      };

      const coverageRows: any[] = [];
      const priceRows: any[] = [];
      const ticketSeriesRows: any[] = [];
      const ticketSummaryRows: any[] = [];
      const ticketBySymbolRows: any[] = [];
      const ticketByStrategyRows: any[] = [];
      const strategyRows: any[] = [];

      try {
        await client.connect();

        const [hasBarsRes, hasTicketsRes] = await Promise.all([
          client.query<{ exists: boolean }>(`SELECT to_regclass('public.bars_1m') IS NOT NULL AS exists`),
          client.query<{ exists: boolean }>(`SELECT to_regclass('public.tickets') IS NOT NULL AS exists`),
        ]);
        const hasBars = Boolean(hasBarsRes.rows[0]?.exists);
        const hasTickets = Boolean(hasTicketsRes.rows[0]?.exists);

        if (hasBars) {
          const coverage = await client.query(`
            WITH stats AS (
              SELECT symbol,
                     COUNT(*)::bigint AS bars,
                     MIN(ts_utc) AS min_ts,
                     MAX(ts_utc) AS max_ts
              FROM bars_1m
              GROUP BY symbol
            ),
            latest AS (
              SELECT DISTINCT ON (symbol) symbol, ts_utc, close, volume
              FROM bars_1m
              ORDER BY symbol, ts_utc DESC
            )
            SELECT
              stats.symbol,
              stats.bars,
              stats.min_ts,
              stats.max_ts,
              latest.ts_utc AS latest_ts,
              latest.close,
              latest.volume
            FROM stats
            LEFT JOIN latest ON latest.symbol = stats.symbol
            ORDER BY stats.symbol
          `);
          coverageRows.push(...coverage.rows);
          response.availableSymbols = coverage.rows.map((row) => row.symbol);

          const bucketExpr = interval === 'day' ? `date_trunc('day', ts_utc)` : `date_trunc('hour', ts_utc)`;
          const priceSeries = await client.query(
            `
            SELECT ${bucketExpr} AS bucket,
                   AVG(close)::float AS close,
                   SUM(volume)::float AS volume
            FROM bars_1m
            WHERE symbol = $1
              AND ts_utc BETWEEN $2 AND $3
            GROUP BY bucket
            ORDER BY bucket
          `,
            [symbol, fromDate.toISOString(), toDate.toISOString()],
          );
          priceRows.push(...priceSeries.rows);
        }

        if (hasTickets) {
          const filters: string[] = [`opened_at_utc BETWEEN $1 AND $2`];
          const values: Array<string | number> = [fromDate.toISOString(), toDate.toISOString()];
          let placeholder = values.length;
          if (symbol !== 'ALL') {
            filters.push(`symbol = $${++placeholder}`);
            values.push(symbol);
          }
          if (strategy !== 'ALL') {
            filters.push(`UPPER(strategy) = $${++placeholder}`);
            values.push(strategy);
          }
          const where = filters.join(' AND ');

          const ticketSummary = await client.query(
            `
            SELECT
              COUNT(*)::bigint AS total,
              AVG(pnl)::float AS avg_pnl,
              SUM(pnl)::float AS gross_pnl
            FROM tickets
            WHERE ${where}
          `,
            values,
          );
          ticketSummaryRows.push(...ticketSummary.rows);

          const ticketSeries = await client.query(
            `
            SELECT date_trunc('day', opened_at_utc) AS bucket,
                   COUNT(*)::int AS trades,
                   SUM(pnl)::float AS pnl
            FROM tickets
            WHERE ${where}
            GROUP BY bucket
            ORDER BY bucket
          `,
            values,
          );
          ticketSeriesRows.push(...ticketSeries.rows);

          const last24h = await client.query(`
            SELECT COUNT(*)::bigint AS trades
            FROM tickets
            WHERE opened_at_utc >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours'
          `);

          const totalTickets = await client.query(`SELECT COUNT(*)::bigint AS trades FROM tickets`);

          const bySymbol = await client.query(
            `
            SELECT symbol,
                   COUNT(*)::int AS trades,
                   SUM(pnl)::float AS pnl
            FROM tickets
            WHERE ${where}
            GROUP BY symbol
            ORDER BY trades DESC
            LIMIT 8
          `,
            values,
          );
          ticketBySymbolRows.push(...bySymbol.rows);

          const byStrategy = await client.query(
            `
            SELECT strategy,
                   COUNT(*)::int AS trades,
                   SUM(pnl)::float AS pnl
            FROM tickets
            WHERE ${where}
            GROUP BY strategy
            ORDER BY trades DESC
            LIMIT 8
          `,
            values,
          );
          ticketByStrategyRows.push(...byStrategy.rows);

          const strategyList = await client.query(`SELECT DISTINCT strategy FROM tickets ORDER BY strategy`);
          strategyRows.push(...strategyList.rows);

          response.ticketSummary.last24h = Number(last24h.rows[0]?.trades ?? 0);
          response.ticketSummary.total = Number(totalTickets.rows[0]?.trades ?? 0);
        }
      } catch (err) {
        app.log.error({ err }, 'reports dashboard query failed');
      } finally {
        try {
          await client.end();
        } catch {
          // noop
        }
      }

      response.symbolCoverage = coverageRows.map((row) => ({
        symbol: row.symbol,
        bars: Number(row.bars ?? 0),
        minTsUtc: row.min_ts ? new Date(row.min_ts).toISOString() : null,
        maxTsUtc: row.max_ts ? new Date(row.max_ts).toISOString() : null,
        latestTsUtc: row.latest_ts ? new Date(row.latest_ts).toISOString() : null,
        latestClose: typeof row.close === 'number' ? Number(row.close) : row.close ? Number(row.close) : null,
        latestVolume: typeof row.volume === 'number' ? Number(row.volume) : row.volume ? Number(row.volume) : null,
      }));

      response.priceSeries.points = priceRows.map((row) => ({
        bucket: row.bucket ? new Date(row.bucket).toISOString() : new Date().toISOString(),
        close: typeof row.close === 'number' ? Number(row.close) : null,
        volume: typeof row.volume === 'number' ? Number(row.volume) : null,
      }));
      const priceChange = computeChange(response.priceSeries.points);
      response.priceSeries.baseline = priceChange.baseline;
      response.priceSeries.change = priceChange.change;

      response.ticketSeries.points = ticketSeriesRows.map((row) => ({
        bucket: row.bucket ? new Date(row.bucket).toISOString() : new Date().toISOString(),
        trades: Number(row.trades ?? 0),
        pnl: typeof row.pnl === 'number' ? Number(row.pnl) : null,
      }));

      if (ticketSummaryRows[0]) {
        const row = ticketSummaryRows[0];
        response.ticketSummary.inRange = Number(row.total ?? 0);
        response.ticketSummary.avgPnl =
          typeof row.avg_pnl === 'number' && Number.isFinite(row.avg_pnl) ? Number(row.avg_pnl) : null;
        response.ticketSummary.grossPnl =
          typeof row.gross_pnl === 'number' && Number.isFinite(row.gross_pnl) ? Number(row.gross_pnl) : null;
      }

      response.ticketSummary.bySymbol = ticketBySymbolRows.map((row) => ({
        symbol: row.symbol,
        trades: Number(row.trades ?? 0),
        pnl: typeof row.pnl === 'number' ? Number(row.pnl) : null,
      }));
      response.ticketSummary.byStrategy = ticketByStrategyRows.map((row) => ({
        strategy: row.strategy,
        trades: Number(row.trades ?? 0),
        pnl: typeof row.pnl === 'number' ? Number(row.pnl) : null,
      }));

      response.availableStrategies = strategyRows
        .map((row) => row.strategy)
        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);

      return response;
    },
  );
}

import type { FastifyInstance } from 'fastify';
import { Client } from 'pg';
import { createSessionMetricsService } from '../jobs/session-metrics/service.js';
import type { SessionMetricsDto } from '../jobs/session-metrics/runtime.js';
import {
  determineSessionStatus,
  getDisplaySymbol,
  getMarketSymbols,
  getSessionWindowForDate,
  resolveSessionDate,
} from './market-utils.js';

const sessionMetricsService = createSessionMetricsService();

type TicketStats = {
  signalsOrr: number;
  signalsOsb: number;
  signalsVwap: number;
  latestTicketId: string | null;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeScore(metrics: SessionMetricsDto): number {
  let score = 50;
  if (metrics.status === 'OK') score += 15;
  if (metrics.sessionAtrBucket === 'LOW') score -= 5;
  if (metrics.sessionAtrBucket === 'HIGH') score += 5;
  if (metrics.vwapSlope === 'UP' || metrics.vwapSlope === 'DOWN') score += 5;
  if (metrics.liquidityRegime === 'THIN') score -= 10;
  if (metrics.sessionQualityFlag === 'ERROR') score -= 15;
  return clampScore(score);
}

function riskBucketFromScore(score: number): 'GREEN' | 'AMBER' | 'RED' {
  if (score >= 70) return 'GREEN';
  if (score >= 40) return 'AMBER';
  return 'RED';
}

async function loadTicketStats(
  client: Client | null,
  symbol: string,
  sessionDate: string,
): Promise<TicketStats> {
  if (!client) {
    return {
      signalsOrr: 0,
      signalsOsb: 0,
      signalsVwap: 0,
      latestTicketId: null,
    };
  }

  const counts = await client.query(
    `
      SELECT strategy, COUNT(*)::int AS count
      FROM tickets
      WHERE symbol = $1
        AND session_date_utc = $2::date
      GROUP BY strategy
    `,
    [symbol, sessionDate],
  );

  const latest = await client.query(
    `
      SELECT id
      FROM tickets
      WHERE symbol = $1
      ORDER BY opened_at_utc DESC
      LIMIT 1
    `,
    [symbol],
  );

  const stats: TicketStats = {
    signalsOrr: 0,
    signalsOsb: 0,
    signalsVwap: 0,
    latestTicketId: latest.rows[0]?.id ?? null,
  };

  for (const row of counts.rows) {
    const strat = String(row.strategy ?? '').toUpperCase();
    if (strat === 'ORR') stats.signalsOrr = row.count;
    else if (strat === 'OSB') stats.signalsOsb = row.count;
    else if (strat === 'VWAP_FT' || strat === 'VWAP-FT') stats.signalsVwap = row.count;
  }

  return stats;
}

function mapMetricsToMarketRow(
  symbol: string,
  metrics: SessionMetricsDto,
  stats: TicketStats,
  sessionDate: string,
) {
  const displaySymbol = getDisplaySymbol(symbol);
  const vwapDrift =
    metrics.vwapCloseValue != null && metrics.vwapOpenValue != null
      ? Number((metrics.vwapCloseValue - metrics.vwapOpenValue).toFixed(2))
      : 0;
  const score = computeScore(metrics);
  const regime =
    metrics.liquidityRegime ??
    metrics.volRegime ??
    metrics.htfTrendBias ??
    'UNKNOWN';

  return {
    id: `${symbol}-${sessionDate}`,
    symbol,
    symbolDisplay: displaySymbol,
    sessionDate,
    status: determineSessionStatus(getSessionWindowForDate(sessionDate)),
    regime,
    atrBucket: metrics.sessionAtrBucket ?? 'MED',
    orRangeTicks: metrics.orWidthPoints ?? 0,
    vwapDriftTicks: vwapDrift,
    score,
    riskBucket: riskBucketFromScore(score),
    signalsOrr: stats.signalsOrr,
    signalsOsb: stats.signalsOsb,
    signalsVwap: stats.signalsVwap,
    latestTicketId: stats.latestTicketId,
    lastUpdated: metrics.computedAt,
  };
}

export default function marketsSnapshotRoute(app: FastifyInstance): void {
  app.get('/api/markets', async (request, reply) => {
    const symbols = getMarketSymbols();
    if (!symbols.length) {
      return reply.send({ markets: [], rows: [] });
    }

    const sessionDate = resolveSessionDate(
      process.env.MARKET_SNAPSHOT_SESSION_DATE,
    );
    const databaseUrl = process.env.DATABASE_URL;
    let client: Client | null = null;
    if (databaseUrl) {
      client = new Client({ connectionString: databaseUrl });
      await client.connect();
    }

    try {
      const markets = [];
      for (const symbol of symbols) {
        const metrics = await sessionMetricsService.getForSymbolSession({
          symbol,
          sessionDate,
        });
        const stats = await loadTicketStats(client, symbol, sessionDate);
        markets.push(mapMetricsToMarketRow(symbol, metrics, stats, sessionDate));
      }
      return reply.send({ markets, rows: markets });
    } catch (err) {
      request.log.error({ err }, 'markets snapshot failed');
      return reply.status(500).send({ error: 'markets_snapshot_failed' });
    } finally {
      if (client) {
        await client.end().catch(() => undefined);
      }
    }
  });
}

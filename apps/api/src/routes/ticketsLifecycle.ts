import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://apex:apex@db:5432/prismapex';
}

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: getDatabaseUrl() });
  return pool;
}

function clampLimit(raw: unknown, def = 200): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(1, Math.min(500, Math.floor(n)));
}

function clampCursor(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

const querySchema = z.object({
  from: z.string().optional(),      // ISO (optional)
  to: z.string().optional(),        // ISO (optional)

  symbol: z.string().optional(),
  strategy: z.string().optional(),
  side: z.enum(['ALL', 'LONG', 'SHORT']).optional().default('ALL'),

  outcome: z.enum(['ALL', 'ACCEPTED', 'REJECTED']).optional().default('ALL'),
  status: z.string().optional(),    // 'ALL' or concrete status

  limit: z.string().optional(),
  cursor: z.string().optional(),
});

type WhereParts = { sql: string[]; params: any[] };

function addWhere(w: WhereParts, fragment: string, value?: any) {
  if (value === undefined) return;
  w.sql.push(fragment.replace('?', `$${w.params.length + 1}`));
  w.params.push(value);
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

export default async function ticketsLifecycleRoute(app: FastifyInstance) {
  app.get('/tickets-lifecycle', handler);
  app.get('/api/tickets-lifecycle', handler);

  async function handler(req: any, reply: any) {
    const parsed = querySchema.safeParse(req.query ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });

    const q = parsed.data;

    const limit = clampLimit(q.limit, 200);
    const cursor = clampCursor(q.cursor);

    const symbol = isNonEmpty(q.symbol) && q.symbol !== 'ALL' ? q.symbol.trim() : undefined;
    const strategy = isNonEmpty(q.strategy) && q.strategy !== 'ALL' ? q.strategy.trim() : undefined;
    const side = q.side && q.side !== 'ALL' ? q.side : undefined;

    const outcome = q.outcome ?? 'ALL';
    const status = isNonEmpty(q.status) && q.status !== 'ALL' ? q.status.trim() : undefined;

    const fromIso = isNonEmpty(q.from) ? q.from : undefined;
    const toIso = isNonEmpty(q.to) ? q.to : undefined;

    // We build WHERE separately for each source so we can compute totals as:
    // total = acceptedCount + rejectedCount (subject to outcome/status filters)
    const wt: WhereParts = { sql: [], params: [] };
    const wc: WhereParts = { sql: [], params: [] };

    // Time range applies to "session timestamp" for both:
    // tickets.opened_at_utc vs ticket_candidates.session_ts_utc
    if (fromIso) {
      addWhere(wt, `opened_at_utc >= ?::timestamptz`, fromIso);
      addWhere(wc, `session_ts_utc >= ?::timestamptz`, fromIso);
    }
    if (toIso) {
      addWhere(wt, `opened_at_utc <= ?::timestamptz`, toIso);
      addWhere(wc, `session_ts_utc <= ?::timestamptz`, toIso);
    }

    if (symbol) {
      addWhere(wt, `symbol = ?::text`, symbol);
      addWhere(wc, `symbol = ?::text`, symbol);
    }
    if (strategy) {
      addWhere(wt, `strategy = ?::text`, strategy);
      addWhere(wc, `strategy = ?::text`, strategy);
    }
    if (side) {
      addWhere(wt, `direction = ?::text`, side);
      addWhere(wc, `direction = ?::text`, side);
    }

    // Status filter:
    // - For accepted tickets: tickets.status is real (OPEN/EXPIRED/...)
    // - For rejected candidates: we treat status as 'REJECTED'
    //
    // If status is specified and not 'REJECTED', candidates should be excluded.
    // If status is 'REJECTED', accepted tickets should be excluded unless outcome=ALL and you *want* both.
    const wantsRejectedByStatus = status === 'REJECTED';

    // Outcome filter controls inclusion of each source.
    const includeAccepted =
      outcome === 'ALL' || outcome === 'ACCEPTED'
        ? !wantsRejectedByStatus // if explicitly filtering status=REJECTED, don't include accepted
        : false;

    const includeRejected =
      outcome === 'ALL' || outcome === 'REJECTED'
        ? status ? wantsRejectedByStatus : true // if status specified, only include rejects when status=REJECTED
        : false;

    if (status && status !== 'REJECTED') {
      addWhere(wt, `status = ?::text`, status);
    }

    const whereTickets = wt.sql.length ? `WHERE ${wt.sql.join(' AND ')}` : '';
    const whereCandidates = wc.sql.length ? `WHERE ${wc.sql.join(' AND ')}` : '';

    // We need stable ordering for pagination.
    // We order by session_ts_utc DESC, then a deterministic tie-breaker.
    // (Accepted rows use opened_at_utc as session_ts_utc.)
    //
    // NOTE: We do offset pagination for now (cursor as integer offset).
    // With current volumes (~thousands), this is acceptable and simple.
    const acceptedSelect = `
      SELECT
        'ACCEPTED'::text AS outcome,
        opened_at_utc AS session_ts_utc,
        (opened_at_utc AT TIME ZONE 'utc')::date AS session_date,
        symbol,
        strategy,
        direction,
        status,
        entry_price,
        stop_price,
        target_price,
        COALESCE(
          NULLIF(meta->>'contracts', '')::integer,
          NULLIF(meta->>'qty', '')::integer,
          NULLIF(meta->'operatorDailyRiskPending'->>'qty', '')::integer,
          0
        ) AS qty,
        rr AS rr_multiple,
        NULL::double precision AS risk_dollars,
        NULL::double precision AS reward_dollars,
        actionable,
        non_actionable_reason AS reject_reason,
        NULL::text[] AS reject_reasons,
        meta
      FROM tickets
      ${whereTickets}
    `;

    const rejectedSelect = `
      SELECT
        'REJECTED'::text AS outcome,
        session_ts_utc AS session_ts_utc,
        session_date AS session_date,
        symbol,
        strategy,
        direction,
        'REJECTED'::text AS status,
        entry_price,
        stop_price,
        target_price,
        qty,
        rr_multiple,
        risk_dollars,
        NULL::double precision AS reward_dollars,
        false::boolean AS actionable,
        rejection_reason AS reject_reason,
        reject_reasons,
        meta
      FROM public.ticket_candidates
      ${whereCandidates}
    `;

    const unionSqlParts: string[] = [];
    const params: any[] = [];

    // We must keep params in the same order they appear in the UNION parts.
    // To do that, we rebuild parameter arrays when including each side.
    function pushPart(sql: string, partParams: any[]) {
      // shift $n placeholders by current params length
      const offset = params.length;
      const shifted = sql.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + offset}`);
      unionSqlParts.push(shifted);
      params.push(...partParams);
    }

    if (includeAccepted) pushPart(acceptedSelect, wt.params);
    if (includeRejected) pushPart(rejectedSelect, wc.params);

    if (unionSqlParts.length === 0) {
      return reply.send({ total: 0, rows: [], tickets: [], nextCursor: null });
    }

    const unionSql = unionSqlParts.join('\nUNION ALL\n');

    const rowsSql = `
      WITH unified AS (
        ${unionSql}
      )
      SELECT *
      FROM unified
      ORDER BY session_ts_utc DESC, outcome ASC, symbol ASC, strategy ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const countSql = `
      WITH unified AS (
        ${unionSql}
      )
      SELECT COUNT(*)::int AS n
      FROM unified;
    `;

    const client = await getPool().connect();
    try {
      const [rowsResult, countResult] = await Promise.all([
        client.query(rowsSql, [...params, limit, cursor]),
        client.query(countSql, params),
      ]);

      const total = Number(countResult?.rows?.[0]?.n ?? 0);
      const nextCursor = cursor + rowsResult.rows.length < total ? cursor + limit : null;

      return reply.send({
        total,
        rows: rowsResult.rows,
        tickets: rowsResult.rows, // UI compatibility
        nextCursor,
      });
    } finally {
      client.release();
    }
  }
}

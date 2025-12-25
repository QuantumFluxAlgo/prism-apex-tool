import { Pool } from 'pg';

const DEFAULT_DATABASE_URL = 'postgres://apex:apex@db:5432/prismapex';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

export type OperatorSessionRisk = {
  operatorId: string;
  sessionDateUtc: string;
  dailyRiskLimitUsd: number;
  riskUsedUsd: number;
};

function mapRow(row: any): OperatorSessionRisk {
  return {
    operatorId: row.operator_id,
    sessionDateUtc: row.session_date_utc,
    dailyRiskLimitUsd: Number(row.daily_risk_limit_usd) || 0,
    riskUsedUsd: Number(row.risk_used_usd) || 0,
  };
}

export async function getSessionRisk(
  operatorId: string,
  sessionDateUtc: string,
): Promise<OperatorSessionRisk | null> {
  const { rows } = await pool.query(
    `SELECT operator_id, session_date_utc, daily_risk_limit_usd, risk_used_usd
       FROM operator_session_risk
      WHERE operator_id = $1 AND session_date_utc = $2`,
    [operatorId, sessionDateUtc],
  );
  if (!rows.length) return null;
  return mapRow(rows[0]);
}

export async function setDailyRiskLimit(
  operatorId: string,
  sessionDateUtc: string,
  dailyRiskLimitUsd: number,
): Promise<OperatorSessionRisk> {
  const { rows } = await pool.query(
    `INSERT INTO operator_session_risk (operator_id, session_date_utc, daily_risk_limit_usd)
       VALUES ($1, $2, $3)
       ON CONFLICT (operator_id, session_date_utc)
       DO UPDATE SET daily_risk_limit_usd = EXCLUDED.daily_risk_limit_usd,
                     updated_at_utc = now()
       RETURNING operator_id, session_date_utc, daily_risk_limit_usd, risk_used_usd`,
    [operatorId, sessionDateUtc, dailyRiskLimitUsd],
  );
  return mapRow(rows[0]);
}

export async function addRiskUsed(
  operatorId: string,
  sessionDateUtc: string,
  amountUsd: number,
): Promise<{
  ok: boolean;
  limitUsd?: number;
  usedUsd?: number;
}> {
  if (!(amountUsd > 0)) {
    return { ok: true };
  }
  const { rows } = await pool.query(
    `UPDATE operator_session_risk
        SET risk_used_usd = risk_used_usd + $3,
            updated_at_utc = now()
      WHERE operator_id = $1
        AND session_date_utc = $2
        AND risk_used_usd + $3 <= daily_risk_limit_usd
      RETURNING daily_risk_limit_usd, risk_used_usd`,
    [operatorId, sessionDateUtc, amountUsd],
  );
  if (!rows.length) {
    return { ok: false };
  }
  return {
    ok: true,
    limitUsd: Number(rows[0].daily_risk_limit_usd) || 0,
    usedUsd: Number(rows[0].risk_used_usd) || 0,
  };
}

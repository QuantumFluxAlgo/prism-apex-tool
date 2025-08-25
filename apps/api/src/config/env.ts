import { z } from 'zod';

export type Config = {
  nodeEnv: 'production' | 'development' | 'test';
  host: string;
  port: number;
  requestTimeoutMs: number; // total request timeout
  keepAliveTimeoutMs: number; // socket keep-alive
  bodyLimitBytes: number; // max JSON body size
  guardrails: {
    minRR: number;
    maxRR: number;
  };
  time: {
    flatByUtc: string;
  };
  sizing: {
    policy: 'percent-of-max';
    percent: {
      noBuffer: number;
      withBuffer: number;
    };
    halfSizeUntilBuffer: boolean;
  };
  consistency: {
    enabled: boolean;
    dayShareLimit: number;
    minProfitDayUsd: number;
    windowDays: number;
  };
  profitFloor: {
    minProfitTicks?: number;
    minExpectedProfitUsd?: number;
  };
  webhook: { tradingviewSecret?: string };
};

function parseIntWithDefault(v: string | undefined, def: number): number {
  const n = v ? Number.parseInt(v, 10) : def;
  return Number.isFinite(n) ? n : def;
}

const envSchema = z.object({
  MIN_RR: z.coerce.number().gt(0).max(5).default(1.5),
  MAX_RR: z.coerce.number().gt(0).max(5).default(5),
  FLAT_BY_UTC: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('20:59'),
  SIZE_POLICY: z.literal('percent-of-max').default('percent-of-max'),
  PCT_OF_MAX_WHEN_NO_BUFFER: z.coerce.number().gt(0).lte(1).default(0.5),
  PCT_OF_MAX_WHEN_BUFFER: z.coerce.number().gt(0).lte(1).default(1),
  HALF_SIZE_UNTIL_BUFFER: z.coerce.boolean().default(true),
  CONSISTENCY_TRACKING_ENABLED: z.coerce.boolean().default(true),
  CONSISTENCY_DAY_SHARE_LIMIT: z.coerce.number().gt(0).lte(1).default(0.3),
  CONSISTENCY_MIN_PROFIT_DAY_USD: z.coerce.number().default(50),
  CONSISTENCY_WINDOW_DAYS: z.coerce.number().int().min(1).default(8),
  MIN_PROFIT_TICKS: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().gt(0).optional()
  ),
  MIN_EXPECTED_PROFIT_USD: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().gt(0).optional()
  ),
  TRADINGVIEW_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export function getConfig(env = process.env): Config {
  const nodeEnv = (env.NODE_ENV ?? 'production') as Config['nodeEnv'];
  const port = parseIntWithDefault(env.PORT, 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${env.PORT}`);
  }
  const host = env.HOST ?? '0.0.0.0';

  const requestTimeoutMs = parseIntWithDefault(env.REQUEST_TIMEOUT_MS, 10000);
  const keepAliveTimeoutMs = parseIntWithDefault(env.KEEP_ALIVE_TIMEOUT_MS, 5000);
  const bodyLimitBytes = parseIntWithDefault(env.BODY_LIMIT_BYTES, 1048576); // 1 MiB

  const parsed = envSchema.parse(env);
  if (parsed.MIN_RR > parsed.MAX_RR) {
    throw new Error('MIN_RR cannot exceed MAX_RR');
  }

  return {
    nodeEnv,
    host,
    port,
    requestTimeoutMs,
    keepAliveTimeoutMs,
    bodyLimitBytes,
    guardrails: {
      minRR: parsed.MIN_RR,
      maxRR: parsed.MAX_RR,
    },
    time: {
      flatByUtc: parsed.FLAT_BY_UTC,
    },
    sizing: {
      policy: parsed.SIZE_POLICY,
      percent: {
        noBuffer: parsed.PCT_OF_MAX_WHEN_NO_BUFFER,
        withBuffer: parsed.PCT_OF_MAX_WHEN_BUFFER,
      },
      halfSizeUntilBuffer: parsed.HALF_SIZE_UNTIL_BUFFER,
    },
    consistency: {
      enabled: parsed.CONSISTENCY_TRACKING_ENABLED,
      dayShareLimit: parsed.CONSISTENCY_DAY_SHARE_LIMIT,
      minProfitDayUsd: parsed.CONSISTENCY_MIN_PROFIT_DAY_USD,
      windowDays: parsed.CONSISTENCY_WINDOW_DAYS,
    },
    profitFloor: {
      minProfitTicks: parsed.MIN_PROFIT_TICKS,
      minExpectedProfitUsd: parsed.MIN_EXPECTED_PROFIT_USD,
    },
    webhook: {
      tradingviewSecret: parsed.TRADINGVIEW_WEBHOOK_SECRET,
    },
  };
}

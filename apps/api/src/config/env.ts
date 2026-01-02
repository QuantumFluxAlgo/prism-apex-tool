export type SizePolicy = 'percent' | 'fixed';

export interface AppConfig {
  requestTimeoutMs: number;
  keepAliveTimeoutMs: number;
  bodyLimitBytes: number;

  jobs: {
    enableFeed: boolean;
  };

  webhook: {
    tradingviewSecret: string;
  };

  time: {
    flatByUtc: string;   // 'HH:mm' UTC string
  };

  guardrails: {
    minRR: number;
    maxRR: number;
  };

  sizing: {
    policy: SizePolicy;
    percent: {
      noBuffer: number;
      withBuffer: number;
    };
    enforceSizeHints: boolean;
    enforceSizeJumps: boolean;
  };

  consistency: {
    enabled: boolean;
    dayShareLimit: number;
    enforce: boolean;
  };

  tradovate: {
    baseUrl?: string;
    clientId?: string;
    username?: string;
    password?: string;
    appId?: string;
    appVersion?: string;
  };
}

function bool(v: string | undefined, d = false) {
  return v?.toLowerCase() === 'true' ? true : v?.toLowerCase() === 'false' ? false : d;
}
function num(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function str(v: string | undefined, d = '') {
  return v ?? d;
}

/** single static instance */
const cfg: AppConfig = {
  requestTimeoutMs: num(process.env.REQUEST_TIMEOUT_MS, 0),   // 0 -> Fastify default
  keepAliveTimeoutMs: num(process.env.KEEP_ALIVE_TIMEOUT_MS, 0),
  bodyLimitBytes: num(process.env.BODY_LIMIT_BYTES, 1048576), // 1MB default

  jobs: {
    enableFeed: bool(process.env.JOBS_ENABLE_FEED, false),
  },

  webhook: {
    tradingviewSecret: str(process.env.TRADINGVIEW_WEBHOOK_SECRET),
  },

  time: {
    flatByUtc: str(process.env.FLAT_BY_UTC, '20:55'),
  },

  guardrails: {
    minRR: num(process.env.GUARD_MIN_RR, 1.2),
    maxRR: num(process.env.GUARD_MAX_RR, 4.5),
  },

  sizing: {
    policy: (str(process.env.SIZING_POLICY, 'percent') as SizePolicy),
    percent: {
      noBuffer: num(process.env.SIZING_PERCENT_NO_BUFFER, 0.5),
      withBuffer: num(process.env.SIZING_PERCENT_WITH_BUFFER, 0.25),
    },
    enforceSizeHints: bool(process.env.SIZING_ENFORCE_HINTS, true),
    enforceSizeJumps: bool(process.env.SIZING_ENFORCE_JUMPS, true),
  },

  consistency: {
    enabled: bool(process.env.CONSISTENCY_ENABLED, false),
    dayShareLimit: num(process.env.CONSISTENCY_DAY_SHARE_LIMIT, 0.5),
    enforce: bool(process.env.CONSISTENCY_ENFORCE, false),
  },

  tradovate: {
    baseUrl: process.env.TRADOVATE_BASE_URL,
    clientId: process.env.TRADOVATE_CLIENT_ID,
    username: process.env.TRADOVATE_USERNAME,
    password: process.env.TRADOVATE_PASSWORD,
    appId: process.env.TRADOVATE_APP_ID,
    appVersion: process.env.TRADOVATE_APP_VERSION,
  },
};

export function getConfig(): AppConfig {
  return cfg;
}

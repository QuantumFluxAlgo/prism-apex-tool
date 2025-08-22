export type Config = {
  nodeEnv: "production" | "development" | "test";
  host: string;
  port: number;
  requestTimeoutMs: number;     // total request timeout
  keepAliveTimeoutMs: number;   // socket keep-alive
  bodyLimitBytes: number;       // max JSON body size
};

function parseIntWithDefault(v: string | undefined, def: number): number {
  const n = v ? Number.parseInt(v, 10) : def;
  return Number.isFinite(n) ? n : def;
}

export function getConfig(env = process.env): Config {
  const nodeEnv = (env.NODE_ENV ?? "production") as Config["nodeEnv"];
  const port = parseIntWithDefault(env.PORT, 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${env.PORT}`);
  }
  const host = env.HOST ?? "0.0.0.0";

  const requestTimeoutMs = parseIntWithDefault(env.REQUEST_TIMEOUT_MS, 10000);
  const keepAliveTimeoutMs = parseIntWithDefault(env.KEEP_ALIVE_TIMEOUT_MS, 5000);
  const bodyLimitBytes = parseIntWithDefault(env.BODY_LIMIT_BYTES, 1048576); // 1 MiB

  return {
    nodeEnv,
    host,
    port,
    requestTimeoutMs,
    keepAliveTimeoutMs,
    bodyLimitBytes,
  };
}

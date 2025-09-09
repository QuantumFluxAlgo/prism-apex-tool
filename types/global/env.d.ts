declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV?: 'development' | 'test' | 'production';
    readonly PORT?: string;
    readonly CORS_ALLOWLIST?: string;       // comma-separated
    readonly LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
    readonly TV_API_BASE_URL?: string;      // Tradovate REST (read-only)
    readonly TV_API_KEY?: string;
    readonly TV_API_SECRET?: string;
  }
}

import { Pool } from 'pg';

const DEFAULT_DATABASE_URL = 'postgresql://apex:apex@db:5432/prismapex?schema=public';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

process.on('SIGTERM', () => {
  pool.end().catch(() => undefined);
});

export default pool;

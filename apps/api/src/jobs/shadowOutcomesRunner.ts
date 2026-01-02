import { pool } from '../db';
import { runShadowOutcomesOnce } from './shadowOutcomesJob';

const LOCK_KEY = 8_142_001;

function envNum(name: string, dflt: number): number {
  const raw = process.env[name];
  if (!raw) return dflt;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : dflt;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let stopping = false;
process.on('SIGINT', () => (stopping = true));
process.on('SIGTERM', () => (stopping = true));

async function tryLock(): Promise<boolean> {
  const res = await pool.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
  return !!res.rows?.[0]?.ok;
}

async function runLoop() {
  const everySeconds = envNum('SHADOW_RUN_EVERY_SECONDS', 60);
  const intervalMs = Math.max(5, everySeconds) * 1000;

  const locked = await tryLock();
  if (!locked) {
    console.log('[shadow-outcomes] another runner holds the advisory lock, exiting');
    process.exit(0);
  }

  console.log(`[shadow-outcomes] runner started (every ${everySeconds}s)`);

  while (!stopping) {
    const start = Date.now();
    try {
      const { tickets, rows } = await runShadowOutcomesOnce();
      console.log(
        `[shadow-outcomes] batch complete tickets=${tickets} rows=${rows} ms=${Date.now() - start}`,
      );
    } catch (err) {
      console.error('[shadow-outcomes] batch failed', err);
    }

    const elapsed = Date.now() - start;
    const wait = Math.max(0, intervalMs - elapsed);
    await sleep(wait);
  }

  console.log('[shadow-outcomes] runner stopping');
  process.exit(0);
}

runLoop().catch((err) => {
  console.error('[shadow-outcomes] fatal error', err);
  process.exit(1);
});

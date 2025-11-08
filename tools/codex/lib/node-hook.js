const fs = require('fs');
const path = require('path');

const METRICS = process.env.YF_METRICS_PATH || '/data/ops/yahoo-metrics.jsonl';
const JITTER = parseInt(process.env.YF_JITTER_MS || '1000', 10);
const MAX = parseInt(process.env.YF_MAX_RETRIES || '6', 10);
const COOLDOWN = parseInt(process.env.YF_429_COOLDOWN_SEC || '600', 10) * 1000;

function ensureDir(p) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  } catch {
    /* noop */
  }
}

function logMetric(event, code, backoff, url) {
  try {
    ensureDir(METRICS);
    fs.appendFileSync(
      METRICS,
      JSON.stringify({
        ts: new Date().toISOString(),
        event,
        code,
        backoff_ms: backoff,
        url,
      }) + '\n',
      { encoding: 'utf8' },
    );
  } catch {
    /* noop */
  }
}

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function parseRetryAfter(res) {
  const raw = res.headers.get('retry-after');
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isFinite(num)) return Math.max(0, num * 1000);
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, ts - Date.now());
}

async function sleep(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function wrapFetch(orig) {
  return async function wrapped(input, init) {
    const url =
      typeof input === 'string'
        ? input
        : typeof input === 'object' && input !== null
          ? input.url || 'unknown'
          : 'unknown';
    let attempt = 0;
    while (true) {
      try {
        const res = await orig(input, init);
        if (res.status >= 200 && res.status < 300) {
          logMetric('ok', res.status, 0, url);
          return res;
        }
        if (res.status === 429) {
          const ra = parseRetryAfter(res);
          const delay = (ra ?? COOLDOWN) + randInt(JITTER);
          logMetric('429', res.status, delay, url);
          if (attempt++ >= MAX) throw new Error('max-retries');
          await sleep(delay);
          continue;
        }
        if (res.status === 408 || res.status >= 500) {
          const delay = Math.min(15000, (2 ** attempt) * 500 + randInt(JITTER));
          logMetric('retry', res.status, delay, url);
          if (attempt++ >= MAX) throw new Error('max-retries');
          await sleep(delay);
          continue;
        }
        logMetric('fail', res.status, 0, url);
        return res;
      } catch (err) {
        const delay = Math.min(15000, (2 ** attempt) * 500 + randInt(JITTER));
        logMetric('error', null, delay, url);
        if (attempt++ >= MAX) throw err;
        await sleep(delay);
      }
    }
  };
}

if (typeof globalThis.fetch === 'function') {
  const orig = globalThis.fetch.bind(globalThis);
  globalThis.fetch = wrapFetch(orig);
}

console.log('[codex-yf-hook] active');

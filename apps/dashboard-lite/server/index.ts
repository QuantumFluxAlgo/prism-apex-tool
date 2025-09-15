import express from 'express';
import morgan from 'morgan';
import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = express();
app.use(morgan('tiny'));

const PORT = Number(process.env.DASHBOARD_LITE_PORT || 5178);
const TICKETS_DIR = process.env.APEX_TICKETS_DIR || 'tickets';

app.get('/api/tickets', async (req, res) => {
  try {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const strategy = req.query.strategy ? String(req.query.strategy) : undefined;
    const pattern = join(TICKETS_DIR, date, '*.json');
    const files = await glob(pattern, { nodir: true });
    const rows = [];
    for (const f of files) {
      try {
        const t = JSON.parse(readFileSync(f, 'utf8'));
        if (strategy && t.strategy !== strategy) continue;
        rows.push(t);
      } catch {}
    }
    res.json(rows);
  } catch (e: any) {
    console.error(JSON.stringify({ level: 'error', msg: e?.message || 'api error' }));
    res.status(500).json({ error: 'internal' });
  }
});

// Serve web assets (built or dev)
const DEV = process.env.NODE_ENV !== 'production';
if (DEV) {
  // In dev, proxy Vite dev server index.html
  app.get('/', (_req, res) =>
    res.send(
      `<html><body><p>Run <code>pnpm -w -C apps/dashboard-lite dev</code> and open <a href="http://localhost:5179">web</a>.</p></body></html>`,
    ),
  );
} else {
  app.use('/', express.static('web-dist', { maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile('web-dist/index.html', { root: '.' }));
}

app.get('/health', (_req, res) => res.json({ ok: true, app: 'dashboard-lite' }));

app.listen(PORT, () => {
  console.info(
    JSON.stringify({
      level: 'info',
      msg: `dashboard-lite listening on ${PORT}`,
      tickets: TICKETS_DIR,
    }),
  );
});

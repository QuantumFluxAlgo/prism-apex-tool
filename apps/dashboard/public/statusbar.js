(function () {
  const onReady = () => {
    if (typeof window !== 'undefined' && /\/status\/?$/.test(window.location.pathname)) {
      return;
    }

    const COLORS = { green: '#16a34a', amber: '#f59e0b', red: '#ef4444', grey: '#64748b' };
    const STATUS_ENDPOINT = '/api/status';
    const REFRESH_MS = 15_000;
    const CIRCUIT_FAIL_THRESHOLD = 5;
    const CIRCUIT_PAUSE_MS = 5 * 60_000;

    let consecutiveFetchFails = 0;
    let circuitPausedUntil = 0;

    const style = document.createElement('style');
    style.textContent = `
      .pa-statusbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        padding: 10px 16px;
        background: var(--card, #0f172a);
        color: var(--text, #e5e7eb);
        border-bottom: 1px solid var(--border, #1f2937);
        box-shadow: var(--shadow, 0 1px 2px rgba(0,0,0,.4));
        font: 500 13px/1.2 var(--font, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji");
      }
      .pa-statusbar.pa-statusbar--error {
        box-shadow: inset 0 -2px 0 ${COLORS.red};
      }
      .pa-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(147, 197, 253, 0.3);
        background: rgba(15, 23, 42, 0.85);
        color: inherit;
        white-space: nowrap;
        font-size: 12px;
      }
      .pa-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: ${COLORS.grey};
        flex: none;
      }
      .pa-link {
        color: var(--link, #93c5fd);
        text-decoration: underline;
        cursor: pointer;
        font-size: 12px;
      }
      .pa-right {
        margin-left: auto;
        display: flex;
        gap: 12px;
        align-items: center;
        white-space: nowrap;
        color: var(--muted, #9ca3af);
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.className = 'pa-statusbar';
    bar.innerHTML = `
      <div class="pa-chip" title="Database connectivity"><span class="pa-dot" id="dot-db"></span><span>DB</span></div>
      <div class="pa-chip" title="API health"><span class="pa-dot" id="dot-api"></span><span>API</span></div>
      <div class="pa-chip" title="Yahoo ingress"><span class="pa-dot" id="dot-yahoo"></span><span>Yahoo</span></div>
      <div class="pa-chip" title="Tickets cron (1m)"><span class="pa-dot" id="dot-tickets"></span><span>Tickets</span></div>
      <div class="pa-chip" title="Gapfill cron"><span class="pa-dot" id="dot-gapfill"></span><span>Gapfill</span></div>
      <div class="pa-right">
        <span class="pa-muted">15s auto-refresh</span>
        <a class="pa-link" id="status-link">Details</a>
      </div>
    `;

    (document.body || document.documentElement).prepend(bar);

    const dots = {
      db: document.getElementById('dot-db'),
      api: document.getElementById('dot-api'),
      yahoo: document.getElementById('dot-yahoo'),
      tickets: document.getElementById('dot-tickets'),
      gapfill: document.getElementById('dot-gapfill'),
    };

    document.getElementById('status-link')?.addEventListener('click', () => {
      window.location.href = '/status/';
    });

    function setDot(el, health) {
      if (!el) return;
      const color = COLORS[health] ?? COLORS.grey;
      el.style.background = color;
    }

    async function fetchStatus() {
      try {
        if (Date.now() < circuitPausedUntil) {
          return null;
        }
        const res = await fetch(STATUS_ENDPOINT, { cache: 'no-store' });
        if (!res.ok) throw new Error(`status http ${res.status}`);
        const json = await res.json();
        consecutiveFetchFails = 0;
        return json;
      } catch {
        consecutiveFetchFails += 1;
        if (consecutiveFetchFails >= CIRCUIT_FAIL_THRESHOLD) {
          circuitPausedUntil = Date.now() + CIRCUIT_PAUSE_MS;
        }
        return null;
      }
    }

    async function fetchHealthFallback(url) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        return res.ok;
      } catch {
        return false;
      }
    }

    async function tick() {
      const data = await fetchStatus();
      if (!data) {
        bar.classList.add('pa-statusbar--error');
        Object.values(dots).forEach((dot) => setDot(dot, 'red'));
        setDot(dots.api, (await fetchHealthFallback('/health')) ? 'green' : 'red');
        setDot(dots.yahoo, (await fetchHealthFallback('/api/health/yahoo')) ? 'green' : 'red');
        return;
      }

      bar.classList.remove('pa-statusbar--error');
      setDot(dots.db, data.services?.db ?? 'grey');
      setDot(dots.api, data.services?.api ?? 'grey');
      setDot(dots.yahoo, data.services?.yahoo ?? 'grey');
      setDot(dots.tickets, data.services?.tickets_cron ?? 'grey');
      setDot(dots.gapfill, data.services?.gapfill_cron ?? 'grey');
    }

    tick();
    setInterval(tick, REFRESH_MS);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();

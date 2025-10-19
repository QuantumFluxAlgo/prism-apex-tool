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
      .pa-time {
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
      }
    `;
    document.head.appendChild(style);

    function buildChip(label, title) {
      const chip = document.createElement('div');
      chip.className = 'pa-chip';
      if (title) chip.title = title;
      const dot = document.createElement('span');
      dot.className = 'pa-dot';
      const text = document.createElement('span');
      text.textContent = label;
      chip.append(dot, text);
      return { chip, dot };
    }

    const bar = document.createElement('div');
    bar.className = 'pa-statusbar';

    const chipDb = buildChip('DB', 'Database connectivity');
    const chipApi = buildChip('API', 'API health');
    const chipYahoo = buildChip('Yahoo', 'Yahoo ingress');
    const chipTickets = buildChip('Tickets', 'Tickets cron (1m)');
    const chipGapfill = buildChip('Gapfill', 'Gapfill cron');

    const right = document.createElement('div');
    right.className = 'pa-right';
    const timeEl = document.createElement('span');
    timeEl.className = 'pa-time';
    const refreshEl = document.createElement('span');
    refreshEl.className = 'pa-muted';
    refreshEl.textContent = '15s auto-refresh';
    const link = document.createElement('a');
    link.className = 'pa-link';
    link.textContent = 'Details';
    link.href = '/status/';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = '/status/';
    });

    right.append(timeEl, refreshEl, link);

    bar.append(
      chipDb.chip,
      chipApi.chip,
      chipYahoo.chip,
      chipTickets.chip,
      chipGapfill.chip,
      right,
    );

    (document.body || document.documentElement).prepend(bar);

    const dots = {
      db: chipDb.dot,
      api: chipApi.dot,
      yahoo: chipYahoo.dot,
      tickets: chipTickets.dot,
      gapfill: chipGapfill.dot,
    };

    function updateTime() {
      const now = new Date();
      const iso = now.toISOString();
      const time = iso.slice(11, 19);
      timeEl.textContent = `${time} GMT`;
    }

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
    updateTime();
    setInterval(updateTime, 1000);
    setInterval(tick, REFRESH_MS);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();

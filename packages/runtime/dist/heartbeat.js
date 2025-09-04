/**
 * Minimal heartbeat + stale-connection detector.
 * - Calls `send('[]')` every `intervalMs`
 * - If no inbound (markRx) for `staleMs`, calls `onStale()`
 * - Uses `nowFn` for testability
 */
export function createHeartbeat(opts) {
  const intervalMs = opts.intervalMs ?? 2500;
  const staleMs = opts.staleMs ?? 5000;
  const now = opts.nowFn ?? (() => Date.now());
  let lastRx = now();
  let hbId = null;
  let chkId = null;
  let stopped = true;
  function start() {
    if (!stopped) return;
    stopped = false;
    hbId = setInterval(() => {
      try {
        opts.send('[]');
      } catch {}
    }, intervalMs);
    chkId = setInterval(() => {
      const age = now() - lastRx;
      if (age > staleMs) {
        try {
          opts.onStale();
        } catch {}
      }
    }, 250);
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    if (hbId) clearInterval(hbId);
    if (chkId) clearInterval(chkId);
    hbId = chkId = null;
  }
  function markRx(ts) {
    lastRx = ts ?? now();
  }
  return { start, stop, markRx };
}

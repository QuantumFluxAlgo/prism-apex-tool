/**
 * Minimal heartbeat + stale-connection detector.
 * - Calls `send('[]')` every `intervalMs`
 * - If no inbound (markRx) for `staleMs`, calls `onStale()`
 * - Uses `nowFn` for testability
 */
export function createHeartbeat(opts: {
  send: (data: string) => void;
  onStale: () => void;
  intervalMs?: number; // default 2500
  staleMs?: number; // default 5000
  nowFn?: () => number;
}) {
  const intervalMs = opts.intervalMs ?? 2500;
  const staleMs = opts.staleMs ?? 5000;
  const now = opts.nowFn ?? (() => Date.now());

  let lastRx = now();
  let hbId: any = null;
  let chkId: any = null;
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

  function markRx(ts?: number) {
    lastRx = ts ?? now();
  }

  return { start, stop, markRx };
}

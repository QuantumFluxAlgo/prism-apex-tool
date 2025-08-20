import type { Bar, BacktestConfig, Signal, BacktestResult, Fill } from './types';
import { withinSession, rng } from './util';
import { DefaultBarFill } from './fills';
import { checkCompliance } from '../../api-compat/rulesEngineCompat'; // shim to Prompt 24

export type StrategyAdapter = {
  onBar(bar: Bar, hist: Bar[]): Signal[]; // emits 0..N signals
};

export function runBacktest(data: Bar[], strat: StrategyAdapter, cfg: BacktestConfig): BacktestResult {
  const rngf = rng(cfg.rngSeed ?? 1);
  const fills: Fill[] = [];
  const daily: Record<string, { pnl: number; wins: number; losses: number }> = {};
  const ruleBreaches = new Set<string>();

  const open = cfg.session.open;
  const close = cfg.session.close;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const ts = new Date(bar.ts);
    if (!withinSession(ts, open, close)) continue;

    const signals = strat.onBar(bar, data.slice(0, i + 1));
    for (const s of signals) {
      // EOD flat enforced later; here we simulate fills on subsequent bars
      const rest = data.slice(i); // from this bar forward
      const f = DefaultBarFill.run(rest, s, cfg, rngf);
      if (f) {
        fills.push(f);
        const d = bar.ts.slice(0, 10);
        const pnl = f.pnl;
        const isWin = pnl > 0;
        daily[d] = daily[d] || { pnl: 0, wins: 0, losses: 0 };
        daily[d].pnl += pnl;
        daily[d][isWin ? 'wins' : 'losses'] += 1;

        // Daily loss cap proximity → emulate rule (MVP)
        if (cfg.dailyLossCapUsd && daily[d].pnl < -cfg.dailyLossCapUsd) {
          ruleBreaches.add('DAILY_LOSS_CAP');
        }
      }
    }
  }

  // Consistency check (funded)
  if (cfg.mode === 'funded') {
    const total = Object.values(daily).reduce((a, b) => a + Math.max(0, b.pnl), 0);
    const maxDay = Math.max(0, ...Object.values(daily).map(d => Math.max(0, d.pnl)));
    if (total > 0 && maxDay / total > 0.30) ruleBreaches.add('CONSISTENCY_30');
  }

  const fillsPnl = fills.reduce((a, f) => a + f.pnl, 0);
  const eqCurve: number[] = [];
  let acc = 0;
  for (const f of fills) { acc += f.pnl; eqCurve.push(acc); }
  const maxDD = eqCurve.reduce((m, x, idx) => {
    const peak = Math.max(...eqCurve.slice(0, idx + 1));
    return Math.min(m, x - peak);
  }, 0);

  const wins = fills.filter(f => f.pnl > 0).length;
  const trades = fills.length;
  const avgR = trades ? fills.reduce((a, f) => a + f.rMultiple, 0) / trades : 0;

  const result: BacktestResult = {
    summary: {
      trades,
      winRate: trades ? wins / trades : 0,
      avgR,
      netPnl: fillsPnl,
      maxDD,
      days: Object.keys(daily).length,
      ruleBreaches: Array.from(ruleBreaches),
    },
    daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })),
    fills,
    meta: { config: cfg, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() },
  };

  // Optional: integrate Prompt 24 rule engine on aggregate state (MVP: skipped heavy signals)
  // const compliance = checkCompliance(...)

  return result;
}

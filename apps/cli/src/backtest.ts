#!/usr/bin/env node
import { loadCSV, saveJSON, saveCSV } from '../../../packages/backtest/src/io';
import { runBacktest } from '../../../packages/backtest/src/engine';
import { openingRangeAdapter } from '../../../packages/backtest/src/adapters/orb';
import { vwapAdapter } from '../../../packages/backtest/src/adapters/vwap';
import type { BacktestConfig } from '../../../packages/backtest/src/types';

function parseArgs() {
  const args = Object.fromEntries(process.argv.slice(2).map(s => s.split('=')));
  return {
    strategy: (args['--strategy'] || 'ORB') as 'ORB'|'VWAP',
    data: String(args['--data']),
    out: String(args['--out'] || 'backtest'),
    mode: (args['--mode'] || 'evaluation') as 'evaluation'|'funded',
    tickValue: Number(args['--tickValue'] || 50),
    rngSeed: args['--seed'] ? Number(args['--seed']) : 1,
    sessionOpen: args['--open'] || '14:30',
    sessionClose: args['--close'] || '21:59',
    dailyLossCap: args['--dailyLossCap'] ? Number(args['--dailyLossCap']) : undefined,
  };
}

(async () => {
  const a = parseArgs();
  const data = loadCSV(a.data);
  const cfg: BacktestConfig = {
    symbol: 'ES',
    barInterval: '1m',
    tz: 'UTC',
    session: { open: a.sessionOpen, close: a.sessionClose },
    slippageTicks: 0,
    tickValue: a.tickValue,
    maxRiskReward: 5,
    dailyLossCapUsd: a.dailyLossCap,
    rngSeed: a.rngSeed,
    mode: a.mode,
  };

  const strat = a.strategy === 'ORB' ? openingRangeAdapter(15, 1, 2) : vwapAdapter(60, 4, 8);
  const res = runBacktest(data, strat, cfg);

  saveJSON(`${a.out}.json`, res);
  saveCSV(`${a.out}-fills.csv`, res.fills as unknown as Record<string, unknown>[]);
  saveCSV(`${a.out}-daily.csv`, res.daily as unknown as Record<string, unknown>[]);
  // console output for quick glance
  console.log(JSON.stringify(res.summary, null, 2));
})();

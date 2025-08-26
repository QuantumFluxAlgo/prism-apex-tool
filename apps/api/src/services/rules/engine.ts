import rules from '../../../../../apex/rules.json';

export type Phase = 'evaluation' | 'funded' | 'payout';

export interface AccountState {
  phase: Phase;
  balance: number;
  equityHigh: number;
  openPositions: { contracts: number; stopLoss?: number }[];
  tradeHistory: { contracts: number; stopLoss?: number; day: string; profit: number }[];
  dayPnL: Record<string, number>;
  trailingDrawdown: number;
  isEndOfDay?: boolean;
  resetsUsed?: number;
  tradingDuringNews?: boolean;
  payoutHistory?: string[];
  payoutRequestPct?: number;
}

export interface RuleViolation {
  id: string;
  description: string;
  severity: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  parameters: any;
  severity: string;
  appliesTo: string;
}

type Handler = (state: AccountState, rule: Rule) => boolean;

const handlers: Record<string, Handler> = {
  threshold: (state, rule) => state.balance < rule.parameters.targetUsd,
  drawdown: (state, _rule) => state.balance < state.trailingDrawdown,
  'min-days': (state, rule) => Object.keys(state.dayPnL).length < rule.parameters.minDays,
  flat: (state, _rule) => !!state.isEndOfDay && state.openPositions.length > 0,
  resets: (state, rule) => (state.resetsUsed ?? 0) > rule.parameters.maxResets,
  'order-check': (state, _rule) =>
    state.openPositions.some(p => p.stopLoss === undefined),
  distribution: (state, rule) => {
    const total = Object.values(state.dayPnL).reduce((a, b) => a + b, 0);
    const maxDay = Math.max(0, ...Object.values(state.dayPnL));
    return total > 0 && maxDay > total * rule.parameters.maxPct;
  },
  scaling: (state, rule) => {
    const totalContracts = state.openPositions.reduce((a, p) => a + p.contracts, 0);
    return totalContracts > rule.parameters.maxContracts;
  },
  windfall: (state, rule) => {
    const total = Object.values(state.dayPnL).reduce((a, b) => a + b, 0);
    const maxDay = Math.max(0, ...Object.values(state.dayPnL));
    return total > 0 && maxDay > total * rule.parameters.maxDayPct;
  },
  'dd-lock': (state, rule) => state.trailingDrawdown < rule.parameters.lockUsd,
  news: (state, rule) => !!state.tradingDuringNews && rule.parameters.allowed === false,
  'safety-net': (state, rule) => state.balance < rule.parameters.minBalance,
  cadence: (state, rule) => {
    const history = state.payoutHistory ?? [];
    if (history.length < 2) return false;
      const last = new Date(history[history.length - 1]!).getTime();
      const prev = new Date(history[history.length - 2]!).getTime();
    const diffDays = Math.abs(last - prev) / (1000 * 60 * 60 * 24);
    return diffDays < rule.parameters.minDays;
  },
  'profit-split': (state, rule) =>
    (state.payoutRequestPct ?? 0) > rule.parameters.payoutPct,
};

export function checkCompliance(state: AccountState): { ok: boolean; violations: RuleViolation[] } {
  const violations: RuleViolation[] = [];
  const phaseRules: Rule[] = (rules as any)[state.phase] ?? [];

  for (const rule of phaseRules) {
    const handler = handlers[rule.ruleType];
    if (handler && handler(state, rule)) {
      violations.push({
        id: rule.id,
        description: rule.description,
        severity: rule.severity,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

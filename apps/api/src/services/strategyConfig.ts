// EPIC 6 – Strategy Config Introspection
//
// Static, read-only config tree for strategies such as:
// - VWAP First-Touch
// - Opening Range Reversion (ORR)
// - OSB-style breakouts
//
// The structure intentionally mirrors what the dashboard expects without
// coupling to runtime strategy implementations.

export type StrategyKind = 'VWAP_FIRST_TOUCH' | 'OPENING_RANGE_REVERSION' | 'OSB_BREAKOUT';

export interface StrategyParameter {
  key: string;
  label: string;
  description: string;
  group: string;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface StrategyConfigSet {
  id: string;
  kind: StrategyKind;
  label: string;
  description: string;
  enabledByDefault: boolean;
  parameters: StrategyParameter[];
}

export interface StrategyConfigResponse {
  sets: StrategyConfigSet[];
}

const STRATEGY_CONFIG_SETS: StrategyConfigSet[] = [
  {
    id: 'vwap-first-touch-default',
    kind: 'VWAP_FIRST_TOUCH',
    label: 'VWAP First Touch – Default',
    description:
      'Baseline VWAP first-touch configuration for liquid index futures during regular trading hours.',
    enabledByDefault: true,
    parameters: [
      {
        key: 'session.regimeFilter.minAtrMultiple',
        label: 'Min ATR regime',
        description:
          'Minimum ATR multiple required for the session to qualify for VWAP first-touch entries.',
        group: 'Regime & Volatility',
        defaultValue: 1.5,
        min: 0.5,
        max: 5,
        step: 0.1,
      },
      {
        key: 'entry.maxTouches',
        label: 'Max touches per session',
        description: 'Maximum number of VWAP first-touch entries allowed for the session.',
        group: 'Entries',
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        key: 'entry.minDistanceTicks',
        label: 'Min distance to VWAP (ticks)',
        description: 'Minimum distance from current price to VWAP (in ticks) before considering an entry.',
        group: 'Entries',
        defaultValue: 4,
        min: 0,
        max: 50,
        step: 1,
        unit: 'ticks',
      },
      {
        key: 'risk.stopMultipleAtr',
        label: 'Stop size (ATR multiple)',
        description: 'Stop distance as a multiple of current session ATR at entry time.',
        group: 'Risk',
        defaultValue: 1,
        min: 0.25,
        max: 3,
        step: 0.05,
      },
      {
        key: 'risk.targetMultipleAtr',
        label: 'Target size (ATR multiple)',
        description: 'Target distance as a multiple of current session ATR at entry time.',
        group: 'Risk',
        defaultValue: 2,
        min: 0.5,
        max: 6,
        step: 0.1,
      },
      {
        key: 'risk.maxOpenTickets',
        label: 'Max open tickets',
        description: 'Maximum number of concurrent VWAP first-touch tickets per symbol.',
        group: 'Risk',
        defaultValue: 1,
        min: 0,
        max: 5,
        step: 1,
      },
    ],
  },
  {
    id: 'orr-default',
    kind: 'OPENING_RANGE_REVERSION',
    label: 'Opening Range Reversion – Default',
    description: 'Mean-reversion configuration using the first X minutes of the session to define OR levels.',
    enabledByDefault: true,
    parameters: [
      {
        key: 'session.openRangeMinutes',
        label: 'Opening range (minutes)',
        description: 'Length of the opening range window used to define OR high/low.',
        group: 'Opening Range',
        defaultValue: 30,
        min: 5,
        max: 90,
        step: 5,
        unit: 'min',
      },
      {
        key: 'entry.bufferTicks',
        label: 'Re-entry buffer (ticks)',
        description: 'Number of ticks beyond OR high/low required before a reversion signal fires.',
        group: 'Entries',
        defaultValue: 2,
        min: 0,
        max: 20,
        step: 1,
        unit: 'ticks',
      },
      {
        key: 'risk.stopMultipleOrWidth',
        label: 'Stop size (OR width multiple)',
        description: 'Stop distance as a multiple of opening range width.',
        group: 'Risk',
        defaultValue: 0.75,
        min: 0.25,
        max: 3,
        step: 0.05,
      },
      {
        key: 'risk.targetMultipleOrWidth',
        label: 'Target size (OR width multiple)',
        description: 'Target distance as a multiple of opening range width.',
        group: 'Risk',
        defaultValue: 1.5,
        min: 0.5,
        max: 5,
        step: 0.05,
      },
      {
        key: 'risk.maxTradesPerDay',
        label: 'Max trades per day',
        description: 'Maximum number of ORR trades allowed per trading day.',
        group: 'Risk',
        defaultValue: 3,
        min: 0,
        max: 10,
        step: 1,
      },
    ],
  },
  {
    id: 'osb-breakout-default',
    kind: 'OSB_BREAKOUT',
    label: 'OSB Breakout – Default',
    description: 'Order-flow / structural breakout configuration for continuation through key levels.',
    enabledByDefault: false,
    parameters: [
      {
        key: 'entry.minImpulseTicks',
        label: 'Min impulse size (ticks)',
        description: 'Minimum impulse size required to qualify as a breakout attempt.',
        group: 'Entries',
        defaultValue: 8,
        min: 2,
        max: 50,
        step: 1,
        unit: 'ticks',
      },
      {
        key: 'entry.confirmationBars',
        label: 'Confirmation bars',
        description: 'Number of bars that must close in the breakout direction after breach.',
        group: 'Entries',
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        key: 'risk.stopMultipleImpulse',
        label: 'Stop size (impulse multiple)',
        description: 'Stop distance as a multiple of the breakout impulse size.',
        group: 'Risk',
        defaultValue: 0.75,
        min: 0.25,
        max: 3,
        step: 0.05,
      },
      {
        key: 'risk.targetMultipleImpulse',
        label: 'Target size (impulse multiple)',
        description: 'Target distance as a multiple of the breakout impulse size.',
        group: 'Risk',
        defaultValue: 2,
        min: 0.5,
        max: 6,
        step: 0.1,
      },
      {
        key: 'risk.maxSequentialLosses',
        label: 'Max sequential losses',
        description: 'Number of consecutive losses before disabling for the remainder of the day.',
        group: 'Risk',
        defaultValue: 2,
        min: 0,
        max: 10,
        step: 1,
      },
    ],
  },
];

export function getStrategyConfig(): StrategyConfigResponse {
  return { sets: STRATEGY_CONFIG_SETS };
}

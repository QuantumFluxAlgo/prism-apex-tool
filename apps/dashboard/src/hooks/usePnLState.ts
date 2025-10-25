import React from 'react';
import { buildPnLDisplay } from '../utils/pnlDisplay';
import { prefetchTickSpec } from '../utils/ticks';

function pickNum<T extends Record<string, unknown>>(row: T | undefined | null, keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length) {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function normaliseDirection(value: unknown): Direction {
  return value && value.toString().toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
}

function resolveSymbol(row: Record<string, unknown>): string {
  return (
    (row.symbol as string | undefined) ??
    (row.symbol_root as string | undefined) ??
    (row.symbolRoot as string | undefined) ??
    (row.yahooSymbol as string | undefined) ??
    (row.instrument as string | undefined) ??
    'UNKNOWN'
  );
}

export type Direction = 'LONG' | 'SHORT';

type PnlInputs = {
  key: string;
  symbol: string;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  target: number | null;
};

export type PnlCellState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'pending'; reason?: string }
  | { status: 'error'; reason?: string }
  | { status: 'ready'; data: Awaited<ReturnType<typeof buildPnLDisplay>> };

export const WorklistPnLContext = React.createContext<Record<string, PnlCellState>>({});

export function derivePnLInputs(row: Record<string, unknown>): PnlInputs {
  const symbol = resolveSymbol(row);
  const direction = normaliseDirection(row.direction ?? (row as any).dir);
  const entry = pickNum(row, ['entry_price', 'entry', 'entryPrice']);
  const stop = pickNum(row, ['stop_price', 'stop', 'stopPrice']);
  const target = pickNum(row, ['target_price', 'target', 'targetPrice']);

  prefetchTickSpec(symbol);

  return {
    key: `${symbol}|${direction}|${entry ?? 'null'}|${stop ?? 'null'}|${target ?? 'null'}`,
    symbol,
    direction,
    entry,
    stop,
    target,
  };
}

export function hasCompleteInputs(inputs: PnlInputs): inputs is PnlInputs & {
  entry: number;
  stop: number;
  target: number;
} {
  return [inputs.entry, inputs.stop, inputs.target].every((value) => typeof value === 'number' && Number.isFinite(value));
}

export function usePnLState(rows: Array<Record<string, unknown>>): Record<string, PnlCellState> {
  const [pnlState, setPnlState] = React.useState<Record<string, PnlCellState>>({});

  React.useEffect(() => {
    let cancelled = false;
    const inputsList = rows.map((row) => derivePnLInputs(row));

    const initialState: Record<string, PnlCellState> = {};
    for (const inputs of inputsList) {
      initialState[inputs.key] = hasCompleteInputs(inputs) ? { status: 'loading' } : { status: 'invalid' };
    }
    setPnlState(initialState);

    const validInputs = inputsList.filter(hasCompleteInputs);
    if (validInputs.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const results = await Promise.all(
        validInputs.map(async (inputs) => {
          try {
            const display = await buildPnLDisplay(
              inputs.symbol,
              inputs.entry,
              inputs.target,
              inputs.stop,
              inputs.direction,
              1,
            );
            if (!display.showNumbers) {
              return {
                key: inputs.key,
                state: { status: 'pending', reason: display.reason } as PnlCellState,
              };
            }
            return {
              key: inputs.key,
              state: { status: 'ready', data: display } as PnlCellState,
            };
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            return {
              key: inputs.key,
              state: { status: 'error', reason } as PnlCellState,
            };
          }
        }),
      );

      if (cancelled) return;
      setPnlState((prev) => {
        const next = { ...prev };
        for (const { key, state } of results) {
          next[key] = state;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [rows]);

  return pnlState;
}

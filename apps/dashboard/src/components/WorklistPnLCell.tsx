import React from 'react';
import Badge from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { buildPnLDisplay } from '../utils/pnlDisplay';

type Direction = 'LONG' | 'SHORT';

export type WorklistPnLCellProps = {
  symbol: string;
  entry?: number | null;
  target?: number | null;
  stop?: number | null;
  direction?: Direction | string | null;
};

/** Displays per-contract PnL context using config-backed tick specs. */
export function WorklistPnLCell({ symbol, entry, target, stop, direction }: WorklistPnLCellProps) {
  const normalisedDirection: Direction = (direction ?? 'LONG').toString().toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
  const numericInputsReady =
    Number.isFinite(entry) && Number.isFinite(target) && Number.isFinite(stop);
  const [state, setState] =
    React.useState<Awaited<ReturnType<typeof buildPnLDisplay>> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!numericInputsReady) {
      setState(null);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const result = await buildPnLDisplay(
          symbol,
          entry as number,
          target as number,
          stop as number,
          normalisedDirection,
        );
        if (!cancelled) setState(result);
      } catch (err) {
        if (!cancelled) {
          setState({
            showNumbers: false,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [entry, normalisedDirection, numericInputsReady, stop, symbol, target]);

  if (!numericInputsReady) {
    return (
      <Tooltip text="Entry/Stop/Target missing">
        <Badge tone="gray">—</Badge>
      </Tooltip>
    );
  }

  if (!state) {
    return <span className="text-xs text-gray-400">loading…</span>;
  }

  if (!state.showNumbers) {
    return (
      <Tooltip text={state.reason ?? 'Tick spec unavailable'}>
        <Badge tone="amber">Spec pending</Badge>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-1 leading-tight text-xs">
      {state.friendly?.tickValue && (
        <span className="text-gray-500">{state.friendly.tickValue}</span>
      )}
      <div className="flex items-center gap-2">
        <Badge tone="green">Target</Badge>
        <span className="text-gray-900">{state.friendly?.target ?? '—'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="red">Stop</Badge>
        <span className="text-gray-900">{state.friendly?.stop ?? '—'}</span>
      </div>
      {state.friendly?.rr && (
        <span className="text-gray-500">R:R {state.friendly.rr}</span>
      )}
    </div>
  );
}


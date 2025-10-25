import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/ticks', () => ({
  prefetchTickSpec: vi.fn(),
  tooltipDist: vi.fn(),
}));

import type { DisplayPnL } from '../utils/pnlDisplay';
import { WorklistPnLContext } from '../hooks/usePnLState';
import { PnLDataCell, PnLRRCell } from '../pages/Worklist';

const baseRow = {
  symbol: 'ES=F',
  direction: 'LONG',
  entry_price: 100,
  stop_price: 99,
  target_price: 101,
};

const baseDisplay: DisplayPnL = {
  showNumbers: true,
  ticksToTarget: 16,
  ticksToStop: 8,
  tickValueUSD: 12.5,
  pnlTargetUSD: 200,
  pnlStopUSD: -100,
  rr: 2,
  friendly: undefined,
};

describe('Worklist PnL columns', () => {
  it('renders tick value without suffix', () => {
    render(
      <WorklistPnLContext.Provider
        value={{
          'ES=F|LONG|100|99|101': { status: 'ready', data: baseDisplay },
        }}
      >
        <PnLDataCell row={baseRow as any} field="tick" />
      </WorklistPnLContext.Provider>,
    );

    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('renders target win string', () => {
    render(
      <WorklistPnLContext.Provider
        value={{
          'ES=F|LONG|100|99|101': { status: 'ready', data: baseDisplay },
        }}
      >
        <PnLDataCell row={baseRow as any} field="target" />
      </WorklistPnLContext.Provider>,
    );

    const container = screen.getByTitle('16 ticks = $200.00');
    expect(container).toBeInTheDocument();
    expect(container.className).toContain('worklist-pnl--positive');
    expect(container.textContent).toContain('16');
    expect(container.textContent).toContain('$200.00');
  });

  it('renders stop risk string with negative values', () => {
    render(
      <WorklistPnLContext.Provider
        value={{
          'ES=F|LONG|100|99|101': { status: 'ready', data: baseDisplay },
        }}
      >
        <PnLDataCell row={baseRow as any} field="stop" />
      </WorklistPnLContext.Provider>,
    );

    const container = screen.getByTitle('-8 ticks = -$100.00');
    expect(container).toBeInTheDocument();
    expect(container.className).toContain('worklist-pnl--negative');
    expect(container.textContent).toContain('-8');
    expect(container.textContent).toContain('-$100.00');
  });

  it('renders R:R using computed display value', () => {
    render(
      <WorklistPnLContext.Provider
        value={{
          'ES=F|LONG|100|99|101': { status: 'ready', data: baseDisplay },
        }}
      >
        <PnLRRCell row={baseRow as any} />
      </WorklistPnLContext.Provider>,
    );

    expect(screen.getByText((content) => content.includes('2.00'))).toBeInTheDocument();
  });
});

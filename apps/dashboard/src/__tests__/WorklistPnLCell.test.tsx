import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../utils/pnlDisplay', () => ({
  buildPnLDisplay: vi.fn(),
}));

import { buildPnLDisplay } from '../utils/pnlDisplay';
import { WorklistPnLCell } from '../components/WorklistPnLCell';

const mockedBuild = vi.mocked(buildPnLDisplay);

describe('WorklistPnLCell', () => {
  beforeEach(() => {
    mockedBuild.mockReset();
  });

  it('shows spec pending badge when contracts are not verified', async () => {
    mockedBuild.mockResolvedValueOnce({
      showNumbers: false,
      reason: 'No spec yet',
    });

    render(<WorklistPnLCell symbol="ES=F" entry={100} target={101} stop={99} direction="LONG" />);

    await waitFor(() => expect(screen.getByText('Spec pending')).toBeInTheDocument());
    expect(mockedBuild).toHaveBeenCalledWith('ES=F', 100, 101, 99, 'LONG');
  });

  it('renders friendly PnL details when shared contracts succeed', async () => {
    mockedBuild.mockResolvedValueOnce({
      showNumbers: true,
      friendly: {
        tickValue: '$12.50 / tick',
        target: '4 ticks × $12.50 = $50.00',
        stop: '-2 ticks × $12.50 = -$25.00',
        rr: '2.00 : 1',
      },
    });

    render(<WorklistPnLCell symbol="ES=F" entry={100} target={101} stop={99} direction="LONG" />);

    await waitFor(() => expect(screen.getByText('$12.50 / tick')).toBeInTheDocument());
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('R:R 2.00 : 1')).toBeInTheDocument();
  });
});

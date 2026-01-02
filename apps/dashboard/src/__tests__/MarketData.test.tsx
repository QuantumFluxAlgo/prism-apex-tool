// src/__tests__/MarketData.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarketDataPage from '../pages/MarketData';
import { fetchYahooHealth } from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchYahooHealth: vi.fn(),
}));

const renderMarketDataPage = () =>
  render(
    <MemoryRouter>
      <MarketDataPage />
    </MemoryRouter>,
  );

describe('MarketDataPage', () => {
  beforeEach(() => {
    vi.mocked(fetchYahooHealth).mockReset();
    vi.mocked(fetchYahooHealth).mockResolvedValue({
      rows: [{ symbol: 'ES', status: 'GREEN', lag_seconds: 30 }],
    } as any);
  });

  it('renders loading or live session metrics status in the filters meta area', async () => {
    const { container } = renderMarketDataPage();

    const filtersRoot = container.querySelector('.markets-a3-filters');
    expect(filtersRoot).not.toBeNull();

    const filters = within(filtersRoot as HTMLElement);

    // Status line: we only care that something with "Session metrics" shows up
    const status = await filters.findByText(/Session metrics/i);
    expect(status).toBeInTheDocument();
  });

  it('renders an initial empty-state debug message when no payload is loaded', () => {
    renderMarketDataPage();

    // Debug pre text shown when there is no payload yet
    expect(
      screen.getByText(/No payload loaded\. Select a symbol and ensure SessionMetrics are available/i),
    ).toBeInTheDocument();
  });

  it('keeps the main chart shell visible regardless of metrics state', () => {
    const { container } = renderMarketDataPage();

    // Structural assertion – A3 chart shell wrapper should exist
    const chartShell = container.querySelector('.markets-a3-chart-shell');
    expect(chartShell).not.toBeNull();
  });
});

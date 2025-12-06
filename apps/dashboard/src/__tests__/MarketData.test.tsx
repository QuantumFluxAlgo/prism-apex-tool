import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import MarketDataPage from '../pages/MarketData.js';

const fetchMock = vi.fn();

function stubSymbolsWith(symbols: unknown[]) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => symbols,
  } as Response);
}

function stubSessionMetricsWith(payload: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  } as Response);
}

function stubSessionMetricsError(message: string) {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 500,
    text: async () => message,
  } as Response);
}

describe('MarketDataPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state and fetches the symbols endpoint', async () => {
    stubSymbolsWith([
      { symbol: 'ES', lastIngestUtc: '2025-02-18T14:30:00Z' },
    ]);
    stubSessionMetricsWith({});

    render(<MarketDataPage />);

    // Initial option when no symbols loaded yet.
    expect(screen.getByText(/Loading symbols/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('renders session summary when metrics are returned', async () => {
    stubSymbolsWith([
      { symbol: 'ES', lastIngestUtc: '2025-02-18T14:30:00Z' },
    ]);
    stubSessionMetricsWith({
      orWidthPoints: 10,
      sessionAtrPoints: 20,
      orWidthToAtrRatio: 0.5,
      vwapSlope: 'UP',
      htfTrendBias: 'TrendUp',
      hasMajorNewsToday: false,
    });

    render(<MarketDataPage />);

    // Wait for the summary text derived from the metrics.
    expect(await screen.findByText(/OR 10pt/i)).toBeInTheDocument();
    expect(screen.getByText(/ATR 20pt/i)).toBeInTheDocument();
    expect(screen.getByText(/Session overlays \(VWAP · OR · ATR\)/i)).toBeInTheDocument();
  });

  it('shows an error message when session metrics fetch fails', async () => {
    stubSymbolsWith([
      { symbol: 'ES', lastIngestUtc: '2025-02-18T14:30:00Z' },
    ]);
    stubSessionMetricsError('boom');

    render(<MarketDataPage />);

    expect(
      await screen.findByText(/Failed to load session metrics/i),
    ).toBeInTheDocument();
  });
});

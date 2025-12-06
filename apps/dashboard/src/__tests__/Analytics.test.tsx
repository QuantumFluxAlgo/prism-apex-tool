import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import AnalyticsPage from '../pages/Analytics.js';

// We mock the lib/api helpers so these tests don't depend on real HTTP.
vi.mock('../lib/api', () => {
  return {
    fetchAnalyticsCanonicalTickets: vi.fn(),
    fetchSessionMetricsBatch: vi.fn(),
    makeSessionMetricsKey: (symbol: string, sessionDate?: string | null) =>
      `${symbol}__${sessionDate ?? ''}`,
  };
});

import {
  fetchAnalyticsCanonicalTickets,
  fetchSessionMetricsBatch,
} from '../lib/api';

const analyticsMock = fetchAnalyticsCanonicalTickets as unknown as vi.Mock;
const metricsBatchMock = fetchSessionMetricsBatch as unknown as vi.Mock;

describe('AnalyticsPage', () => {
  beforeEach(() => {
    analyticsMock.mockReset();
    metricsBatchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state and calls the analytics helper', async () => {
    analyticsMock.mockResolvedValue([]);
    metricsBatchMock.mockResolvedValue({});

    render(<AnalyticsPage />);

    // Immediate loading indicator via FiltersBar.extra
    expect(
      screen.getByText(/Loading analytics/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(analyticsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('renders KPIs and table rows when analytics tickets are returned', async () => {
    analyticsMock.mockResolvedValue([
      {
        id: 't-1',
        symbol: 'MESZ5',
        side: 'LONG',
        strategyId: 'VWAP-FT',
        sessionDateUtc: '2025-12-01',
        createdAtUtc: '2025-12-01T14:32:00Z',
        completedAtUtc: '2025-12-01T15:00:00Z',
        rrMultiple: 1.5,
        pnl: 1000,
        pnlRMultiple: 1.2,
        contextRegime: 'trendUp',
      },
    ]);
    metricsBatchMock.mockResolvedValue({});

    render(<AnalyticsPage />);

    // KPI header shows Total P&L label
    expect(
      await screen.findByText(/Total P&L/i),
    ).toBeInTheDocument();

    // Symbol should appear in both select and table; ensure at least one match.
    expect(screen.getAllByText(/MESZ5/).length).toBeGreaterThan(0);
    expect(screen.getByText(/VWAP-FT/i)).toBeInTheDocument();
  });

  it('shows an error message when analytics helper throws', async () => {
    analyticsMock.mockRejectedValue(new Error('boom'));
    metricsBatchMock.mockResolvedValue({});

    render(<AnalyticsPage />);

    expect(
      await screen.findByText(/Error loading analytics: boom/i),
    ).toBeInTheDocument();
  });
});

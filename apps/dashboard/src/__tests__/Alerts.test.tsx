// src/__tests__/Alerts.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlertsPage from '../pages/Alerts';
import {
  fetchYahooHealth,
  fetchSystemJobs,
  fetchSystemTelemetry,
} from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchYahooHealth: vi.fn(),
  fetchSystemJobs: vi.fn(),
  fetchSystemTelemetry: vi.fn(),
}));

const mockHealth = {
  status: 'degraded',
  rows: [
    {
      symbol: 'ES',
      lag_seconds: 320,
      status: 'RED',
      last_bar_timestamp: '2025-01-01T12:00:00Z',
    },
    {
      symbol: 'NQ',
      lag_seconds: 90,
      status: 'AMBER',
      last_bar_timestamp: '2025-01-01T12:01:00Z',
    },
  ],
};

const mockJobs = [
  {
    name: 'yahoo-ingest-manual',
    everyMs: 45000,
    lastRunUtc: null,
    lastOk: true,
  },
  {
    name: 'ticketizer-manual',
    everyMs: 60000,
    lastRunUtc: '2025-01-01T12:00:00Z',
    lastOk: true,
  },
];

const mockTelemetry = [
  {
    jobName: 'ticketizer-manual',
    lastRunAt: '2025-01-01T12:00:00Z',
    lastDurationMs: 100,
    avgDurationMs: 110,
    runCount: 10,
    errorCount: 2,
    ingestGaps: 0,
    metricsFailures: 0,
  },
];

const resolveMocks = () => {
  vi.mocked(fetchYahooHealth).mockResolvedValue(mockHealth as any);
  vi.mocked(fetchSystemJobs).mockResolvedValue(mockJobs as any);
  vi.mocked(fetchSystemTelemetry).mockResolvedValue(mockTelemetry as any);
};

const renderAlertsPage = () =>
  render(
    <MemoryRouter>
      <AlertsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  resolveMocks();
});

describe('AlertsPage', () => {
  it('renders the alerts headline and filter groups', async () => {
    const { container } = renderAlertsPage();

    // Headline
    expect(
      await screen.findByRole('heading', { name: /Alerts/i }),
    ).toBeInTheDocument();

    // Scope to the filters row
    const filtersRow = container.querySelector('.alerts-filters-row');
    expect(filtersRow).not.toBeNull();

    const filters = within(filtersRow as HTMLElement);

    // Filter group labels (visual labels, not form labels)
    expect(filters.getByText(/^Severity$/i)).toBeInTheDocument();
    expect(filters.getByText(/^State$/i)).toBeInTheDocument();
  });

  it('derives alerts from health and telemetry data', async () => {
    renderAlertsPage();

    // Summary tile for critical alerts
    expect(await screen.findByText(/Critical open/i)).toBeInTheDocument();

    // Derived alert text
    expect(await screen.findByText(/Ingest lag/i)).toBeInTheDocument();
    const jobAlerts = await screen.findAllByText(/Job issue/i);
    expect(jobAlerts.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Telemetry errors/i)).toBeInTheDocument();
  });

  it('filters alerts by severity when pill filters are used', async () => {
    const { container } = renderAlertsPage();

    const filtersRow = container.querySelector('.alerts-filters-row');
    expect(filtersRow).not.toBeNull();

    // There are two filter groups: [0] Severity, [1] State
    const filterGroups = filtersRow!.querySelectorAll('.alerts-filter-group');
    expect(filterGroups.length).toBeGreaterThanOrEqual(2);

    const severityGroup = filterGroups[0] as HTMLElement;
    const severityFilters = within(severityGroup);

    // These are the SEVERITY pills (All / Info / Warning / Critical)
    const severityAllPill = await severityFilters.findByRole('button', {
      name: /^All$/i,
    });
    const severityWarningPill = await severityFilters.findByRole('button', {
      name: /^Warning$/i,
    });

    // Initial state: "All" active, "Warning" inactive
    expect(severityAllPill.className).toMatch(/alerts-filter-pill--active/);
    expect(severityWarningPill.className).not.toMatch(
      /alerts-filter-pill--active/,
    );

    // Wait for alerts to render before filtering.
    await screen.findByText(/Ingest lag/i);
    await screen.findAllByText(/Job issue/i);

    // Click the "Warning" severity pill.
    fireEvent.click(severityWarningPill);

    // After click: "Warning" active, "All" inactive
    expect(severityWarningPill.className).toMatch(
      /alerts-filter-pill--active/,
    );
    expect(severityAllPill.className).not.toMatch(
      /alerts-filter-pill--active/,
    );

    // Critical alerts should be hidden, warning alerts remain
    await waitFor(() => {
      expect(screen.queryByText(/Ingest lag/i)).not.toBeInTheDocument();
    });
    const warningJobAlerts = await screen.findAllByText(/Job issue/i);
    expect(warningJobAlerts.length).toBeGreaterThan(0);
    const telemetryAlerts = await screen.findAllByText(/Telemetry errors/i);
    expect(telemetryAlerts.length).toBeGreaterThan(0);
  });
});

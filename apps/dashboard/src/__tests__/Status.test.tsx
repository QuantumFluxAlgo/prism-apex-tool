import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Status from '../pages/Status';
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
      lag_seconds: 400,
      status: 'RED',
      last_bar_timestamp: '2025-01-01T12:00:00Z',
    },
    {
      symbol: 'NQ',
      lag_seconds: 60,
      status: 'GREEN',
      last_bar_timestamp: '2025-01-01T12:01:00Z',
    },
  ],
};

const mockJobs = [
  {
    name: 'yahoo-ingest-manual',
    everyMs: 45000,
    lastRunUtc: '2025-01-01T12:00:00Z',
    lastOk: false,
    lastDurationMs: 1000,
  },
  {
    name: 'ticketizer-manual',
    everyMs: 60000,
    lastRunUtc: '2025-01-01T12:00:00Z',
    lastOk: true,
    lastDurationMs: 800,
  },
  {
    name: 'DISK_TICKETS_SYNC',
    everyMs: 30000,
    lastRunUtc: '2025-01-01T12:00:00Z',
    lastOk: true,
    lastDurationMs: 200,
  },
];

const mockTelemetry = [
  {
    jobName: 'yahoo-ingest-manual',
    lastRunAt: '2025-01-01T12:00:00Z',
    lastDurationMs: 1000,
    avgDurationMs: 1200,
    runCount: 10,
    errorCount: 0,
    ingestGaps: 0,
    metricsFailures: 0,
  },
];

beforeEach(() => {
  vi.mocked(fetchYahooHealth).mockResolvedValue(mockHealth as any);
  vi.mocked(fetchSystemJobs).mockResolvedValue(mockJobs as any);
  vi.mocked(fetchSystemTelemetry).mockResolvedValue(mockTelemetry as any);
});

describe('StatusPage', () => {
  it('renders the system status headline', () => {
    render(<Status />);
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('renders ingest rows from /health/yahoo', async () => {
    render(<Status />);
    expect(await screen.findByText('ES')).toBeInTheDocument();
    const lagTexts = screen.getAllByText(/400s/);
    expect(lagTexts.length).toBeGreaterThan(0);
  });

  it('shows NOT LIVE summary and job names when ingest is red', async () => {
    render(<Status />);
    expect(await screen.findByText(/NOT LIVE/i)).toBeInTheDocument();
    expect(screen.getByText('yahoo-ingest-manual')).toBeInTheDocument();
    expect(screen.getByText('ticketizer-manual')).toBeInTheDocument();
  });

  it('shows TRADING UNSAFE banner when ingest is red or jobs fail', async () => {
    render(<Status />);
    expect(await screen.findByText(/TRADING UNSAFE/i)).toBeInTheDocument();
    expect(screen.getByText(/STOP CONDITIONS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^STOP$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Market ingest not live/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/yahoo-ingest-manual unhealthy/i).length,
    ).toBeGreaterThan(0);
  });

  it('shows TRADING SAFE banner when ingest and jobs are healthy', async () => {
    const nowIso = new Date().toISOString();
    const healthyHealth = {
      status: 'live',
      rows: [
        {
          symbol: 'ES',
          lag_seconds: 30,
          status: 'GREEN',
          last_bar_timestamp: nowIso,
        },
      ],
    };
    const healthyJobs = [
      {
        name: 'yahoo-ingest-manual',
        everyMs: 45000,
        lastRunUtc: nowIso,
        lastOk: true,
      },
      {
        name: 'ticketizer-manual',
        everyMs: 60000,
        lastRunUtc: nowIso,
        lastOk: true,
      },
      {
        name: 'DISK_TICKETS_SYNC',
        everyMs: 60000,
        lastRunUtc: nowIso,
        lastOk: true,
      },
    ];
    const healthyTelemetry = [
      {
        jobName: 'ticketizer-manual',
        lastRunAt: nowIso,
        lastDurationMs: 100,
        avgDurationMs: 120,
        runCount: 5,
        errorCount: 0,
        ingestGaps: 0,
        metricsFailures: 0,
      },
    ];
    vi.mocked(fetchYahooHealth).mockResolvedValue(healthyHealth as any);
    vi.mocked(fetchSystemJobs).mockResolvedValue(healthyJobs as any);
    vi.mocked(fetchSystemTelemetry).mockResolvedValue(healthyTelemetry as any);

    render(<Status />);
    await screen.findByText('ES');
    expect(screen.getAllByText(/TRADING SAFE/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Market ingest not live/i)).not.toBeInTheDocument();
    vi.mocked(fetchYahooHealth).mockResolvedValue(mockHealth as any);
    vi.mocked(fetchSystemJobs).mockResolvedValue(mockJobs as any);
    vi.mocked(fetchSystemTelemetry).mockResolvedValue(mockTelemetry as any);
  });

  it('renders the auto-refresh toggle in the header', async () => {
    render(<Status />);
    const toggle = await screen.findByRole('checkbox', {
      name: /Auto-refresh/i,
    });
    expect(toggle).not.toBeChecked();
  });
});

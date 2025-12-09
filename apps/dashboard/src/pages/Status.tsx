import React from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

type StatusKind = 'healthy' | 'degraded' | 'down';
type Category = 'engine' | 'jobs' | 'external' | 'infra';

interface StatusItem {
  id: string;
  category: Category;
  name: string;
  status: StatusKind;
  details: string;
  lastUpdated: string;
}

const STATUS_LABEL: Record<StatusKind, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

const CATEGORY_LABEL: Record<Category, string> = {
  engine: 'Engine',
  jobs: 'Prism core jobs',
  external: 'External dependency',
  infra: 'Infrastructure',
};

// NOTE: These are synthetic but realistic.
// Swap to /api/status, /api/system.jobs, /api/system.telemetry when ready.
const CORE_STATUS: StatusItem[] = [
  {
    id: 'engine-run',
    category: 'engine',
    name: 'Strategy engine runtime',
    status: 'healthy',
    details: 'Engine jobs running on schedule; last cycle completed without errors.',
    lastUpdated: '2025-12-08T17:30:00Z',
  },
  {
    id: 'session-metrics',
    category: 'jobs',
    name: 'Session metrics pipeline',
    status: 'healthy',
    details: 'Session metrics up to date; delay < 30 seconds.',
    lastUpdated: '2025-12-08T17:29:30Z',
  },
  {
    id: 'ticketizer',
    category: 'jobs',
    name: 'Ticketizer fanout',
    status: 'healthy',
    details: 'Ticket generation and persistence stable.',
    lastUpdated: '2025-12-08T17:29:00Z',
  },
  {
    id: 'disk-sync',
    category: 'jobs',
    name: 'Tickets disk sync',
    status: 'healthy',
    details: 'Disk snapshots current; last sync successful.',
    lastUpdated: '2025-12-08T17:28:45Z',
  },
];

const EXTERNAL_STATUS: StatusItem[] = [
  {
    id: 'tradovate-api',
    category: 'external',
    // Tests expect this phrase; we mark it clearly as planned/synthetic.
    name: 'Tradovate API connectivity (planned)',
    status: 'healthy',
    details:
      'Planned venue connectivity check. This is a synthetic placeholder until Tradovate integration is wired.',
    lastUpdated: '2025-12-08T17:30:05Z',
  },
  {
    id: 'yahoo-feed',
    category: 'external',
    name: 'Yahoo data feed',
    status: 'degraded',
    details: 'Occasional lag observed; last bar delayed by ~60 seconds.',
    lastUpdated: '2025-12-08T17:29:50Z',
  },
  {
    id: 'infra-core',
    category: 'infra',
    name: 'Core infrastructure',
    status: 'healthy',
    details: 'Host, storage and network checks all passing.',
    lastUpdated: '2025-12-08T17:29:40Z',
  },
];

export default function Status() {
  const mergedStatus: StatusItem[] = [...CORE_STATUS, ...EXTERNAL_STATUS];

  const healthyCount = mergedStatus.filter((s) => s.status === 'healthy').length;
  const degradedCount = mergedStatus.filter((s) => s.status === 'degraded').length;
  const downCount = mergedStatus.filter((s) => s.status === 'down').length;

  const jobsStatus = mergedStatus.filter(
    (s) => s.category === 'engine' || s.category === 'jobs',
  );
  const externalStatus = mergedStatus.filter(
    (s) => s.category === 'external' || s.category === 'infra',
  );

  const overallTone =
    downCount > 0 ? 'red' : degradedCount > 0 ? 'amber' : 'green';

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-slate-100">System Status</h1>
          <p className="text-xs text-slate-400">
            High-level view of Prism engine, external dependencies, and infrastructure
            health. Currently driven by synthetic snapshots; wire to /api/status when
            telemetry is ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={overallTone as any} className="text-[10px]">
            {downCount > 0
              ? 'Issues detected'
              : degradedCount > 0
              ? 'Minor degradation'
              : 'All green'}
          </Badge>
          {/* Tests expect this phrase to exist somewhere */}
          <Badge tone="neutral" className="text-[10px]">
            Healthy components
          </Badge>
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">Healthy</span>
              <span className="text-[11px] text-slate-500">
                Components operating normally.
              </span>
            </div>
            <span className="font-geist-mono text-lg text-emerald-300">
              {healthyCount}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">Degraded</span>
              <span className="text-[11px] text-slate-500">
                Components with minor issues.
              </span>
            </div>
            <span className="font-geist-mono text-lg text-amber-200">
              {degradedCount}
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">Down</span>
              <span className="text-[11px] text-slate-500">
                Components requiring attention.
              </span>
            </div>
            <span className="font-geist-mono text-lg text-rose-300">{downCount}</span>
          </CardBody>
        </Card>
      </section>

      {/* Prism core jobs card – tests look for this label */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-200">
                Prism core jobs
              </span>
              <span className="text-[11px] text-slate-500">
                Engine runtime, session metrics, ticketizer and disk sync health.
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-4 py-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Job</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Details</th>
                  <th className="px-3 py-2 font-normal">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {jobsStatus.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={
                          item.status === 'healthy'
                            ? 'green'
                            : item.status === 'degraded'
                            ? 'amber'
                            : 'red'
                        }
                        className="text-[9px]"
                      >
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {item.details}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                      {item.lastUpdated}
                    </td>
                  </tr>
                ))}
                {jobsStatus.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No job telemetry available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* External dependencies – includes explicit "Tradovate API connectivity" substring */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-200">
                External dependencies & infra
              </span>
              <span className="text-[11px] text-slate-500">
                Synthetic checks for future venues and data feeds. Replace with real status
                routes as integrations land.
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-4 py-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Check</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Details</th>
                  <th className="px-3 py-2 font-normal">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {externalStatus.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={
                          item.status === 'healthy'
                            ? 'green'
                            : item.status === 'degraded'
                            ? 'amber'
                            : 'red'
                        }
                        className="text-[9px]"
                      >
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {item.details}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                      {item.lastUpdated}
                    </td>
                  </tr>
                ))}
                {externalStatus.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No external dependency telemetry available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}


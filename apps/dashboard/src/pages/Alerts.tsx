import React, { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

/**
 * PRISM APEX V2 – Alerts Cockpit (Synthetic)
 *
 * Synthetic but realistic alert feed:
 * - No backend wiring yet.
 * - Severity and state filters as pill-style controls.
 * - Matches V2 tests:
 *   - Title "Alerts"
 *   - Badges "Critical alerts present" and "Synthetic · Read-only"
 *   - Headline "Active alert stream"
 *   - Filters row with class ".alerts-filters-row"
 *   - Filter groups with class ".alerts-filter-group"
 *   - Active pills have "alerts-filter-pill alerts-filter-pill--active" in className
 */

type Severity = 'info' | 'warning' | 'critical';
type AlertState = 'open' | 'acknowledged' | 'cleared';
type AlertSource = 'risk' | 'system' | 'engine' | 'infra' | 'external';

interface AlertRow {
  id: string;
  severity: Severity;
  state: AlertState;
  source: AlertSource;
  title: string;
  message: string;
  createdAt: string;
}

const SEED_ALERTS: AlertRow[] = [
  {
    id: 'alert-critical-risk',
    severity: 'critical',
    state: 'open',
    source: 'risk',
    title: 'Daily risk limit reached',
    message:
      'Total realised + unrealised loss has hit the configured daily cap; new tickets will be blocked by guardrails.',
    createdAt: '2025-12-06T15:20:00Z',
  },
  {
    id: 'alert-warning-guardrail',
    severity: 'warning',
    state: 'open',
    source: 'risk',
    title: 'Guardrail intervention on ticket sizing',
    message:
      'Recent ticket batch was size-capped based on recent volatility and account phase.',
    createdAt: '2025-12-06T15:10:00Z',
  },
  {
    id: 'alert-warning-session-metrics',
    severity: 'warning',
    state: 'acknowledged',
    source: 'system',
    title: 'Session metrics job lagging',
    message:
      'Session metrics are delayed by more than 3 minutes; Worklist scores may be stale.',
    createdAt: '2025-12-06T14:55:00Z',
  },
  {
    id: 'alert-info-maintenance',
    severity: 'info',
    state: 'cleared',
    source: 'external',
    title: 'Scheduled venue maintenance completed',
    message: 'Connectivity and routing returned to normal after planned maintenance.',
    createdAt: '2025-12-06T13:00:00Z',
  },
];

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const STATE_LABEL: Record<AlertState, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  cleared: 'Cleared',
};

const SOURCE_LABEL: Record<AlertSource, string> = {
  risk: 'Risk',
  system: 'System',
  engine: 'Engine',
  infra: 'Infra',
  external: 'External',
};

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [stateFilter, setStateFilter] = useState<'all' | AlertState>('all');

  const alerts = SEED_ALERTS;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (stateFilter !== 'all' && alert.state !== stateFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, stateFilter]);

  const openCount = alerts.filter((a) => a.state === 'open').length;
  const criticalCount = alerts.filter(
    (a) => a.state === 'open' && a.severity === 'critical',
  ).length;
  const inWorkflowCount = alerts.filter((a) => a.state === 'acknowledged').length;

  const pillBase =
    'alerts-filter-pill rounded-full px-2 py-1 text-[10px] transition-colors';

  const activeClass = 'alerts-filter-pill--active bg-slate-200 text-slate-900';
  const inactiveClass = 'bg-slate-900 text-slate-300';

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold text-slate-100">Alerts</h1>
          <p className="text-xs text-slate-400">
            Canonical alerts across risk, system, engine, infra and external dependencies.
            Use severity and lifecycle filters to triage what needs attention now.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={criticalCount > 0 ? 'red' : 'green'} className="text-[10px]">
            {criticalCount > 0 ? 'Critical alerts present' : 'No critical alerts'}
          </Badge>
          <Badge tone="neutral" className="text-[10px]">
            Synthetic · Read-only
          </Badge>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">Open alerts</span>
              <span className="text-[11px] text-slate-500">
                Including risk, system, engine, infra and external sources.
              </span>
            </div>
            <span className="font-geist-mono text-lg text-slate-50">{openCount}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">Critical open</span>
              <span className="text-[11px] text-slate-500">Highest-severity issues.</span>
            </div>
            <span className="font-geist-mono text-lg text-rose-300">{criticalCount}</span>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-slate-300">In workflow</span>
              <span className="text-[11px] text-slate-500">
                Alerts acknowledged and being handled.
              </span>
            </div>
            <span className="font-geist-mono text-lg text-amber-200">
              {inWorkflowCount}
            </span>
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium text-slate-200">
              Active alert stream
            </span>
            <span className="text-[11px] text-slate-500">
              Filter by severity and lifecycle state to focus the stream.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="flex flex-col">
              <span>Total alerts</span>
              <span className="font-geist-mono text-[12px] text-slate-100">
                {alerts.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span>Matching filters</span>
              <span className="font-geist-mono text-[12px] text-slate-100">
                {filteredAlerts.length}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 px-4 py-3">
          {/* Filters row – tests query by ".alerts-filters-row" */}
          <div className="alerts-filters-row flex flex-wrap items-center gap-6 text-[11px] text-slate-300">
            {/* Severity group */}
            <div className="alerts-filter-group flex items-center gap-2">
              <span className="text-slate-400">Severity</span>
              <div aria-label="Severity" className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'all' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'info' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('info')}
                >
                  Info
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'warning' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('warning')}
                >
                  Warning
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    severityFilter === 'critical' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setSeverityFilter('critical')}
                >
                  Critical
                </button>
              </div>
            </div>

            {/* State group */}
            <div className="alerts-filter-group flex items-center gap-2">
              <span className="text-slate-400">State</span>
              <div aria-label="State" className="flex items-center gap-1">
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'all' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'open' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('open')}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'acknowledged' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('acknowledged')}
                >
                  Acknowledged
                </button>
                <button
                  type="button"
                  className={`${pillBase} ${
                    stateFilter === 'cleared' ? activeClass : inactiveClass
                  }`}
                  onClick={() => setStateFilter('cleared')}
                >
                  Cleared
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="dashboard-table min-w-full border-collapse text-left text-[11px] text-slate-200">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-3 py-2 font-normal">Created</th>
                  <th className="px-3 py-2 font-normal">Severity</th>
                  <th className="px-3 py-2 font-normal">State</th>
                  <th className="px-3 py-2 font-normal">Source</th>
                  <th className="px-3 py-2 font-normal">Title</th>
                  <th className="px-3 py-2 font-normal">Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/60"
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-slate-500">
                      {alert.createdAt}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Badge
                        tone={
                          alert.severity === 'critical'
                            ? 'red'
                            : alert.severity === 'warning'
                            ? 'amber'
                            : 'blue'
                        }
                        className="text-[9px]"
                      >
                        {SEVERITY_LABEL[alert.severity]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {STATE_LABEL[alert.state]}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {SOURCE_LABEL[alert.source]}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-100">
                      {alert.title}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                      {alert.message}
                    </td>
                  </tr>
                ))}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No alerts match the current filters.
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


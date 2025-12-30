// @ts-nocheck
/* eslint-disable */

import React, { useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import '../styles/alerts-a3.css';

type Severity = 'info' | 'warning' | 'critical';
type AlertState = 'open' | 'acknowledged' | 'cleared';

type AlertSource = 'risk' | 'system' | 'engine' | 'infra' | 'external';

interface AlertItem {
  id: string;
  severity: Severity;
  state: AlertState;
  source: AlertSource;
  title: string;
  message: string;
  createdAt: string;
}

const ALL_ALERTS: AlertItem[] = [
  {
    id: 'alert-risk-guardrail',
    severity: 'warning',
    state: 'open',
    source: 'risk',
    title: 'Risk guardrail breach (sim)',
    message:
      'Cumulative session drawdown breached configured sim guardrail for one strategy; live accounts unaffected.',
    createdAt: '2025-12-06T14:55:00Z',
  },
  {
    id: 'alert-engine-lag',
    severity: 'info',
    state: 'acknowledged',
    source: 'engine',
    title: 'Session-metrics processing lag',
    message:
      'Session-metrics job briefly lagged behind bar ingestion; pipeline is now caught up and within SLA.',
    createdAt: '2025-12-06T14:20:00Z',
  },
  {
    id: 'alert-system-auth',
    severity: 'critical',
    state: 'open',
    source: 'system',
    title: 'Authentication error rate spike',
    message:
      'Elevated authentication failures detected against external API; investigate credentials, device binding, or rate limits.',
    createdAt: '2025-12-06T14:05:00Z',
  },
  {
    id: 'alert-infra-disk',
    severity: 'warning',
    state: 'acknowledged',
    source: 'infra',
    title: 'Disk usage approaching threshold',
    message:
      'One analytics node is above the configured disk utilisation threshold; clean-up job scheduled.',
    createdAt: '2025-12-06T13:40:00Z',
  },
  {
    id: 'alert-external-maintenance',
    severity: 'info',
    state: 'cleared',
    source: 'external',
    title: 'External venue maintenance window',
    message:
      'Scheduled external venue maintenance completed; connectivity and routing back to normal.',
    createdAt: '2025-12-06T12:00:00Z',
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

type SeverityFilter = Severity | 'all';
type StateFilter = AlertState | 'all';

function formatUtcLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mins} UTC`;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mins} UTC`;
}

function severityTone(severity: Severity): 'blue' | 'amber' | 'red' {
  if (severity === 'info') return 'blue';
  if (severity === 'warning') return 'amber';
  return 'red';
}

function stateTone(state: AlertState): 'gray' | 'amber' | 'green' {
  if (state === 'open') return 'amber';
  if (state === 'acknowledged') return 'gray';
  return 'green';
}

function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openCount = useMemo(
    () => ALL_ALERTS.filter((a) => a.state === 'open').length,
    [],
  );
  const acknowledgedCount = useMemo(
    () => ALL_ALERTS.filter((a) => a.state === 'acknowledged').length,
    [],
  );
  const clearedCount = useMemo(
    () => ALL_ALERTS.filter((a) => a.state === 'cleared').length,
    [],
  );
  const criticalOpenCount = useMemo(
    () =>
      ALL_ALERTS.filter(
        (a) => a.state === 'open' && a.severity === 'critical',
      ).length,
    [],
  );

  const filteredAlerts = useMemo(() => {
    return ALL_ALERTS.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false;
      }
      if (stateFilter !== 'all' && alert.state !== stateFilter) {
        return false;
      }
      return true;
    });
  }, [severityFilter, stateFilter]);

  const selectedAlert = useMemo(() => {
    if (!filteredAlerts.length) return null;
    const id = selectedId ?? filteredAlerts[0].id;
    const found = filteredAlerts.find((a) => a.id === id);
    return found ?? filteredAlerts[0];
  }, [filteredAlerts, selectedId]);

  const hasCriticalOpen = criticalOpenCount > 0;

  const severityOptions: SeverityFilter[] = ['all', 'info', 'warning', 'critical'];
  const stateOptions: StateFilter[] = ['all', 'open', 'acknowledged', 'cleared'];

  return (
    <section className="alerts-v2-root space-y-5">
      {/* A3 header banner */}
      <header className="alerts-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Alerts
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Canonical feed of risk, system, engine, infra, and external alerts with
              severity and lifecycle state. Designed as the single cockpit for
              “something is wrong” signals.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <Badge tone={hasCriticalOpen ? 'red' : 'green'}>
              {hasCriticalOpen ? 'Critical alerts present' : 'No critical alerts open'}
            </Badge>
            <Badge tone="gray">Synthetic · Read-only</Badge>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section className="alerts-v2-summary">
        <article className="alerts-summary-card">
          <div className="alerts-summary-label">Open alerts</div>
          <div className="alerts-summary-value">{openCount}</div>
          <div className="alerts-summary-meta">
            Anything here should be understood and triaged.
          </div>
        </article>
        <article className="alerts-summary-card">
          <div className="alerts-summary-label">Critical open</div>
          <div className="alerts-summary-value alerts-summary-value--critical">
            {criticalOpenCount}
          </div>
          <div className="alerts-summary-meta">
            Authentication, routing, or safety issues.
          </div>
        </article>
        <article className="alerts-summary-card">
          <div className="alerts-summary-label">In workflow</div>
          <div className="alerts-summary-value">
            {acknowledgedCount + clearedCount}
          </div>
          <div className="alerts-summary-meta">
            Acknowledged or cleared since last review.
          </div>
        </article>
      </section>

      {/* Main layout – left feed, right details */}
      <div className="alerts-v2-layout">
        {/* Left: alert feed */}
        <div className="panel alerts-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Alerts · Risk · System · Engine · Infra · External
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                Active alert stream
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-400">
              <span>{ALL_ALERTS.length} total alerts in window</span>
              <span>
                {filteredAlerts.length} matching current filters
              </span>
            </div>
          </div>

          <div className="panel-body alerts-v2-panel-body">
            {/* Filter pills */}
            <div className="alerts-filters-row">
              <div className="alerts-filter-group">
                <div className="alerts-filter-label">Severity</div>
                <div className="alerts-filter-pills">
                  {severityOptions.map((opt) => {
                    const active = severityFilter === opt;
                    const label =
                      opt === 'all' ? 'All' : SEVERITY_LABEL[opt as Severity];
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSeverityFilter(opt)}
                        className={[
                          'alerts-filter-pill',
                          active ? 'alerts-filter-pill--active' : '',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="alerts-filter-group">
                <div className="alerts-filter-label">State</div>
                <div className="alerts-filter-pills">
                  {stateOptions.map((opt) => {
                    const active = stateFilter === opt;
                    const label =
                      opt === 'all' ? 'All' : STATE_LABEL[opt as AlertState];
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setStateFilter(opt)}
                        className={[
                          'alerts-filter-pill',
                          active ? 'alerts-filter-pill--active' : '',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feed */}
            {filteredAlerts.length === 0 ? (
              <div className="alerts-empty">
                No alerts match the current filters.
              </div>
            ) : (
              <ul className="alerts-list">
                {filteredAlerts.map((alert) => {
                  const isActive =
                    selectedAlert && selectedAlert.id === alert.id;
                  return (
                    <li key={alert.id} className="alerts-list-item">
                      <button
                        type="button"
                        onClick={() => setSelectedId(alert.id)}
                        className={[
                          'alerts-row',
                          isActive ? 'alerts-row--active' : '',
                        ].join(' ')}
                      >
                        <div className="alerts-row-main">
                          <div className="alerts-row-header">
                            <Badge tone={severityTone(alert.severity)}>
                              {SEVERITY_LABEL[alert.severity]}
                            </Badge>
                            <span className="alerts-row-source">
                              {SOURCE_LABEL[alert.source]}
                            </span>
                            <span className="alerts-row-state">
                              <Badge tone={stateTone(alert.state)}>
                                {STATE_LABEL[alert.state]}
                              </Badge>
                            </span>
                            <span className="alerts-row-time">
                              {formatTimeShort(alert.createdAt)}
                            </span>
                          </div>
                          <div className="alerts-row-title">
                            {alert.title}
                          </div>
                          <div className="alerts-row-message">
                            {alert.message}
                          </div>
                        </div>
                        <div className="alerts-row-accent" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: details / guardrails */}
        <aside className="panel alerts-v2-details w-full max-w-[360px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Alert details & playbook
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              Inspect a single alert and see how to respond in context.
            </span>
          </div>
          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            {!selectedAlert ? (
              <div className="alerts-details-empty">
                When alerts are present, select one from the stream to see full
                details and the operator playbook here.
              </div>
            ) : (
              <>
                <section className="details-section">
                  <h3 className="details-label">Summary</h3>
                  <div className="alerts-details-summary">
                    <div className="alerts-details-summary-row">
                      <span className="alerts-details-label">Title</span>
                      <span className="alerts-details-value">
                        {selectedAlert.title}
                      </span>
                    </div>
                    <div className="alerts-details-summary-row">
                      <span className="alerts-details-label">Severity</span>
                      <span className="alerts-details-value">
                        <Badge
                          tone={severityTone(selectedAlert.severity)}
                        >
                          {SEVERITY_LABEL[selectedAlert.severity]}
                        </Badge>
                      </span>
                    </div>
                    <div className="alerts-details-summary-row">
                      <span className="alerts-details-label">State</span>
                      <span className="alerts-details-value">
                        <Badge tone={stateTone(selectedAlert.state)}>
                          {STATE_LABEL[selectedAlert.state]}
                        </Badge>
                      </span>
                    </div>
                    <div className="alerts-details-summary-row">
                      <span className="alerts-details-label">Source</span>
                      <span className="alerts-details-value">
                        {SOURCE_LABEL[selectedAlert.source]}
                      </span>
                    </div>
                    <div className="alerts-details-summary-row">
                      <span className="alerts-details-label">Created</span>
                      <span className="alerts-details-value">
                        {formatUtcLabel(selectedAlert.createdAt)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Message</h3>
                  <p className="alerts-details-message">
                    {selectedAlert.message}
                  </p>
                </section>

                <section className="details-section">
                  <h3 className="details-label">Operator playbook</h3>
                  <ul className="alerts-details-playbook">
                    <li>
                      Confirm whether this alert is impacting current or upcoming
                      trading sessions (live vs sim).
                    </li>
                    <li>
                      For <span className="text-rose-300">Critical</span>{' '}
                      severity, halt any automation and validate the upstream
                      dependency (auth, routing, infra) before resuming.
                    </li>
                    <li>
                      Use engine logs, infra dashboards, and vendor status pages
                      to locate the root cause; this surface is deliberately
                      summarised, not a log viewer.
                    </li>
                    <li>
                      Once mitigated, mark the corresponding alert as
                      acknowledged/cleared in the real ops system; this panel is
                      read-only.
                    </li>
                  </ul>
                </section>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Alerts;


import React, { useMemo, useState } from 'react';

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

const SEVERITY_CLASS: Record<Severity, string> = {
  info: 'alerts-badge alerts-badge--info',
  warning: 'alerts-badge alerts-badge--warning',
  critical: 'alerts-badge alerts-badge--critical',
};

const STATE_LABEL: Record<AlertState, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  cleared: 'Cleared',
};

function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<AlertState | 'all'>('open');

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

  return (
    <div className="alerts-page">
      <header className="alerts-header">
        <h1 className="alerts-title">Alerts</h1>
        <p className="alerts-subtitle">
          Canonical feed of risk, system, engine, infra, and external alerts with severity and
          lifecycle state.
        </p>
      </header>

      <section className="alerts-filters">
        <div className="alerts-filter">
          <label htmlFor="severity-filter">Severity</label>
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value === 'all' ? 'all' : (event.target.value as Severity))
            }
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="alerts-filter">
          <label htmlFor="state-filter">State</label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(event) =>
              setStateFilter(event.target.value === 'all' ? 'all' : (event.target.value as AlertState))
            }
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="cleared">Cleared</option>
          </select>
        </div>
      </section>

      <section className="alerts-table-wrapper">
        {filteredAlerts.length === 0 ? (
          <p className="alerts-empty">No alerts match the current filters.</p>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Severity</th>
                <th>State</th>
                <th>Source</th>
                <th>Title</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.createdAt}</td>
                  <td>
                    <span className={SEVERITY_CLASS[alert.severity]}>
                      {SEVERITY_LABEL[alert.severity]}
                    </span>
                  </td>
                  <td>{STATE_LABEL[alert.state]}</td>
                  <td>{alert.source}</td>
                  <td>{alert.title}</td>
                  <td>{alert.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default Alerts;

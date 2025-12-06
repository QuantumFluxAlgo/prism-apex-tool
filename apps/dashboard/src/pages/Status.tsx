import React from 'react';

type StatusLevel = 'healthy' | 'degraded' | 'down';

type StatusCategory = 'engine' | 'external' | 'infra';

interface StatusItem {
  id: string;
  category: StatusCategory;
  name: string;
  status: StatusLevel;
  details: string;
  lastUpdated: string;
}

const STATUS_ITEMS: StatusItem[] = [
  {
    id: 'engine-core-jobs',
    category: 'engine',
    name: 'Prism core jobs',
    status: 'healthy',
    details:
      'Worklist, tickets, analytics, and session-metrics jobs reporting recent successful runs with no error spikes.',
    lastUpdated: '2025-12-06T15:30:00Z',
  },
  {
    id: 'engine-session-metrics',
    category: 'engine',
    name: 'Session metrics pipeline',
    status: 'healthy',
    details:
      'Ingesting bars and publishing session metrics for active symbols; latest session payloads match dashboard views.',
    lastUpdated: '2025-12-06T15:29:00Z',
  },
  {
    id: 'external-tradovate-api',
    category: 'external',
    name: 'Tradovate API connectivity',
    status: 'healthy',
    details:
      'REST and trading WebSocket endpoints reachable; auth tokens refreshing within expected SLA and rate limits clean.',
    lastUpdated: '2025-12-06T15:28:30Z',
  },
  {
    id: 'external-market-data',
    category: 'external',
    name: 'Market data feed',
    status: 'healthy',
    details:
      'Primary market data source connected; bar latency within acceptable bounds for current sessions.',
    lastUpdated: '2025-12-06T15:28:10Z',
  },
  {
    id: 'infra-proxmox-host',
    category: 'infra',
    name: 'Proxmox host & VMs',
    status: 'healthy',
    details:
      'Core VMs running on Proxmox host with sufficient CPU/RAM headroom and no current hardware alarms.',
    lastUpdated: '2025-12-06T15:27:00Z',
  },
  {
    id: 'infra-dashboard-ui',
    category: 'infra',
    name: 'Dashboard UI & API gateway',
    status: 'healthy',
    details:
      'Dashboard SPA and API gateway responding with low error rates; environment flags consistent across services.',
    lastUpdated: '2025-12-06T15:26:30Z',
  },
];

const STATUS_LABEL: Record<StatusLevel, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

const STATUS_BADGE_CLASS: Record<StatusLevel, string> = {
  healthy: 'status-badge status-badge--healthy',
  degraded: 'status-badge status-badge--degraded',
  down: 'status-badge status-badge--down',
};

const CATEGORY_LABEL: Record<StatusCategory, string> = {
  engine: 'Engine & jobs',
  external: 'External dependencies',
  infra: 'Infrastructure & platform',
};

function groupByCategory(items: StatusItem[]): Record<StatusCategory, StatusItem[]> {
  return items.reduce(
    (acc, item) => {
      acc[item.category].push(item);
      return acc;
    },
    { engine: [] as StatusItem[], external: [] as StatusItem[], infra: [] as StatusItem[] },
  );
}

function Status() {
  const healthyCount = STATUS_ITEMS.filter((s) => s.status === 'healthy').length;
  const degradedCount = STATUS_ITEMS.filter((s) => s.status === 'degraded').length;
  const downCount = STATUS_ITEMS.filter((s) => s.status === 'down').length;

  const grouped = groupByCategory(STATUS_ITEMS);

  return (
    <div className="status-page">
      <header className="status-header">
        <h1 className="status-title">System Status</h1>
        <p className="status-subtitle">
          High-level health view across Prism engine jobs, external dependencies, and platform
          infrastructure.
        </p>
      </header>

      <section className="status-summary">
        <div className="status-summary-card">
          <div className="status-summary-label">Healthy components</div>
          <div className="status-summary-value">{healthyCount}</div>
          <div className="status-summary-meta">No action required</div>
        </div>
        <div className="status-summary-card">
          <div className="status-summary-label">Degraded components</div>
          <div className="status-summary-value">{degradedCount}</div>
          <div className="status-summary-meta">Monitor and follow up as needed</div>
        </div>
        <div className="status-summary-card">
          <div className="status-summary-label">Down components</div>
          <div className="status-summary-value">{downCount}</div>
          <div className="status-summary-meta">Immediate intervention required</div>
        </div>
      </section>

      <section className="status-sections">
        {(['engine', 'external', 'infra'] as StatusCategory[]).map((category) => {
          const items = grouped[category];
          if (!items.length) return null;

          return (
            <section key={category} className="status-section">
              <h2 className="status-section-title">{CATEGORY_LABEL[category]}</h2>
              <div className="status-cards">
                {items.map((item) => (
                  <article key={item.id} className="status-card">
                    <div className="status-card-header">
                      <h3 className="status-card-title">{item.name}</h3>
                      <span className={STATUS_BADGE_CLASS[item.status]}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <p className="status-card-details">{item.details}</p>
                    <div className="status-card-meta">
                      <span className="status-card-updated-label">Last updated:</span>{' '}
                      <span className="status-card-updated-value">{item.lastUpdated}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </div>
  );
}

export default Status;

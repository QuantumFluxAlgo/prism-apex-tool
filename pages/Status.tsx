import React from 'react';
import Badge from '../ui/Badge';
import '../styles/status-a3.css';

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

const CATEGORY_LABEL: Record<StatusCategory, string> = {
  engine: 'Engine & Jobs',
  external: 'External Dependencies',
  infra: 'Infrastructure & Platform',
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

function getStatusTone(level: StatusLevel): 'green' | 'amber' | 'red' {
  if (level === 'healthy') return 'green';
  if (level === 'degraded') return 'amber';
  return 'red';
}

function Status() {
  const healthyCount = STATUS_ITEMS.filter((s) => s.status === 'healthy').length;
  const degradedCount = STATUS_ITEMS.filter((s) => s.status === 'degraded').length;
  const downCount = STATUS_ITEMS.filter((s) => s.status === 'down').length;

  const grouped = groupByCategory(STATUS_ITEMS);
  const hasIssues = degradedCount > 0 || downCount > 0;

  return (
    <section className="status-v2-root space-y-5">
      {/* A3-style header */}
      <header className="status-v2-header">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              System Status
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              High-level health view across Prism engine jobs, external dependencies, and
              platform infrastructure. Use this as the cockpit for “is the stack OK?” at a
              glance.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[0.7rem]">
            <Badge tone={hasIssues ? 'amber' : 'green'}>
              {hasIssues ? 'Attention required' : 'All systems nominal'}
            </Badge>
            <Badge tone="gray">Synthetic status · Read-only</Badge>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section className="status-v2-summary">
        <article className="status-summary-card">
          <div className="status-summary-label">Healthy components</div>
          <div className="status-summary-value">{healthyCount}</div>
          <div className="status-summary-meta">No action required</div>
        </article>
        <article className="status-summary-card">
          <div className="status-summary-label">Degraded components</div>
          <div className="status-summary-value">{degradedCount}</div>
          <div className="status-summary-meta">
            Monitor and follow up as needed
          </div>
        </article>
        <article className="status-summary-card">
          <div className="status-summary-label">Down components</div>
          <div className="status-summary-value status-summary-value--down">
            {downCount}
          </div>
          <div className="status-summary-meta">Immediate intervention required</div>
        </article>
      </section>

      {/* Main layout – left: categories, right: legend / notes */}
      <div className="status-v2-layout">
        {/* Categories & cards */}
        <div className="panel status-v2-panel min-w-0 flex-1">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                Components · Engine · External · Infra
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                Health by domain
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-400">
              <span>{STATUS_ITEMS.length} components tracked</span>
              <span>
                {healthyCount} healthy · {degradedCount} degraded · {downCount} down
              </span>
            </div>
          </div>

          <div className="panel-body status-v2-panel-body">
            {(['engine', 'external', 'infra'] as StatusCategory[]).map((category) => {
              const items = grouped[category];
              if (!items.length) return null;

              return (
                <section key={category} className="status-section">
                  <header className="status-section-header">
                    <h3 className="status-section-title">
                      {CATEGORY_LABEL[category]}
                    </h3>
                    <div className="status-section-meta">
                      <span className="status-section-count">
                        {items.length} component{items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </header>

                  <div className="status-cards">
                    {items.map((item) => (
                      <article key={item.id} className="status-card">
                        <div className="status-card-header">
                          <div className="status-card-title-block">
                            <h4 className="status-card-title">{item.name}</h4>
                            <p className="status-card-subtitle">
                              {category === 'engine' &&
                                'Core jobs and pipelines owned by Prism.'}
                              {category === 'external' &&
                                'Third-party connectivity and feeds.'}
                              {category === 'infra' &&
                                'Underlying runtime and dashboard surface.'}
                            </p>
                          </div>
                          <Badge tone={getStatusTone(item.status)}>
                            {STATUS_LABEL[item.status]}
                          </Badge>
                        </div>

                        <p className="status-card-details">{item.details}</p>

                        <div className="status-card-meta">
                          <span className="status-card-updated-label">
                            Last updated:
                          </span>
                          <span className="status-card-updated-value">
                            {formatUtcLabel(item.lastUpdated)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Right-hand legend / notes panel */}
        <aside className="panel status-v2-details w-full max-w-[360px] shrink-0 lg:max-w-full">
          <div className="details-header border-b border-slate-800/80 px-4 pb-3 pt-3">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Legend & guardrails
            </h2>
            <span className="mt-1 text-[0.7rem] text-slate-500">
              How to interpret this view and what to do when things are red.
            </span>
          </div>
          <div className="details-body space-y-4 px-4 pb-4 pt-3">
            <section className="details-section">
              <h3 className="details-label">Status levels</h3>
              <ul className="mt-2 space-y-1 text-[0.78rem] text-slate-200">
                <li>
                  <span className="font-semibold text-emerald-300">Healthy</span> — all
                  core checks passing; no immediate action required.
                </li>
                <li>
                  <span className="font-semibold text-amber-300">Degraded</span> — still
                  functioning but with warnings, elevated error rates or latency.
                </li>
                <li>
                  <span className="font-semibold text-rose-300">Down</span> — hard
                  failures or disabled; treat as production-impacting until cleared.
                </li>
              </ul>
            </section>

            <section className="details-section">
              <h3 className="details-label">Operational use</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[0.78rem] text-slate-300">
                <li>
                  Check this panel before high-stakes trading sessions; if any{" "}
                  <span className="text-rose-300">Down</span> items exist, pause and
                  investigate.
                </li>
                <li>
                  For <span className="text-amber-300">Degraded</span> items, confirm
                  whether the impact is on latency, coverage, or specific markets.
                </li>
                <li>
                  This page is a read-only summary; root cause lives in engine logs,
                  metrics and infra dashboards.
                </li>
              </ul>
            </section>

            <section className="details-section">
              <h3 className="details-label">Scope</h3>
              <p className="mt-2 text-[0.78rem] text-slate-300">
                These checks are deliberately opinionated: they answer “is the trading
                brain, its inputs, and its host platform OK?” rather than listing every
                microservice. Keep it tight, actionable, and directly tied to the operator
                workflow.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Status;


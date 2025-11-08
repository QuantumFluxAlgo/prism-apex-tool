import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { fetchJson } from '../lib/apiBase';

type ServiceKey = 'db' | 'api' | 'yahoo' | 'tickets_cron' | 'gapfill_cron';
type HealthState = 'green' | 'amber' | 'red' | 'grey' | string | undefined;

interface StatusPayload {
  services?: Record<string, HealthState>;
  symbols?: Array<{
    symbol?: string | null;
    last_utc?: string | null;
    age_ms?: number | null;
    health?: HealthState;
  }>;
  session?: { is_open?: boolean | null };
}

const SERVICE_CONFIG: Array<{ key: ServiceKey; label: string; detail: string }> = [
  { key: 'db', label: 'Database', detail: 'Postgres connectivity + latest bar times' },
  { key: 'api', label: 'API', detail: 'Fastify process + auth middleware' },
  { key: 'yahoo', label: 'Yahoo Ingress', detail: 'Market data fetcher (ingress service)' },
  { key: 'tickets_cron', label: 'Tickets Cron', detail: 'Open ticket refresh (60s)' },
  { key: 'gapfill_cron', label: 'Gapfill Cron', detail: 'Backfills missing bars (daily)' },
];

const STATUS_ENDPOINT = '/api/status';
const REFRESH_INTERVAL_MS = 15_000;

function dotClass(health: HealthState) {
  const state = (health ?? 'grey') as string;
  return `status-dot status-${state}`;
}

function describeHealth(health: HealthState) {
  switch (health) {
    case 'green':
      return 'Running';
    case 'amber':
      return 'Limited / delayed';
    case 'red':
      return 'Problems fetching';
    case 'grey':
    case undefined:
    case null:
      return 'Backoff';
    default:
      return String(health);
  }
}

function formatIso(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function formatAge(ageMs: number | null | undefined) {
  if (ageMs === null || ageMs === undefined || Number.isNaN(Number(ageMs))) return '—';
  const totalSeconds = Math.max(0, Math.floor(Number(ageMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

export default function StatusPage() {
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsRefreshing(true);
    try {
      const payload = (await fetchJson(STATUS_ENDPOINT)) as StatusPayload;
      if (!mountedRef.current) return;
      setStatus(payload);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load status: ${message}`);
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      mountedRef.current = false;
    };
  }, [refresh]);

  const services = useMemo(
    () =>
      SERVICE_CONFIG.map((service) => ({
        ...service,
        health: status?.services?.[service.key],
      })),
    [status],
  );

  const symbols = status?.symbols ?? [];
  const relaxed = Boolean(status?.session && status.session.is_open === false);

  return (
    <div className="dashboard-stack status-page">
      <Card>
        <CardBody className="stack">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.015em' }}>System Status</h2>
            <p className="status-detail">
              Live view of cluster health and latest symbol ticks. Auto-updates every 15 seconds.
            </p>
          </div>
          <div className="status-meta">
            {lastUpdated && (
              <span>Last update {lastUpdated.toLocaleTimeString(undefined, { hour12: false })}</span>
            )}
            {relaxed && <span>Session paused — symbol ages use prior close.</span>}
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={isRefreshing}
              onClick={refresh}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh now'}
            </Button>
          </div>
        </CardBody>
      </Card>
      {error && <div className="status-error">{error}</div>}

      <div className="status-grid">
        {services.map(({ key, label, detail, health }) => (
          <Card key={key}>
            <div className="status-card__header">
              <div className="status-card__identity">
                <span className={dotClass(health)} aria-hidden="true" />
                <strong>{label}</strong>
              </div>
              <span className="status-pill">
                <span className={dotClass(health)} aria-hidden="true" />
                {describeHealth(health)}
              </span>
            </div>
            {detail && <p className="status-detail">{detail}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <strong>Symbols</strong>
        </CardHeader>
        <CardBody>
          {symbols.length === 0 ? (
            <p className="status-detail">No symbol data yet.</p>
          ) : (
            <div className="symbol-grid">
              {symbols.map((entry, index) => {
                const health = entry.health ?? 'grey';
                const key = entry.symbol ?? `symbol-${index}`;
                return (
                  <div className="symbol-card" key={key}>
                    <div className="symbol-card__header">
                      <span className="symbol-card__symbol">{entry.symbol ?? '—'}</span>
                      <span className="status-pill">
                        <span className={dotClass(health)} aria-hidden="true" />
                        {describeHealth(health)}
                      </span>
                    </div>
                    <div className="symbol-card__meta">
                      <div>
                        <span className="label">Last bar</span>
                        <span className="value">{formatIso(entry.last_utc)}</span>
                      </div>
                      <div>
                        <span className="label">Age</span>
                        <span className="value">
                          {entry.last_utc ? formatAge(entry.age_ms) : relaxed ? 'paused' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

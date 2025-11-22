/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import { fetchJson } from '../lib/apiBase';
import { useTheme } from '../ui/ThemeProvider';

type Health = 'green' | 'amber' | 'red' | 'grey' | string | undefined | null;

interface StatusResponse {
  services?: Record<string, Health>;
}

const SERVICES: Array<{ key: keyof NonNullable<StatusResponse['services']>; label: string; title: string }> = [
  { key: 'db', label: 'DB', title: 'Database connectivity' },
  { key: 'api', label: 'API', title: 'API health' },
  { key: 'yahoo', label: 'Yahoo', title: 'Yahoo ingress' },
  { key: 'tickets_cron', label: 'Tickets', title: 'Tickets cron (1m)' },
  { key: 'gapfill_cron', label: 'Gapfill', title: 'Gapfill cron' },
];

const REFRESH_MS = 15_000;

function getDotClass(health: Health) {
  switch (health) {
    case 'green':
      return 'statusbar-dot statusbar-dot--green';
    case 'amber':
      return 'statusbar-dot statusbar-dot--amber';
    case 'red':
      return 'statusbar-dot statusbar-dot--red';
    default:
      return 'statusbar-dot statusbar-dot--grey';
  }
}

export default function SystemStatusBar() {
  const { mode, setMode } = useTheme();
  const isDark = mode === 'dark';
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const json = (await fetchJson('/api/status')) as StatusResponse;
        if (cancelled) return;
        setStatus(json);
        setError(false);
      } catch (_err) {
        if (cancelled) return;
        setError(true);
        setStatus(null);
      }
    }
    fetchStatus();
    const interval = window.setInterval(fetchStatus, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const services = useMemo(
    () =>
      SERVICES.map(({ key, label, title }) => ({
        key,
        label,
        title,
        health: status?.services?.[key] ?? 'grey',
      })),
    [status],
  );

  const time = useMemo(() => {
    const iso = now.toISOString();
    return `${iso.slice(11, 19)} GMT`;
  }, [now]);

  return (
    <div className={`statusbar${error ? ' statusbar--error' : ''}`}>
      {services.map(({ key, label, title, health }) => (
        <div key={String(key)} className="statusbar-chip" title={title}>
          <span className={getDotClass(health)} aria-hidden="true" />
          <span>{label}</span>
        </div>
      ))}
      <div className="statusbar-right" aria-live="polite">
        <span className="statusbar-time" aria-label="Current time in GMT">
          {time}
        </span>
        <span className="statusbar-refresh">15s auto-refresh</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          aria-pressed={isDark}
          aria-label={isDark ? 'Activate light theme' : 'Activate dark theme'}
          data-theme-toggle
        >
          {isDark ? 'Use light theme' : 'Use dark theme'}
        </Button>
      </div>
    </div>
  );
}

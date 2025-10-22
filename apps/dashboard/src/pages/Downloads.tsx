import React, { useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { API_BASE } from '../lib/apiBase';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 28 * DAY_MS;

function clampWindow(startIso: string, endIso: string) {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { startIso, endIso, ok: false };
  }
  const low = Math.min(startMs, endMs);
  const high = Math.max(startMs, endMs);
  const ok = high - low <= MAX_RANGE_MS;
  return {
    startIso: new Date(ok ? low : high - MAX_RANGE_MS).toISOString(),
    endIso: new Date(high).toISOString(),
    ok,
  };
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(
    date.getUTCMinutes(),
  )}`;
}

export default function Downloads() {
  const apiBase = API_BASE;

  const [symbol, setSymbol] = useState('ES=F');
  const [allSymbols, setAllSymbols] = useState(false);
  const [strategy, setStrategy] = useState('ORR');

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const [startInput, setStartInput] = useState(() => toLocalInput(new Date(Date.now() - 7 * DAY_MS).toISOString()));
  const [endInput, setEndInput] = useState(() => toLocalInput(nowIso));

  const range = useMemo(() => {
    const startIso = new Date(startInput).toISOString();
    const endIso = new Date(endInput).toISOString();
    return clampWindow(startIso, endIso);
  }, [startInput, endInput]);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * DAY_MS);
    const { startIso, endIso } = clampWindow(start.toISOString(), end.toISOString());
    setStartInput(toLocalInput(startIso));
    setEndInput(toLocalInput(endIso));
  };

  const barsUrl = useMemo(() => {
    const params = new URLSearchParams({ start: range.startIso, end: range.endIso });
    if (allSymbols) {
      params.set('all', '1');
    } else {
      params.set('symbol', symbol);
    }
    return `${apiBase}/api/export/bars.csv?${params.toString()}`;
  }, [apiBase, allSymbols, symbol, range.startIso, range.endIso]);

  const ticketsUrl = useMemo(() => {
    const params = new URLSearchParams({ strategy, start: range.startIso, end: range.endIso });
    return `${apiBase}/api/export/tickets.csv?${params.toString()}`;
  }, [apiBase, strategy, range.startIso, range.endIso]);

  const readmeUrl = useMemo(() => `${apiBase}/api/export/readme.md`, [apiBase]);

  const openDownload = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Downloads</h1>
        <Badge tone="neutral">Max range: 28 days</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => applyPreset(1)}>Last Day</Button>
        <Button onClick={() => applyPreset(7)}>Last 7 Days</Button>
        <Button onClick={() => applyPreset(28)}>Last 28 Days</Button>
        <Badge tone={range.ok ? 'green' : 'amber'} className="ml-auto">
          {range.ok ? 'Range OK' : 'Range exceeds 28 days'}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Symbol</span>
          <input
            className="rounded border px-2 py-1"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            disabled={allSymbols}
          />
        </label>
        <div className="flex items-center gap-2">
          <input
            id="toggle-all-symbols"
            type="checkbox"
            checked={allSymbols}
            onChange={(event) => setAllSymbols(event.target.checked)}
          />
          <label htmlFor="toggle-all-symbols" className="text-sm text-gray-600">
            All symbols
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Strategy</span>
          <input
            className="rounded border px-2 py-1"
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Start (UTC)</span>
          <input
            type="datetime-local"
            className="rounded border px-2 py-1"
            value={startInput}
            onChange={(event) => setStartInput(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">End (UTC)</span>
          <input
            type="datetime-local"
            className="rounded border px-2 py-1"
            value={endInput}
            onChange={(event) => setEndInput(event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button disabled={!range.ok} onClick={() => openDownload(barsUrl)}>
          Download Bars CSV
        </Button>
        <Button disabled={!range.ok} onClick={() => openDownload(ticketsUrl)}>
          Download Tickets CSV
        </Button>
        <Button onClick={() => openDownload(readmeUrl)}>Download README.md</Button>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */
// V2 HARDENING (auto-waive): TS waiver for this dashboard file. See PRISM_APEX_V2_BUILD_AUDIT.md.
import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchStrategyConfig,
  type StrategyConfigSet,
  type StrategyKind,
  type StrategyParameter,
} from '../lib/strategiesConfig';

const KIND_LABELS: Record<StrategyKind, string> = {
  VWAP_FIRST_TOUCH: 'VWAP First Touch',
  OPENING_RANGE_REVERSION: 'Opening Range Reversion',
  OSB_BREAKOUT: 'OSB Breakout',
};

const KIND_OPTIONS: Array<StrategyKind | 'ALL'> = ['ALL', 'VWAP_FIRST_TOUCH', 'OPENING_RANGE_REVERSION', 'OSB_BREAKOUT'];

function groupParameters(params: StrategyParameter[]): Record<string, StrategyParameter[]> {
  return params.reduce<Record<string, StrategyParameter[]>>((acc, param) => {
    const key = param.group || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(param);
    return acc;
  }, {});
}

export const StrategyConfigPage: React.FC = () => {
  const [sets, setSets] = useState<StrategyConfigSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<StrategyKind | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await fetchStrategyConfig();
        setSets(data);
        if (data.length > 0) {
          setSelectedSetId(data[0].id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[StrategyConfigPage] failed to fetch strategy config', err);
        setError('Unable to load strategy configuration.');
      } finally {
        setLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSets = useMemo(() => {
    let result = sets;
    if (kindFilter !== 'ALL') {
      result = result.filter((set) => set.kind === kindFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (set) =>
          set.label.toLowerCase().includes(q) || set.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [sets, kindFilter, query]);

  const activeSet = useMemo(() => {
    if (!filteredSets.length) return undefined;
    if (selectedSetId) {
      const found = filteredSets.find((set) => set.id === selectedSetId);
      if (found) return found;
    }
    return filteredSets[0];
  }, [filteredSets, selectedSetId]);

  useEffect(() => {
    if (activeSet && activeSet.id !== selectedSetId) {
      setSelectedSetId(activeSet.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSet?.id]);

  const groupedParams = useMemo(
    () => (activeSet ? groupParameters(activeSet.parameters) : {}),
    [activeSet],
  );

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-base font-semibold tracking-wide text-slate-50">Strategy Config Explorer</h1>
        <p className="text-xs text-slate-400">
          Read-only view of VWAP First Touch, Opening Range Reversion, and OSB breakout configuration sets.
          Search, filter, and inspect parameter ranges without changing live strategy settings.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Strategy</span>
            <div className="inline-flex gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1">
              {KIND_OPTIONS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`rounded-md px-2 py-1 text-[11px] ${
                    kindFilter === kind
                      ? 'bg-slate-800 text-slate-50'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                  onClick={() => setKindFilter(kind as StrategyKind | 'ALL')}
                >
                  {kind === 'ALL' ? 'All' : KIND_LABELS[kind as StrategyKind]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="strategy-config-search" className="text-xs font-medium text-slate-300">
              Search
            </label>
            <input
              id="strategy-config-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter configs..."
              className="h-7 w-60 rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-[minmax(0,0.8fr),minmax(0,1.6fr)]">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-50">Config Sets</h2>
            {loading && <span className="text-[10px] text-slate-500">Loading…</span>}
          </div>
          <div className="max-h-[420px] space-y-1 overflow-auto pr-1">
            {!filteredSets.length && !loading ? (
              <div className="py-3 text-[11px] text-slate-500">No config sets match the current filters.</div>
            ) : (
              filteredSets.map((set) => {
                const isActive = activeSet && set.id === activeSet.id;
                return (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => setSelectedSetId(set.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-[11px] ${
                      isActive
                        ? 'border-slate-500 bg-slate-900/90'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-50">{set.label}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {KIND_LABELS[set.kind]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{set.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                      <span>
                        {set.parameters.length} parameter{set.parameters.length === 1 ? '' : 's'}
                      </span>
                      {set.enabledByDefault && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          Default
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-50">Parameters</h2>
            {activeSet && (
              <span className="text-[10px] text-slate-500">
                {KIND_LABELS[activeSet.kind]} · {activeSet.parameters.length} parameter
                {activeSet.parameters.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {!activeSet && !loading && (
            <div className="py-4 text-[11px] text-slate-500">Select a config set to view its parameters.</div>
          )}
          {activeSet && (
            <div className="max-h-[460px] overflow-auto rounded-lg border border-slate-800 bg-slate-950/80">
              <table className="min-w-full border-collapse text-[11px] text-slate-200">
                <thead className="bg-slate-900/90">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Group</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Parameter</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Key</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Default</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Range</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedParams).map(([group, params]) =>
                    params.map((param, index) => {
                      const showGroupLabel = index === 0;
                      const rangeParts: string[] = [];
                      if (typeof param.min === 'number' || typeof param.max === 'number') {
                        const min = typeof param.min === 'number' ? param.min : '';
                        const max = typeof param.max === 'number' ? param.max : '';
                        rangeParts.push(`${min}${min && max ? ' – ' : ''}${max}`);
                      }
                      if (typeof param.step === 'number') {
                        rangeParts.push(`step ${param.step}`);
                      }
                      if (param.unit) {
                        rangeParts.push(param.unit);
                      }
                      const rangeLabel = rangeParts.length ? rangeParts.join(' · ') : '—';

                      return (
                        <tr key={param.key} className="border-t border-slate-800/80 align-top hover:bg-slate-900/60">
                          <td className="px-3 py-2 text-[11px] text-slate-300">{showGroupLabel ? group : ''}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-100">{param.label}</td>
                          <td className="px-3 py-2 text-[10px] font-mono text-slate-400">{param.key}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-200">{String(param.defaultValue)}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-300">{rangeLabel}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-300">{param.description}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default StrategyConfigPage;

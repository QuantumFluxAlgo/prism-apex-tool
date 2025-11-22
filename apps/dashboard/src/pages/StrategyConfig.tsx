import React from 'react';
import { useStrategyConfig } from '../hooks/useStrategyConfig';
import { ConfigCard, WarningsList } from '../components/strategy-config';

type StrategyKey = 'orr' | 'osb' | 'vwap_ft';

const StrategyPanel: React.FC<{ title: string; strategy: StrategyKey }> = ({ title, strategy }) => {
  const { data, loading, error } = useStrategyConfig(strategy);

  if (loading) {
    return (
      <ConfigCard title={title} subtitle="Loading latest configuration…">
        <p className="text-sm text-slate-400">Loading…</p>
      </ConfigCard>
    );
  }

  if (error || !data) {
    return (
      <ConfigCard title={title} subtitle="Unable to load configuration">
        <p className="text-sm text-red-500">Error: {error ?? 'Failed to load strategy config'}</p>
      </ConfigCard>
    );
  }

  return (
    <ConfigCard
      title={title}
      subtitle={`Version ${data.config.version}`}
      footer="Editable forms arrive in Epic 3."
    >
      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-400 mb-1">Parameters (read-only)</p>
          <pre className="text-xs bg-slate-950/80 border border-slate-800 rounded p-3 max-h-48 overflow-auto">
            {JSON.stringify(data.config.params, null, 2)}
          </pre>
        </div>

        <WarningsList warnings={data.warnings} />
      </div>
    </ConfigCard>
  );
};

const StrategyConfigPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-white">Strategy Config</h1>
        <p className="text-sm text-slate-400">
          Review live configuration for ORR, OSB, and VWAP-FT. Editing and save flows will ship in Epic 3.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StrategyPanel title="ORR Config" strategy="orr" />
        <StrategyPanel title="OSB Config" strategy="osb" />
        <StrategyPanel title="VWAP-FT Config" strategy="vwap_ft" />
      </section>
    </div>
  );
};

export default StrategyConfigPage;

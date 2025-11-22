import { useEffect, useState } from 'react';

export interface StrategyConfigResponse {
  strategy: 'orr' | 'osb' | 'vwap_ft';
  config: {
    version: number;
    params: Record<string, unknown>;
  };
  warnings: string[];
}

type StrategyKey = StrategyConfigResponse['strategy'];

export function useStrategyConfig(strategy: StrategyKey) {
  const [data, setData] = useState<StrategyConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/strategy-config/${strategy}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StrategyConfigResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [strategy]);

  return { data, loading, error };
}

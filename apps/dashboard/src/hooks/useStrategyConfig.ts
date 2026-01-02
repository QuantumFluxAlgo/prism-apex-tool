import { useEffect, useState } from 'react';
import {
  fetchStrategyConfig,
  type StrategyConfigKey,
  type StrategyConfigResponse,
} from '../lib/api';

export function useStrategyConfig(strategy: StrategyConfigKey) {
  const [data, setData] = useState<StrategyConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchStrategyConfig(strategy);
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

import { useCallback, useEffect, useState } from 'react';
import { fetchTickets } from '../lib/api';

export type TicketsFilters = {
  from?: string;
  to?: string;
  symbol?: string;
  strategy?: string;
  status?: string;
  scope?: string;
};

type TicketsState<T> = {
  loading: boolean;
  error: string | null;
  tickets: T[];
  total: number;
};

export function useTicketsHistory<T = any>(filters: TicketsFilters) {
  const [state, setState] = useState<TicketsState<T>>({
    loading: false,
    error: null,
    tickets: [],
    total: 0,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { rows, total } = await fetchTickets({
        from: filters.from,
        to: filters.to,
        symbol: filters.symbol,
        strategy: filters.strategy,
        status: filters.status,
        scope: filters.scope ?? 'all',
        direction: 'ALL',
        limit: 100,
        offset: 0,
      });

      const safeRows = Array.isArray(rows) ? (rows as T[]) : [];

      setState({
        loading: false,
        error: null,
        tickets: safeRows,
        total: typeof total === 'number' ? total : safeRows.length,
      });
    } catch (err) {
      setState({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
        tickets: [],
        total: 0,
      });
    }
  }, [filters.from, filters.to, filters.symbol, filters.strategy, filters.status, filters.scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

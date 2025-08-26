import { useEffect, useState } from 'react';
import { FiltersBar } from '../components/FiltersBar';
import { TicketsTable, Ticket } from '../components/TicketsTable';
import { api } from '../lib/api';

export default function TicketsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [showAccepted, setShowAccepted] = useState(true);
  const [showRejected, setShowRejected] = useState(true);
  const [refreshMs, setRefreshMs] = useState(5000);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const applyFilters = (rows: Ticket[]) =>
    rows.filter((t) => {
      if (symbols.length && !symbols.some((s) => t.symbol.startsWith(s))) {
        return false;
      }
      if (strategies.length && !strategies.includes(t.meta.strategy)) {
        return false;
      }
      if (!showAccepted && t.accepted) return false;
      if (!showRejected && !t.accepted) return false;
      return true;
    });

  async function fetchTickets(cursor?: string, append = false) {
    try {
      const res: any = await api.tickets(date, cursor);
      const filtered = applyFilters(res.tickets as Ticket[]);
      setNextCursor(res.nextCursor);
      setTickets((prev) => (append ? [...prev, ...filtered] : filtered));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, [date, symbols, strategies, showAccepted, showRejected]);

  useEffect(() => {
    if (refreshMs > 0) {
      const id = setInterval(() => fetchTickets(), refreshMs);
      return () => clearInterval(id);
    }
  }, [refreshMs, date, symbols, strategies, showAccepted, showRejected]);

  const onExport = () => {
    window.open(`/export/tickets?date=${date}`, '_blank');
  };

  const loadMore = () => {
    if (nextCursor) fetchTickets(nextCursor, true);
  };

  return (
    <div>
      <FiltersBar
        date={date}
        setDate={setDate}
        symbols={symbols}
        setSymbols={setSymbols}
        strategies={strategies}
        setStrategies={setStrategies}
        showAccepted={showAccepted}
        setShowAccepted={setShowAccepted}
        showRejected={showRejected}
        setShowRejected={setShowRejected}
        refreshMs={refreshMs}
        setRefreshMs={setRefreshMs}
        onExport={onExport}
      />
      <TicketsTable tickets={tickets} hasMore={!!nextCursor} onLoadMore={loadMore} />
    </div>
  );
}

import { SYMBOLS, STRATEGIES } from '../constants';

interface Props {
  date: string;
  setDate: (s: string) => void;
  symbols: string[];
  setSymbols: (s: string[]) => void;
  strategies: string[];
  setStrategies: (s: string[]) => void;
  showAccepted: boolean;
  setShowAccepted: (b: boolean) => void;
  showRejected: boolean;
  setShowRejected: (b: boolean) => void;
  refreshMs: number;
  setRefreshMs: (n: number) => void;
  onExport: () => void;
}

export function FiltersBar({
  date,
  setDate,
  symbols,
  setSymbols,
  strategies,
  setStrategies,
  showAccepted,
  setShowAccepted,
  showRejected,
  setShowRejected,
  refreshMs,
  setRefreshMs,
  onExport,
}: Props) {
  const toggleSymbol = (sym: string) => {
    setSymbols(symbols.includes(sym) ? symbols.filter((s) => s !== sym) : [...symbols, sym]);
  };

  const toggleStrategy = (str: string) => {
    setStrategies(
      strategies.includes(str) ? strategies.filter((s) => s !== str) : [...strategies, str],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border px-2 py-1 rounded"
      />

      <div className="flex items-center gap-2">
        {SYMBOLS.map((s) => (
          <label key={s} className="flex items-center gap-1">
            <input type="checkbox" checked={symbols.includes(s)} onChange={() => toggleSymbol(s)} />
            {s}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {STRATEGIES.map((s) => (
          <label key={s} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={strategies.includes(s)}
              onChange={() => toggleStrategy(s)}
            />
            {s}
          </label>
        ))}
      </div>

      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={showAccepted}
          onChange={(e) => setShowAccepted(e.target.checked)}
        />
        Accepted
      </label>

      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={showRejected}
          onChange={(e) => setShowRejected(e.target.checked)}
        />
        Rejected
      </label>

      <select
        value={refreshMs.toString()}
        onChange={(e) => setRefreshMs(Number(e.target.value))}
        className="border px-2 py-1 rounded"
      >
        <option value="3000">3s</option>
        <option value="5000">5s</option>
        <option value="10000">10s</option>
        <option value="0">Off</option>
      </select>

      <button type="button" onClick={onExport} className="px-2 py-1 bg-gray-200 rounded">
        Export CSV
      </button>
    </div>
  );
}

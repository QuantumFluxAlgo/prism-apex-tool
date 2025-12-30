import { SYMBOLS, STRATEGIES } from '../constants.js';
import Button from '../ui/Button';

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
  const safeSymbols = Array.isArray(symbols) ? symbols : [];
  const safeStrategies = Array.isArray(strategies) ? strategies : [];
  const safeDate = typeof date === 'string' ? date : '';
  const safeRefreshMs = Number.isFinite(refreshMs) ? refreshMs : 0;

  const toSafeString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
  };

  const toggleSymbol = (sym: string) => {
    const next = safeSymbols.includes(sym)
      ? safeSymbols.filter((s) => s !== sym)
      : [...safeSymbols, sym];
    setSymbols(next);
  };

  const toggleStrategy = (str: string) => {
    const next = safeStrategies.includes(str)
      ? safeStrategies.filter((s) => s !== str)
      : [...safeStrategies, str];
    setStrategies(next);
  };

  return (
    <div className="a3-filter-bar flex-wrap a3-scroll-soft">
      <label className="a3-filter-field">
        <span>Date</span>
        <input
          type="date"
          value={safeDate}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <div className="a3-filter-field flex-wrap">
        <span>Symbols</span>
        <div className="flex items-center gap-2 flex-wrap">
          {SYMBOLS.map((s) => (
            <label key={s} className="a3-filter-field">
              <input
                type="checkbox"
                checked={safeSymbols.includes(s)}
                onChange={() => toggleSymbol(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="a3-filter-field flex-wrap">
        <span>Strategies</span>
        <div className="flex items-center gap-2 flex-wrap">
          {STRATEGIES.map((s) => (
            <label key={s} className="a3-filter-field">
              <input
                type="checkbox"
                checked={safeStrategies.includes(s)}
                onChange={() => toggleStrategy(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <label className="a3-filter-field">
        <input
          type="checkbox"
          checked={showAccepted}
          onChange={(e) => setShowAccepted(e.target.checked)}
        />
        Accepted
      </label>

      <label className="a3-filter-field">
        <input
          type="checkbox"
          checked={showRejected}
          onChange={(e) => setShowRejected(e.target.checked)}
        />
        Rejected
      </label>

      <label className="a3-filter-field">
        <span>Refresh</span>
        <select
          value={toSafeString(safeRefreshMs)}
          onChange={(e) => setRefreshMs(Number(e.target.value))}
        >
          <option value="3000">3s</option>
          <option value="5000">5s</option>
          <option value="10000">10s</option>
          <option value="0">Off</option>
        </select>
      </label>

      <Button tone="secondary" size="xs" onClick={onExport}>
        Export CSV
      </Button>
    </div>
  );
}

export default FiltersBar;

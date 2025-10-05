import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ThemeProvider, { useTheme } from './ui/ThemeProvider';
import Tabs from './ui/Tabs';
import SessionCountdown from './ui/SessionCountdown';
import TicketsPage from './pages/Tickets';
import PositionsPage from './pages/Positions';
import ReportsPage from './pages/Reports';
import MetricsPage from './pages/Metrics';
import Worklist from './pages/Worklist';

function Header() {
  const { mode, setMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Prism Apex Operator Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Shared shell for tickets, positions, reports, and metrics.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 text-right">
        <SessionCountdown />
        <button
          type="button"
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          className="self-start rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 shadow-sm"
        >
          {isDark ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-gray-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
            <Header />
            <Tabs />
            <main className="pt-4">
              <Routes>
                <Route path="/worklist" element={<Worklist />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route path="/positions" element={<PositionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/metrics" element={<MetricsPage />} />
                <Route path="/" element={<Navigate to="/worklist" replace />} />
                <Route path="*" element={<Navigate to="/worklist" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

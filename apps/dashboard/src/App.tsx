import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ThemeProvider, { useTheme } from './ui/ThemeProvider';
import ToastProvider from './context/ToastContext';
import Tabs from './ui/Tabs';
import SessionCountdown from './ui/SessionCountdown';
import TicketsPage from './pages/Tickets';
import PositionsPage from './pages/Positions';
import ReportsPage from './pages/Reports';
import MetricsPage from './pages/Metrics';
import Worklist from './pages/Worklist';
import StatusPage from './pages/Status';
import { Card, CardBody } from './ui/Card';
import Button from './ui/Button';

function Header() {
  const { mode, setMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <div className="dashboard-stack">
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em' }}>Prism Apex Operator Dashboard</h1>
        <p style={{ color: 'var(--apex-text-muted)', fontSize: '14px' }}>
          Shared shell for tickets, positions, reports, and metrics.
        </p>
      </div>
      <div className="dashboard-countdown" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <SessionCountdown />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          aria-pressed={isDark}
          aria-label={isDark ? 'Activate light theme' : 'Activate dark theme'}
          data-theme-toggle
        >
          {isDark ? 'Use light theme' : 'Use dark theme'}
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="dashboard-shell">
            <div className="dashboard-wrapper">
              <Card>
                <CardBody className="dashboard-card__body stack">
                  <Header />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Tabs />
                </CardBody>
              </Card>
              <main className="dashboard-stack">
                <Routes>
                  <Route path="/worklist" element={<Worklist />} />
                  <Route path="/tickets" element={<TicketsPage />} />
                  <Route path="/positions" element={<PositionsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/metrics" element={<MetricsPage />} />
                  <Route path="/status/*" element={<StatusPage />} />
                  <Route path="/" element={<Navigate to="/worklist" replace />} />
                  <Route path="*" element={<Navigate to="/worklist" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

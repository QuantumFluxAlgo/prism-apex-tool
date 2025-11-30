import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ThemeProvider from './ui/ThemeProvider';
import ToastProvider from './context/ToastContext';
import TicketsPage from './pages/Tickets';
import PositionsPage from './pages/Positions';
import ReportsPage from './pages/Reports';
import MarketDataPage from './pages/MarketData';
import Worklist from './pages/Worklist';
import WorklistV2Page from './pages/WorklistV2';
import StatusPage from './pages/Status';
import DemoPnL from './pages/DemoPnL';
import StrategyConfigPage from './pages/StrategyConfig';
import StrategyLabPage from './pages/StrategyLab';
import DashboardShell from './ui/DashboardShell';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <DashboardShell>
            <Routes>
              <Route path="/worklist" element={<Worklist />} />
              <Route path="/worklist-v2" element={<WorklistV2Page />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/market-data" element={<MarketDataPage />} />
              <Route path="/strategy-config" element={<StrategyConfigPage />} />
              <Route path="/strategy-lab" element={<StrategyLabPage />} />
              <Route path="/status/*" element={<StatusPage />} />
              <Route path="/demo/pnl" element={<DemoPnL />} />
              <Route path="/demo/pnl" element={<DemoPnL />} />
              <Route path="/" element={<Navigate to="/worklist" replace />} />
              <Route path="*" element={<Navigate to="/worklist" replace />} />
            </Routes>
          </DashboardShell>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

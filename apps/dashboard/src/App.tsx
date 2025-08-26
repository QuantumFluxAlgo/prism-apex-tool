import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import TicketsPage from './pages/Tickets';
import { AlertsPanel } from './components/AlertsPanel';
import { AccountStatus } from './components/AccountStatus';
import { ReportsView } from './components/ReportsView';
import { SystemStatus } from './components/SystemStatus';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 p-4">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Prism Apex Operator Dashboard</h1>
            <SystemStatus />
          </div>
          <nav className="space-x-4">
            <Link to="/tickets" className="px-3 py-1 bg-blue-600 text-white rounded">
              Tickets
            </Link>
            <Link to="/reports" className="px-3 py-1 bg-gray-200 text-gray-800 rounded">
              Reports
            </Link>
          </nav>
        </header>

        <main className="grid grid-cols-4 gap-4">
          <section className="col-span-4 md:col-span-3">
            <Routes>
              <Route path="/" element={<Navigate to="/tickets" replace />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/reports" element={<ReportsView />} />
            </Routes>
          </section>
          <aside className="col-span-4 md:col-span-1 space-y-4">
            <AccountStatus />
            <AlertsPanel />
          </aside>
        </main>
      </div>
    </BrowserRouter>
  );
}

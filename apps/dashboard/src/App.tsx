import { useState } from 'react';
import { TicketsTable } from './components/TicketsTable';
import { AlertsPanel } from './components/AlertsPanel';
import { AccountStatus } from './components/AccountStatus';
import { ReportsView } from './components/ReportsView';

export default function App() {
  const [view, setView] = useState<'tickets' | 'reports'>('tickets');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prism Apex Operator Dashboard</h1>
        <nav className="space-x-4">
          <button
            type="button"
            onClick={() => setView('tickets')}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Tickets
          </button>
          <button
            type="button"
            onClick={() => setView('reports')}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded"
          >
            Reports
          </button>
        </nav>
      </header>

      <main className="grid grid-cols-4 gap-4">
        <section className="col-span-4 md:col-span-3">
          {view === 'tickets' ? <TicketsTable /> : <ReportsView />}
        </section>
        <aside className="col-span-4 md:col-span-1 space-y-4">
          <AccountStatus />
          <AlertsPanel />
        </aside>
      </main>
    </div>
  );
}

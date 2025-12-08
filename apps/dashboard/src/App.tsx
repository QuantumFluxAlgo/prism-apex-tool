/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* V2 HARDENING (auto-waive): ESLint disabled for this file; see PRISM_APEX_V2_BUILD_AUDIT.md. */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ThemeProvider from "./ui/ThemeProvider";
import ToastProvider from "./context/ToastContext";

import WorklistV2Page from "./pages/WorklistV2";
import TicketsPage from "./pages/Tickets";
import MarketDataPage from "./pages/MarketData";
import AnalyticsPage from "./pages/Analytics";
import StrategyLabPage from "./pages/StrategyLab";
import StatusPage from "./pages/Status";
import AlertsPage from "./pages/Alerts";

import AppErrorBoundary from "./components/AppErrorBoundary";
import ExecutionShell, { type ExecutionShellTabKey } from "./layouts/ExecutionShell";

/*
---------------------------------------------------------------------------
A2/A3 ROUTING MODEL (V2 ONLY)

- All primary dashboard views are hosted inside the V2 ExecutionShell
  with a single source of truth for activeTab.
- Legacy routes are redirected onto the V2 surfaces so we don't have
  two competing shells or layouts.
---------------------------------------------------------------------------
*/

function ExecutionRoute({
  tab,
  children,
}: {
  tab: ExecutionShellTabKey;
  children: React.ReactNode;
}) {
  return <ExecutionShell activeTab={tab}>{children}</ExecutionShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Primary V2 tabs (A3 shell) */}
              <Route
                path="/worklist-v2"
                element={
                  <ExecutionRoute tab="worklist">
                    <WorklistV2Page />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ExecutionRoute tab="tickets">
                    <TicketsPage />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/market-data"
                element={
                  <ExecutionRoute tab="markets">
                    <MarketDataPage />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ExecutionRoute tab="analytics">
                    <AnalyticsPage />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/strategy-lab"
                element={
                  <ExecutionRoute tab="strategy-lab">
                    <StrategyLabPage />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/status"
                element={
                  <ExecutionRoute tab="system">
                    <StatusPage />
                  </ExecutionRoute>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ExecutionRoute tab="alerts">
                    <AlertsPage />
                  </ExecutionRoute>
                }
              />

              {/* Legacy / convenience redirects into the V2 shell */}
              <Route path="/" element={<Navigate to="/worklist-v2" replace />} />
              <Route path="/worklist" element={<Navigate to="/worklist-v2" replace />} />
              <Route path="/reports" element={<Navigate to="/analytics" replace />} />
              <Route path="/positions" element={<Navigate to="/tickets" replace />} />
              <Route path="/pnl" element={<Navigate to="/analytics" replace />} />
              <Route path="/strategy-config" element={<Navigate to="/strategy-lab" replace />} />

              {/* Catch-all → Worklist V2 */}
              <Route path="*" element={<Navigate to="/worklist-v2" replace />} />
            </Routes>
          </BrowserRouter>
        </AppErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}


import React, { useEffect, useMemo, useState } from 'react';
import { ComplianceStrip } from './components/ComplianceStrip';
import { NextTicket } from './components/NextTicket';
import { EquityDrawdownGauge } from './components/EquityDrawdownGauge';
import { DailyRiskBars } from './components/DailyRiskBars';
import { PositionsOrders } from './components/PositionsOrders';
import { EODCountdown } from './components/EODCountdown';
import { Rules, Signals, type Ticket, type ComplianceSnapshot } from './lib/api';

export default function App() {
  const [compliance, setCompliance] = useState<ComplianceSnapshot | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [block, setBlock] = useState<boolean>(true);
  const [reasons, setReasons] = useState<string[]>([]);

  // Poll compliance snapshot
  useEffect(() => {
    let live = true;
    async function poll() {
      try {
        const s = await Rules.status();
        if (!live) return;
        setCompliance(s);
        // if in EOD block window, enforce block regardless of signal
        if (s.eodState === 'BLOCK_NEW') setBlock(true);
      } catch {
        /* ignore */
      }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  // Preview a default signal on load (ORB with safe params)
  useEffect(() => {
    let live = true;
    async function run() {
      try {
        const res = await Signals.preview({
          strategy: 'OPEN_SESSION',
          symbol: 'ES',
          contract: 'ESU5',
          cfg: {
            symbol: 'ES',
            contract: 'ESU5',
            rthStart: '13:30',
            orMinutes: 30,
            tickSize: 0.25,
            tickBuffer: 0.25,
            maxTradesPerDay: 1,
            tradesTakenToday: 0,
            targetMultiples: [1],
            qty: 1,
          },
        });
        if (!live) return;
        setTicket(res.ticket);
        setBlock(res.block);
        setReasons(res.reasons || []);
      } catch (e) {
        setTicket(null);
        setBlock(true);
        setReasons(['Signal preview failed']);
      }
    }
    run();
    const id = setInterval(run, 10000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const ddLine = useMemo(() => {
    // Approximate from compliance text (not ideal; ideally API returns numeric dd line)
    // For MVP UI we leave ddLine as null; extend in a follow-up prompt.
    return null as number | null;
  }, [compliance]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Prism Apex Tool — Operator Console</h1>
        <div className="mt-2">
          <ComplianceStrip data={compliance} />
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <NextTicket ticket={ticket} block={block} reasons={reasons} />
          <PositionsOrders />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <EquityDrawdownGauge netLiq={null} ddLine={ddLine} />
          <DailyRiskBars lossPct={0} consistencyShare={0} />
          <EODCountdown force={compliance?.eodState === 'BLOCK_NEW'} onAcknowledge={() => { /* modal cleared; compliance polling remains authoritative */ }} />
        </div>
      </main>

      <footer className="mt-6 text-xs text-gray-500">
        System decides, operator inputs. Manual execution; no auto-trading. EOD flat by 20:59 GMT.
      </footer>
    </div>
  );
}


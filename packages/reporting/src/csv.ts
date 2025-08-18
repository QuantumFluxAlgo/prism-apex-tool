import type { DailyJson } from './types';

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toDailyCSV(j: DailyJson): string {
  const lines: string[] = [];
  // Header
  lines.push(['date','time','symbol','side','qty','entry','stop','targets','apex_blocked','reasons'].join(','));
  // Rows
  for (const t of j.tickets) {
    const d = new Date(t.when);
    const date = d.toISOString().slice(0,10);
    const time = d.toISOString().slice(11,19);
    const row = [
      date,
      time,
      t.symbol,
      t.side,
      String(t.qty),
      String(t.entry),
      String(t.stop),
      csvEscape(t.targets.join('|')),
      String(t.apex_blocked),
      csvEscape(t.reasons.join(' | ')),
    ];
    lines.push(row.join(','));
  }
  // Footer summary as commented lines
  lines.push('# ---- SUMMARY ----');
  lines.push(`# date=${j.summary.date}`);
  lines.push(`# tickets=${j.summary.ticketsCount}`);
  lines.push(`# blocked=${j.summary.blockedCount}`);
  lines.push(`# alerts_acked=${j.summary.alertsAcked}`);
  lines.push(`# alerts_queued=${j.summary.alertsQueued}`);
  lines.push(`# pnl_realized=${j.summary.pnl.realized}`);
  lines.push(`# pnl_unrealized=${j.summary.pnl.unrealized}`);
  lines.push(`# netLiq=${j.summary.pnl.netLiq}`);
  return lines.join('\n');
}

import React from 'react';
import type { TicketRow } from '../lib/api';

type Props = {
  ticket: TicketRow;
};

export function SessionCell({ ticket }: Props) {
  const metrics = ticket.sessionMetrics ?? null;
  const hasNews = Boolean(ticket.sessionFlags?.hasNewsFlag);

  if (!metrics) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">—</span>
        {hasNews ? (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
            News
          </span>
        ) : null}
      </div>
    );
  }

  const orWidth = metrics.orWidth ?? '—';
  const ratioText = typeof metrics.orToAtrRatio === 'number' ? metrics.orToAtrRatio.toFixed(2) : '—';
  const slopeLabel = metrics.vwapSlopeClassification ?? '—';

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-xs tabular-nums">
        OR {orWidth} | R:{ratioText} | VWAP {slopeLabel}
      </span>
      {hasNews ? (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
          News
        </span>
      ) : null}
    </div>
  );
}

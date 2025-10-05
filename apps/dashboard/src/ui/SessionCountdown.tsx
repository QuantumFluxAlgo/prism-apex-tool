import React from 'react';
import useSessionCountdown from '../hooks/useSessionCountdown';

export default function SessionCountdown() {
  const { hours, minutes, seconds } = useSessionCountdown();
  return (
    <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-3">
      <span>Session ends in <span className="tabular-nums">{hours}h {minutes}m {seconds}s</span> (UTC/GMT)</span>
      <span className="text-[10px] md:text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">Data: Yahoo ≈15m delay</span>
    </div>
  );
}

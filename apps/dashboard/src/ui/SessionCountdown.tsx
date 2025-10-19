import React from 'react';
import useSessionCountdown from '../hooks/useSessionCountdown';

export default function SessionCountdown() {
  const { hours, minutes, seconds } = useSessionCountdown();
  return (
    <div className="dashboard-countdown">
      <span>
        Session ends in <span className="tabular-nums">{hours}h {minutes}m {seconds}s</span> (UTC/GMT)
      </span>
      <span className="dashboard-pill">Data: Yahoo ≈15m delay</span>
    </div>
  );
}

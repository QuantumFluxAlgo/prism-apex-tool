import React from 'react';
import useSessionCountdown from '../hooks/useSessionCountdown';

export default function SessionCountdown() {
  const { hours, minutes, seconds } = useSessionCountdown();
  return (
    <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
      Session ends in{' '}
      <span className="tabular-nums">{hours}h {minutes}m {seconds}s</span>{' '}
      (UTC/GMT)
    </div>
  );
}

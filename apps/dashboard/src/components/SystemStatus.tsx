import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function SystemStatus() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    api
      .ready()
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const t = status.ticketizer;
  return (
    <div className="text-xs">
      ticketizer.running {t?.running ? '✓' : '✗'} | acc {t?.accepted ?? 0} / rej {t?.rejected ?? 0}
    </div>
  );
}

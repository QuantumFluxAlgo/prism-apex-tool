import { useEffect, useState } from 'react';

function getMsToClose(now: Date) {
  // Approximate US session close 16:59 ET (~20:59 UTC); tune with real trading hours later.
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 59, 0));
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export default function useSessionCountdown() {
  const [msRemaining, setMsRemaining] = useState(() => getMsToClose(new Date()));

  useEffect(() => {
    const id = setInterval(() => setMsRemaining(getMsToClose(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

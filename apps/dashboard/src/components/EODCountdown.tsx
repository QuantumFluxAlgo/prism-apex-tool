import React, { useEffect, useMemo, useState } from 'react';

function nextCutoff2059GMT(now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 59, 0, 0));
  return d;
}

export function EODCountdown({ onAcknowledge, force }: { onAcknowledge: () => void; force?: boolean }) {
  const [now, setNow] = useState<Date>(new Date());
  const [ack, setAck] = useState<boolean>(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cutoff = useMemo(() => nextCutoff2059GMT(now), [now]);
  const msLeft = cutoff.getTime() - now.getTime();
  const inBlock = force || msLeft <= 5 * 60 * 1000;

  const hh = Math.max(0, Math.floor(msLeft / 3600000));
  const mm = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
  const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000));

  useEffect(() => {
    if (ack) onAcknowledge();
  }, [ack, onAcknowledge]);

  return (
    <div className="rounded-2xl shadow p-4 bg-white border relative">
      <h2 className="text-lg font-semibold mb-2">EOD Countdown (20:59 GMT)</h2>
      <div className="font-mono text-xl">{`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}</div>

      {inBlock && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur flex items-center justify-center">
          <div className="border rounded-xl shadow p-4 bg-white max-w-md">
            <div className="text-red-700 font-semibold">EOD Block Window</div>
            <p className="text-sm mt-2">No new tickets may be copied during the last 5 minutes. Confirm you are <strong>flat</strong> to continue.</p>
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
              I am flat
            </label>
            {!ack && <div className="mt-2 text-xs text-gray-600">Check the box to clear the modal.</div>}
          </div>
        </div>
      )}
    </div>
  );
}


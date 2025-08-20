import React, { useEffect, useState } from "react";

export default function MultiAccounts() {
  const [groups, setGroups] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetch("/api/accounts/groups").then(r => r.json()).then(d => setGroups(d.traderGroups || []));
    const poll = setInterval(() => {
      fetch("/api/rules/cross/check").then(r => r.json()).then(setConflicts);
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const onPreview = async (gId) => {
    const body = {
      traderGroupId: gId,
      baseAccountId: "",
      symbol: "ES",
      side: "BUY",
      entry: 5000,
      stop: 4990,
      target: 5010,
      baseSize: 1,
      mode: "evaluation"
    };
    const res = await fetch("/api/copytrader/preview", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify(body) }).then(r=>r.json());
    setPreview(res);
  };

  return (
    <div className="space-y-4">
      {conflicts && conflicts.pass === false && (
        <div className="p-3 bg-red-100 border border-red-300 rounded">
          <strong>❌ Cross-Account Hedge Detected:</strong> {JSON.stringify(conflicts.conflicts)}
        </div>
      )}
      {groups.map(g => (
        <div key={g.id} className="border rounded p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{g.name}</h3>
            <button className="px-3 py-1 border rounded" onClick={()=>onPreview(g.id)}>Preview Copy-Trade</button>
          </div>
          <ul className="mt-2 text-sm">
            {g.accounts.map(a => (
              <li key={a.id} className="flex items-center justify-between py-1">
                <span>{a.id} — mode: {a.mode}, max: {a.maxContracts}</span>
                <span>positions: {a.openPositions.map(p=>`${p.symbol}:${p.side}/${p.size}`).join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {preview && (
        <div className="p-3 bg-slate-50 border rounded">
          <h4 className="font-semibold">Copy-Trade Preview</h4>
          {!preview.ok ? <p>❌ {preview.reason}</p> : (
            <ul className="text-sm">
              {preview.tickets.map((t,i)=>(
                <li key={i}>{t.accountId} → {t.symbol} {t.side} {t.size} @ {t.entry} / stop {t.stop} / tgt {t.target}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

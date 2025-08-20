import React, { useEffect, useState } from "react";

export default function StrategySwitcher() {
  const [active, setActive] = useState({active: "OFF"});
  const [windows, setWindows] = useState([]);
  const [restrictions, setRestrictions] = useState([]);

  useEffect(() => {
    fetch("/api/strategy/active").then(r=>r.json()).then(setActive);
    fetch("/data/strategy_schedule.sample.json").then(r=>r.json()).then(d=>{
      setWindows(d.windows||[]);
      setRestrictions(d.restrictions||[]);
    });
    const poll = setInterval(()=>fetch("/api/strategy/active").then(r=>r.json()).then(setActive), 5000);
    return ()=>clearInterval(poll);
  }, []);

  const manualSwitch = async (strategy) => {
    const res = await fetch(`/api/strategy/switch?strategy=${strategy}&operator=operator1&reason=manual`, {method:"POST"});
    setActive(await res.json());
  };

  return (
    <div className="border rounded p-3">
      <h3 className="text-lg font-semibold">Strategy Switcher</h3>
      <p>Active: <span className="font-bold">{active.active}</span></p>
      <div className="mt-2 space-x-2">
        {["OFF","ORB","VWAP"].map(s => (
          <button key={s} onClick={()=>manualSwitch(s)} className="px-3 py-1 border rounded">{s}</button>
        ))}
      </div>
      <h4 className="mt-4 font-semibold">Schedule</h4>
      <ul className="text-sm">
        {windows.map((w,i)=><li key={i}>{w.strategy}: {w.startGMT}–{w.endGMT} GMT</li>)}
      </ul>
      <h4 className="mt-4 font-semibold">Restrictions</h4>
      <ul className="text-sm text-red-600">
        {restrictions.map((r,i)=><li key={i}>{r.reason}: {r.startGMT}–{r.endGMT} GMT</li>)}
      </ul>
    </div>
  );
}

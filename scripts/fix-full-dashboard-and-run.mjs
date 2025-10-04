/* eslint-disable no-console */
import fs from "fs";

function patchFile(p, fn) {
  if (!fs.existsSync(p)) return "skip";
  const s0 = fs.readFileSync(p, "utf8");
  const s1 = fn(s0);
  if (s1 !== s0) { fs.writeFileSync(p, s1); return "patched"; }
  return "ok";
}

const tt = "apps/dashboard/src/components/TicketsTable.tsx";
const ct = "apps/dashboard/src/constants.ts";

const r1 = patchFile(tt, (s) => {
  if (s.includes("const STRATEGY_LABELS")) return s;
  const lines = s.split("\n");
  let li = -1;
  for (let i = 0; i < lines.length; i++) if (/^\s*import\s/.test(lines[i])) li = i;
  lines.splice(li + 1, 0, 'const STRATEGY_LABELS: Record<string,string> = { "APX-DDB-01":"ORR", "ORR":"ORR" };');
  return lines.join("\n");
});

const r2 = patchFile(ct, (s) => s.replace(/export const STRATEGIES\s*=\s*\[[^\]]*\];/m, "export const STRATEGIES = ['ORR'];"));

console.log(JSON.stringify({ TicketsTable: r1, constants: r2 }));

#!/usr/bin/env bash
set -e

echo "=== PRISM APEX — GENERATING WORKLIST MOCK (PORT 3200, NO NPM) ==="

# 1. Clean + recreate folder
rm -rf worklist-mock
mkdir worklist-mock
cd worklist-mock

# 2. Create index.html
cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <title>Worklist Mock</title>

  <style>
    body { font-family: "Space Grotesk", sans-serif; }
    .mono { font-family: "IBM Plex Mono", monospace; }

    .theme-dark {
      --bg: #0F1116;
      --bg-panel: #1A1D23;
      --bg-header: #13161C;
      --text: #E7ECF3;
      --text-secondary: #A1A8B5;
      --text-muted: #626975;
      --border: rgba(255,255,255,0.08);
      --accent: #42E2F4;
    }
    .theme-light {
      --bg: #F6F8FA;
      --bg-panel: #FFFFFF;
      --bg-header: #E9ECEF;
      --text: #0F1116;
      --text-secondary: #444;
      --text-muted: #777;
      --border: rgba(0,0,0,0.1);
      --accent: #0AA4BE;
    }

    body {
      background: var(--bg);
      color: var(--text);
      transition: background 0.25s ease, color 0.25s ease;
    }

    @keyframes pulse {
      0% { background-color: rgba(66,226,244,0); }
      50% { background-color: rgba(66,226,244,0.18); }
      100% { background-color: rgba(66,226,244,0); }
    }

    @keyframes expiring {
      from { opacity: 1; }
      to { opacity: 0.45; }
    }
  </style>
</head>

<body class="theme-dark h-full">

<script>
function toggleTheme() {
  const b = document.body;
  b.classList.toggle("theme-dark");
  b.classList.toggle("theme-light");
}

function buildSpark(risk){
  const color = risk==="A" ? "#FBBF24" : "#10B981";
  const pts=[];
  for(let i=0;i<18;i++){
    pts.push(i*5 + "," + (20-Math.random()*16));
  }
  return `<svg width="100" height="20">
    <polyline points="${pts.join(" ")}"
      stroke="${color}"
      fill="none"
      stroke-width="2"
      stroke-linecap="round" />
  </svg>`;
}

function genRows(n=30){
  const out=[];
  const strA=["↑","→","↓"];
  const stratA=["ORR","OSB","VWFT"];
  const trendA=["↗","↔","↘"];
  const tagA=["RegUp","VW+","OROut","ATR","Chop","TrendDn","VW-"];

  for(let i=0;i<n;i++){
    const risk = Math.random()<0.7 ? "G" : "A";
    out.push({
      score: Math.floor(70+Math.random()*30),
      str: strA[Math.floor(Math.random()*3)],
      strat: stratA[Math.floor(Math.random()*3)],
      risk,
      cnt: 1+Math.floor(Math.random()*3),
      entry: (3800+Math.random()*800).toFixed(1),
      stop: "-" + Math.floor(Math.random()*10) + "t",
      target: "+" + Math.floor(Math.random()*25) + "t",
      rr: (1.2+Math.random()*2.2).toFixed(2),
      tags: tagA.sort(() => 0.5-Math.random()).slice(0,3).join(" "),
      trend: trendA[Math.floor(Math.random()*3)],
      mins: Math.floor(Math.random()*30),
      spark: buildSpark(risk),
      upd: (9+Math.floor(Math.random()*2)) + ":" + (40+Math.floor(Math.random()*20))
    });
  }
  return out;
}

document.addEventListener("DOMContentLoaded", ()=>{
  const rows = genRows(30);
  const c = document.getElementById("rows");

  rows.forEach((r,i)=>{
    const row=document.createElement("div");
    row.className="relative grid grid-cols-[60px,40px,70px,60px,52px,96px,80px,88px,56px,200px,56px,60px,100px,70px] px-4 py-2 border-b hover:bg-white/5 transition text-[12px]";
    row.style.borderColor="var(--border)";

    if(r.mins<5) row.style.animation="expiring 3s infinite alternate";
    if(i%7===0) row.style.animation="pulse .8s ease";

    row.innerHTML=`
      <div class="text-right mono">${r.score}</div>
      <div class="text-center">${r.str}</div>
      <div class="text-center">${r.strat}</div>
      <div class="text-center">
        <span class="px-2 py-0.5 rounded-full text-xs"
          style="background:${r.risk==="G"?"rgba(16,185,129,0.15)":"rgba(251,191,36,0.15)"};color:${r.risk==="G"?"#6EE7B7":"#FBBF24"};">
          ${r.risk}
        </span>
      </div>
      <div class="text-center mono">${r.cnt}</div>
      <div class="text-right mono">${r.entry}</div>
      <div class="text-right mono text-red-300">${r.stop}</div>
      <div class="text-right mono text-emerald-300">${r.target}</div>
      <div class="text-center mono">${r.rr}</div>
      <div class="text-xs" style="color:var(--text-secondary);">${r.tags}</div>
      <div class="text-center">${r.trend}</div>
      <div class="text-center mono" style="color:var(--text-secondary);">${r.mins}m</div>
      <div class="text-center">${r.spark}</div>
      <div class="text-center mono" style="color:var(--text-secondary);">${r.upd}</div>
    `;

    c.appendChild(row);
  });
});
</script>

<div class="min-h-screen flex flex-col">

<header class="px-6 py-4 border-b" style="background:var(--bg-header);border-color:var(--border);">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold">Worklist</h1>
      <p class="text-sm" style="color:var(--text-secondary);">Live signals mock</p>
    </div>
    <button onclick="toggleTheme()" class="px-3 py-1 rounded border text-sm"
            style="border-color:var(--border);color:var(--text-secondary);">
      Toggle Theme
    </button>
  </div>
</header>

<section class="px-6 py-3 border-b" style="background:var(--bg-header);border-color:var(--border);">
  <div class="flex items-center gap-2 flex-wrap text-sm">
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Symbol ▾</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Strategy ▾</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Score ≥ ▾</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Risk G/A</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">≤30m</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Sort ▾</button>
    <button class="px-3 py-1 rounded border" style="border-color:var(--border);">Mute: ORR|OSB|VWFT</button>

    <div class="flex items-center ml-auto px-3 py-1 rounded border" style="border-color:var(--border);">
      <span class="mr-2" style="color:var(--text-muted);">🔍</span>
      <input placeholder="Search…" class="bg-transparent outline-none text-sm" style="color:var(--text);" />
    </div>
  </div>
</section>

<div class="flex flex-1 px-6 py-4 gap-4">
  <div class="flex-1 rounded-lg border overflow-auto"
       style="border-color:var(--border);background:var(--bg-panel);">

    <div class="px-4 py-2 border-b text-xs font-medium"
         style="border-color:var(--border);color:var(--text-secondary);">
      WORKLIST TABLE — TRADEABLE SIGNALS ONLY
    </div>

    <div class="grid grid-cols-[60px,40px,70px,60px,52px,96px,80px,88px,56px,200px,56px,60px,100px,70px]
                px-4 py-2 border-b text-[11px] font-medium"
         style="border-color:var(--border);background:var(--bg-header);color:var(--text-secondary);">
      <div class="text-right">Score</div>
      <div class="text-center">Str</div>
      <div class="text-center">Strat</div>
      <div class="text-center">Risk</div>
      <div class="text-center">Cnt</div>
      <div class="text-right">Entry</div>
      <div class="text-right">Stop</div>
      <div class="text-right">Target</div>
      <div class="text-center">R:R</div>
      <div>Context Tags</div>
      <div class="text-center">Trend</div>
      <div class="text-center">Time</div>
      <div class="text-center">Spark</div>
      <div class="text-center">Upd</div>
    </div>

    <div id="rows"></div>
  </div>

  <aside class="w-[360px] rounded-lg border p-4"
         style="border-color:var(--border);background:var(--bg-panel);color:var(--text-secondary);">
    <p class="text-xs font-medium">DETAIL PANEL — CLICK A ROW</p>
    <p class="text-xs mt-2">Mock focuses on table generation + animations.</p>
  </aside>
</div>

</div>
</body>
</html>
EON

# 3. Create server.js on fixed port 3200
cat > server.js << 'EON'
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3200; // fixed safe port

const server = http.createServer((req, res) => {
  const filePath = path.join(process.cwd(), "index.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading index.html");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`=== Worklist mock running at http://localhost:${PORT} ===`);
});
EON

echo "=== STARTING MOCK SERVER ON http://localhost:3200 ==="
node server.js

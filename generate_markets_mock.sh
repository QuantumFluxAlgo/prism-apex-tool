#!/usr/bin/env bash
set -e

echo "=== PRISM APEX — GENERATING MARKETS MOCK (PORT 3200, NO NPM) ==="

# 1. Clean + recreate folder
rm -rf markets-mock
mkdir markets-mock
cd markets-mock

# 2. Create index.html
cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <title>Markets Mock</title>

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
      --candle-up: #10B981;
      --candle-down: #F97373;
      --atr-band: rgba(66,226,244,0.18);
      --or-fill: rgba(66,226,244,0.12);
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
      --candle-up: #16A34A;
      --candle-down: #DC2626;
      --atr-band: rgba(15,118,110,0.10);
      --or-fill: rgba(8,47,73,0.10);
    }

    body {
      background: var(--bg);
      color: var(--text);
      transition: background 0.25s ease, color 0.25s ease;
    }

    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
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

// Generate fake market data: 300 candles
function generateMarketData(n = 300) {
  const data = [];
  let price = 4500;
  let vwapSum = 0;
  let volBase = 3;

  for (let i = 0; i < n; i++) {
    const drift = (Math.random() - 0.5) * 4;
    const vol = volBase + Math.random() * 4;
    const open = price;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * vol;
    const low = Math.min(open, close) - Math.random() * vol;
    price = close;

    const typical = (high + low + close) / 3;
    vwapSum += typical;
    const vwap = vwapSum / (i + 1);

    // Fake ATR band: center line +/- scaled volatility
    const mid = (high + low) / 2;
    const atrOffset = 10 + Math.sin(i / 20) * 4;
    const atrUpper = mid + atrOffset;
    const atrLower = mid - atrOffset;

    // Mark OR range for first ~40 bars
    const isOr = i < 40;

    // Occasionally mark signals
    const hasSignal = Math.random() < 0.06;
    const strategies = ["ORR","OSB","VWFT"];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    const riskLevels = ["G","A","R"];
    const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];

    data.push({
      idx: i,
      open,
      high,
      low,
      close,
      vwap,
      atrUpper,
      atrLower,
      isOr,
      hasSignal,
      strategy,
      risk
    });
  }

  return data;
}

function renderChart(data) {
  const svg = document.getElementById("market-chart");
  const width = 900;
  const height = 320;
  const topPad = 10;
  const bottomPad = 20;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const prices = data.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pxRange = maxPrice - minPrice || 1;

  const orBars = data.filter(d => d.isOr);
  const orHigh = orBars.length ? Math.max(...orBars.map(d => d.high)) : maxPrice;
  const orLow = orBars.length ? Math.min(...orBars.map(d => d.low)) : minPrice;

  const xStep = width / data.length;
  const candleWidth = Math.max(2, xStep * 0.5);

  function yScale(price) {
    return topPad + (1 - (price - minPrice) / pxRange) * (height - topPad - bottomPad);
  }

  let candles = "";
  let vwapPoints = "";
  let atrUpperPoints = "";
  let atrLowerPoints = "";
  let signals = "";

  // OR background band
  const orX = 0;
  const orW = xStep * orBars.length;
  const orY = yScale(orHigh);
  const orH = yScale(orLow) - orY;
  const orRect = `
    <rect x="${orX}" y="${orY}"
          width="${orW}" height="${orH}"
          fill="var(--or-fill)" />
  `;

  data.forEach((d, i) => {
    const xCenter = i * xStep + xStep / 2;
    const yOpen = yScale(d.open);
    const yClose = yScale(d.close);
    const yHigh = yScale(d.high);
    const yLow = yScale(d.low);

    const isUp = d.close >= d.open;
    const color = isUp ? "var(--candle-up)" : "var(--candle-down)";

    const bodyY = Math.min(yOpen, yClose);
    const bodyH = Math.max(2, Math.abs(yClose - yOpen));

    // Wick
    candles += `
      <line x1="${xCenter}" y1="${yHigh}" x2="${xCenter}" y2="${yLow}"
            stroke="${color}" stroke-width="1.2" stroke-linecap="round" />
    `;
    // Body
    candles += `
      <rect x="${xCenter - candleWidth/2}" y="${bodyY}"
            width="${candleWidth}" height="${bodyH}"
            fill="${color}" rx="1" />
    `;

    const yVWAP = yScale(d.vwap);
    vwapPoints += `${xCenter},${yVWAP} `;

    const yATRU = yScale(d.atrUpper);
    const yATRL = yScale(d.atrLower);
    atrUpperPoints += `${xCenter},${yATRU} `;
    atrLowerPoints += `${xCenter},${yATRL} `;

    if (d.hasSignal) {
      const ySig = yScale(d.close);
      let fill;
      if (d.risk === "G") fill = "#22C55E";
      else if (d.risk === "A") fill = "#FACC15";
      else fill = "#F97373";

      if (d.strategy === "ORR") {
        // Square
        const size = 10;
        signals += `
          <rect x="${xCenter - size/2}" y="${ySig - size/2}"
                width="${size}" height="${size}"
                fill="${fill}" opacity="0.9" />
        `;
      } else if (d.strategy === "OSB") {
        // Triangle
        const size = 11;
        const x1 = xCenter;
        const y1 = ySig - size/2;
        const x2 = xCenter - size/2;
        const y2 = ySig + size/2;
        const x3 = xCenter + size/2;
        const y3 = ySig + size/2;
        signals += `
          <polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}"
                   fill="${fill}" opacity="0.9" />
        `;
      } else {
        // VWFT: circle
        const r = 5;
        signals += `
          <circle cx="${xCenter}" cy="${ySig}" r="${r}"
                  fill="${fill}" opacity="0.9" />
        `;
      }
    }
  });

  const vwapPath = `
    <polyline points="${vwapPoints.trim()}"
              fill="none"
              stroke="var(--accent)"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round" />
  `;

  const atrUpperPath = `
    <polyline points="${atrUpperPoints.trim()}"
              fill="none"
              stroke="var(--atr-band)"
              stroke-width="1"
              stroke-linecap="round" />
  `;
  const atrLowerPath = `
    <polyline points="${atrLowerPoints.trim()}"
              fill="none"
              stroke="var(--atr-band)"
              stroke-width="1"
              stroke-linecap="round" />
  `;

  svg.innerHTML = `
    ${orRect}
    ${atrUpperPath}
    ${atrLowerPath}
    ${candles}
    ${vwapPath}
    ${signals}
  `;
}

// Fake context metrics from data
function computeContext(data) {
  const orBars = data.filter(d => d.isOr);
  const orHigh = orBars.length ? Math.max(...orBars.map(d => d.high)) : 0;
  const orLow = orBars.length ? Math.min(...orBars.map(d => d.low)) : 0;
  const orWidth = orHigh && orLow ? (orHigh - orLow).toFixed(2) : "0.00";
  const orMid = orHigh && orLow ? ((orHigh + orLow) / 2).toFixed(2) : "0.00";

  const last = data[data.length - 1];
  const firstVWAP = data[0].vwap;
  const lastVWAP = last.vwap;
  const vwapSlope = (lastVWAP - firstVWAP).toFixed(2);

  const atrSample = data.slice(-20);
  const atrVals = atrSample.map(d => d.atrUpper - d.atrLower);
  const avgAtr = atrVals.length
    ? (atrVals.reduce((a,b)=>a+b,0) / atrVals.length).toFixed(2)
    : "0.00";

  const volatilityState =
    avgAtr > 25 ? "High" :
    avgAtr > 15 ? "Normal" : "Low";

  const trendState =
    last.close > data[0].close + 20 ? "Trend Up" :
    last.close < data[0].close - 20 ? "Trend Down" :
    "Chop";

  const orBreakout =
    last.close > orHigh ? "Above OR High" :
    last.close < orLow ? "Below OR Low" :
    "Inside OR";

  return {
    orWidth,
    orMid,
    vwapSlope,
    vwapDev: (last.close - lastVWAP).toFixed(2),
    atr: avgAtr,
    volState: volatilityState,
    trendState,
    orBreakout
  };
}

function renderContextCards(ctx) {
  document.getElementById("session-metrics").innerHTML = `
    <div class="text-[11px] font-medium" style="color:var(--text-secondary);">
      Session Metrics
    </div>
    <div class="mt-2 space-y-1 text-[11px]">
      <div><span style="color:var(--text-secondary);">OR Width</span> <span class="mono">${ctx.orWidth}</span></div>
      <div><span style="color:var(--text-secondary);">OR Midpoint</span> <span class="mono">${ctx.orMid}</span></div>
      <div><span style="color:var(--text-secondary);">VWAP Slope</span> <span class="mono">${ctx.vwapSlope}</span></div>
      <div><span style="color:var(--text-secondary);">VWAP Deviation</span> <span class="mono">${ctx.vwapDev}</span></div>
    </div>
  `;

  document.getElementById("vol-metrics").innerHTML = `
    <div class="text-[11px] font-medium" style="color:var(--text-secondary);">
      Volatility & Regime
    </div>
    <div class="mt-2 space-y-1 text-[11px]">
      <div><span style="color:var(--text-secondary);">ATR (n-bars)</span> <span class="mono">${ctx.atr}</span></div>
      <div><span style="color:var(--text-secondary);">Volatility</span> <span class="mono">${ctx.volState}</span></div>
      <div><span style="color:var(--text-secondary);">Trend</span> <span class="mono">${ctx.trendState}</span></div>
      <div><span style="color:var(--text-secondary);">OR Breakout</span> <span class="mono">${ctx.orBreakout}</span></div>
    </div>
  `;

  document.getElementById("active-strats").innerHTML = `
    <div class="text-[11px] font-medium" style="color:var(--text-secondary);">
      Active Strategies
    </div>
    <div class="mt-2 space-y-1 text-[11px]">
      <div>ORR <span class="mono" style="color:#6EE7B7;">Enabled</span></div>
      <div>OSB <span class="mono" style="color:#6EE7B7;">Enabled</span></div>
      <div>VWFT <span class="mono" style="color:#6EE7B7;">Enabled</span></div>
    </div>
  `;
}

// Bottom signal strip — mini tickets
function generateSignalsFromData(data, n = 12) {
  const signals = data.filter(d => d.hasSignal);
  if (!signals.length) return [];
  const recent = signals.slice(-n);

  return recent.map(d => {
    const hh = String(9 + Math.floor(d.idx / 60)).padStart(2, "0");
    const mm = String(d.idx % 60).padStart(2, "0");
    const time = `${hh}:${mm}`;
    const statusOptions = ["Actioned","Rejected","Expired","Downranked"];
    const status = statusOptions[Math.floor(Math.random()*statusOptions.length)];
    const score = Math.floor(70 + Math.random()*25);
    const entry = d.close.toFixed(1);
    const stop = "-" + (4 + Math.floor(Math.random()*8)) + "t";
    const target = "+" + (8 + Math.floor(Math.random()*20)) + "t";
    return {
      time,
      strat: d.strategy,
      score,
      risk: d.risk,
      status,
      entry,
      stop,
      target
    };
  });
}

function renderSignalStrip(signals) {
  const c = document.getElementById("signal-strip-rows");
  c.innerHTML = "";
  signals.forEach((s, i) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-[70px,70px,60px,52px,90px,90px,90px,1fr] px-3 py-1.5 border-b text-[11px]";
    row.style.borderColor = "var(--border)";

    let riskBg, riskColor;
    if (s.risk === "G") {
      riskBg = "rgba(16,185,129,0.15)";
      riskColor = "#6EE7B7";
    } else if (s.risk === "A") {
      riskBg = "rgba(251,191,36,0.15)";
      riskColor = "#FBBF24";
    } else {
      riskBg = "rgba(248,113,113,0.15)";
      riskColor = "#F97373";
    }

    let statusColor;
    switch (s.status) {
      case "Actioned": statusColor = "#6EE7B7"; break;
      case "Rejected": statusColor = "#F97373"; break;
      case "Expired": statusColor = "#FBBF24"; break;
      default: statusColor = "#CBD5F5";
    }

    row.innerHTML = `
      <div class="mono">${s.time}</div>
      <div>${s.strat}</div>
      <div class="mono text-right">${s.score}</div>
      <div class="text-center">
        <span class="px-1.5 py-0.5 rounded-full"
              style="background:${riskBg};color:${riskColor};font-size:10px;">
          ${s.risk}
        </span>
      </div>
      <div style="color:${statusColor};">${s.status}</div>
      <div class="mono text-right">${s.entry}</div>
      <div class="mono text-right" style="color:#F97373;">${s.stop}</div>
      <div class="mono text-right" style="color:#10B981;">${s.target}</div>
    `;
    c.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const data = generateMarketData(300);
  renderChart(data);
  const ctx = computeContext(data);
  renderContextCards(ctx);
  const signals = generateSignalsFromData(data, 12);
  renderSignalStrip(signals);
});
</script>

<div class="min-h-screen flex flex-col">

  <!-- TOP CONTROLS BAR -->
  <header class="px-6 py-4 border-b" style="background:var(--bg-header);border-color:var(--border);">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 flex-wrap text-[12px]">
        <button class="px-3 py-1 rounded-full border" style="border-color:var(--border);">
          ES ▾
        </button>
        <button class="px-3 py-1 rounded-full border" style="border-color:var(--border);">
          1m ▾
        </button>
        <button class="px-3 py-1 rounded-full border" style="border-color:var(--border);">
          Session: RTH ▾
        </button>
        <button class="px-3 py-1 rounded-full border flex items-center gap-1"
                style="border-color:var(--border);">
          Overlays
          <span class="text-[10px]" style="color:var(--text-muted);">VWAP • OR • ATR • Signals</span>
        </button>
        <button class="px-3 py-1 rounded-full border" style="border-color:var(--border);">
          Compare ▾
        </button>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-[11px]" style="color:var(--text-secondary);">
          <span>Scrub</span>
          <div class="w-40 h-[3px] rounded-full bg-[rgba(148,163,184,0.4)] relative">
            <div class="absolute left-1/2 -translate-x-1/2 top-[-3px] w-3 h-3 rounded-full bg-[rgba(66,226,244,0.9)]"></div>
          </div>
        </div>
        <button onclick="toggleTheme()" class="px-3 py-1 rounded-full border text-[11px]"
                style="border-color:var(--border);color:var(--text-secondary);">
          Toggle Theme
        </button>
      </div>
    </div>
  </header>

  <!-- MAIN AREA -->
  <div class="flex flex-1 px-6 py-4 gap-4">

    <!-- CHART AREA -->
    <div class="flex-1 rounded-lg border p-3 flex flex-col gap-2"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="flex items-center justify-between text-[11px]" style="color:var(--text-secondary);">
        <div>Price · VWAP · OR · ATR · Signals</div>
        <div class="mono">ES · 1m · RTH</div>
      </div>

      <div class="border rounded-lg overflow-hidden"
           style="border-color:var(--border);background:rgba(15,17,22,0.9);">
        <svg id="market-chart" class="w-full h-72"></svg>
      </div>

      <div class="flex items-center justify-between text-[11px]" style="color:var(--text-muted);">
        <div>Session: Today · RTH · Time Scrubber (visual only)</div>
        <div class="flex items-center gap-4">
          <span>Zoom</span>
          <div class="flex gap-1">
            <button class="px-2 py-0.5 rounded border" style="border-color:var(--border);">-</button>
            <button class="px-2 py-0.5 rounded border" style="border-color:var(--border);">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTEXT CARDS -->
    <aside class="w-[320px] flex-shrink-0 space-y-3">
      <div class="rounded-lg border p-3 shadow-sm"
           style="border-color:var(--border);background:rgba(26,29,35,0.9);box-shadow:0 0 0 1px rgba(66,226,244,0.08),0 12px 30px rgba(15,23,42,0.6);"
           id="session-metrics">
      </div>

      <div class="rounded-lg border p-3 shadow-sm"
           style="border-color:var(--border);background:rgba(26,29,35,0.9);box-shadow:0 0 0 1px rgba(66,226,244,0.08),0 12px 30px rgba(15,23,42,0.6);"
           id="vol-metrics">
      </div>

      <div class="rounded-lg border p-3 shadow-sm"
           style="border-color:var(--border);background:rgba(26,29,35,0.9);box-shadow:0 0 0 1px rgba(66,226,244,0.08),0 12px 30px rgba(15,23,42,0.6);"
           id="active-strats">
      </div>
    </aside>
  </div>

  <!-- SIGNAL STRIP -->
  <section class="px-6 pb-4">
    <div class="rounded-lg border"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="px-3 py-2 border-b text-[11px] font-medium"
           style="border-color:var(--border);color:var(--text-secondary);">
        LAST SIGNALS — CURRENT SYMBOL
      </div>
      <div class="grid grid-cols-[70px,70px,60px,52px,90px,90px,90px,1fr] px-3 py-1.5 border-b text-[10px] font-medium"
           style="border-color:var(--border);color:var(--text-secondary);background:var(--bg-header);">
        <div>Time</div>
        <div>Strategy</div>
        <div class="text-right">Score</div>
        <div class="text-center">Risk</div>
        <div>Status</div>
        <div class="text-right">Entry</div>
        <div class="text-right">Stop</div>
        <div class="text-right">Target</div>
      </div>
      <div id="signal-strip-rows"></div>
    </div>
  </section>
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
  console.log(`=== Markets mock running at http://localhost:${PORT} ===`);
});
EON

echo "=== STARTING MARKETS MOCK SERVER ON http://localhost:3200 ==="
node server.js

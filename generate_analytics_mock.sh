#!/usr/bin/env bash
set -e

echo "=== PRISM APEX — GENERATING ANALYTICS MOCK (PORT 3200, NO NPM) ==="

rm -rf analytics-mock
mkdir analytics-mock
cd analytics-mock

cat > index.html << 'EON'
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <title>Analytics – Prism Apex</title>

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
      --bar-pos: #10B981;
      --bar-neg: #F97373;
      --line-score: #FACC15;
      --heat-low: #1E293B;
      --heat-mid: #0EA5E9;
      --heat-high: #22C55E;
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
      --bar-pos: #16A34A;
      --bar-neg: #DC2626;
      --line-score: #EAB308;
      --heat-low: #E5E7EB;
      --heat-mid: #0EA5E9;
      --heat-high: #16A34A;
    }

    body {
      background: var(--bg);
      color: var(--text);
      transition: background 0.25s ease, color 0.25s ease;
    }

    @keyframes subtlePulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }
  </style>
</head>

<body class="theme-dark h-full">

<script>
// THEME
function toggleTheme() {
  const b = document.body;
  b.classList.toggle("theme-dark");
  b.classList.toggle("theme-light");
}

// -------- FAKE DATA GENERATION --------

function generateDailySeries(n = 24) {
  const days = [];
  let score = 78;
  for (let i = 0; i < n; i++) {
    const date = "D" + (i + 1);
    const pnl = (Math.random() - 0.35) * 500;
    score += (Math.random() - 0.5) * 4;
    if (score < 65) score = 65 + Math.random()*3;
    if (score > 92) score = 92 - Math.random()*3;
    days.push({
      label: date,
      pnl: Math.round(pnl),
      score: parseFloat(score.toFixed(1))
    });
  }
  return days;
}

function generateRegimeHeatmap() {
  const regimes = ["Trend Up","Trend Down","Range","Chop","OR Break"];
  const vols = ["Low","Normal","High"];
  const cells = [];
  regimes.forEach(r => {
    vols.forEach(v => {
      let base = 45 + Math.random()*30;
      if (r === "Trend Up" && v !== "High") base += 10;
      if (r === "Trend Down" && v === "High") base -= 8;
      if (r === "Chop" && v === "Low") base -= 5;
      const win = Math.max(25, Math.min(85, base));
      cells.push({
        regime: r,
        vol: v,
        winRate: parseFloat(win.toFixed(1))
      });
    });
  });
  return { regimes, vols, cells };
}

function generateDriftSeries(n = 24) {
  const pts = [];
  let score = 80;
  let rr = 1.9;
  for (let i = 0; i < n; i++) {
    score += (Math.random() - 0.5) * 3;
    rr += (Math.random() - 0.5) * 0.25;
    if (score < 65) score = 65 + Math.random()*2;
    if (score > 92) score = 92 - Math.random()*2;
    if (rr < 1.0) rr = 1.0 + Math.random()*0.2;
    if (rr > 3.2) rr = 3.2 - Math.random()*0.2;
    pts.push({
      idx: i,
      score: parseFloat(score.toFixed(1)),
      rr: parseFloat(rr.toFixed(2))
    });
  }
  return pts;
}

function generateConfigImpacts() {
  const configs = [
    "Current Config",
    "Suggested – Tighter Stops",
    "Suggested – Higher Score Cutoff",
    "Suggested – Risk Trimmed",
    "Suggested – News Filtered"
  ];
  return configs.map((name, idx) => {
    const isCurrent = idx === 0;
    const pnlDelta = isCurrent ? 0 : (Math.random() - 0.2) * 12;
    const currentWin = 54 + Math.random()*8;
    const winRate = isCurrent
      ? currentWin
      : currentWin + (Math.random() - 0.2) * 6;
    const currentDD = -3 - Math.random()*3;
    const dd = isCurrent
      ? currentDD
      : currentDD + (Math.random() - 0.3) * 2;
    return {
      name,
      isCurrent,
      pnlDelta: parseFloat(pnlDelta.toFixed(1)),
      winRate: parseFloat(winRate.toFixed(1)),
      drawdown: parseFloat(dd.toFixed(1))
    };
  });
}

function generateStrategyTable() {
  const strategies = ["ORR","OSB","VWFT"];
  const symbols = ["ES","NQ","CL","RTY"];
  const atrNotes = ["High ATR","Low ATR","Mixed ATR","Medium ATR"];
  const flags = [
    "Strong in Uptrend",
    "Weak in Chop",
    "Struggles in Low ATR",
    "High variance TrendDown",
    "VWAP mean reversion strong"
  ];
  const rows = [];
  strategies.forEach(strat => {
    symbols.forEach(sym => {
      const tickets = 20 + Math.floor(Math.random()*80);
      const winRate = 40 + Math.random()*30;
      const score = 75 + Math.random()*15;
      const rr = 1.3 + Math.random()*1.1;
      rows.push({
        strategy: strat,
        symbol: sym,
        tickets,
        winRate: parseFloat(winRate.toFixed(1)),
        avgScore: parseFloat(score.toFixed(1)),
        avgRR: parseFloat(rr.toFixed(2)),
        atrUsed: atrNotes[Math.floor(Math.random()*atrNotes.length)],
        notes: flags[Math.floor(Math.random()*flags.length)]
      });
    });
  });
  return rows;
}

// -------- KPIs --------

function renderKpis(days, stratRows) {
  const totalTickets = stratRows.reduce((a,r)=>a + r.tickets, 0);
  const totalWinsApprox = stratRows.reduce((a,r)=>a + r.tickets * (r.winRate/100), 0);
  const winRateAll = totalTickets ? (100 * totalWinsApprox / totalTickets) : 0;
  const avgScoreActioned = stratRows.length
    ? stratRows.reduce((a,r)=>a + r.avgScore, 0) / stratRows.length
    : 0;
  const maxDrawdownSim = - (2.0 + Math.random()*4.0);

  const kpiEl = document.getElementById("kpi-grid");
  kpiEl.innerHTML = `
    <div class="rounded-lg border p-3"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="text-[11px] uppercase tracking-wide"
           style="color:var(--text-secondary);">
        Total Tickets
      </div>
      <div class="mt-1 text-xl font-semibold mono">
        ${totalTickets}
      </div>
      <div class="text-[11px]" style="color:var(--text-muted);">
        Across current filters
      </div>
    </div>

    <div class="rounded-lg border p-3"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="text-[11px] uppercase tracking-wide"
           style="color:var(--text-secondary);">
        Win Rate
      </div>
      <div class="mt-1 text-xl font-semibold mono">
        ${winRateAll.toFixed(1)}%
      </div>
      <div class="text-[11px]" style="color:var(--text-muted);">
        All strategies & symbols
      </div>
    </div>

    <div class="rounded-lg border p-3"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="text-[11px] uppercase tracking-wide"
           style="color:var(--text-secondary);">
        Avg Score (Actioned)
      </div>
      <div class="mt-1 text-xl font-semibold mono">
        ${avgScoreActioned.toFixed(1)}
      </div>
      <div class="text-[11px]" style="color:var(--text-muted);">
        Composite signal quality
      </div>
    </div>

    <div class="rounded-lg border p-3"
         style="border-color:var(--border);background:var(--bg-panel);">
      <div class="text-[11px] uppercase tracking-wide"
           style="color:var(--text-secondary);">
        Max Drawdown (Sim)
      </div>
      <div class="mt-1 text-xl font-semibold mono" style="color:#F97373;">
        ${maxDrawdownSim.toFixed(1)}%
      </div>
      <div class="text-[11px]" style="color:var(--text-muted);">
        Based on sampled history
      </div>
    </div>
  `;
}

// -------- CHARTS --------

function renderPnlScoreChart(days) {
  const svg = document.getElementById("pnl-score-chart");
  const width = 640;
  const height = 240;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 10;
  const padBottom = 26;

  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("preserveAspectRatio","none");

  const pnls = days.map(d=>d.pnl);
  const scores = days.map(d=>d.score);
  const minP = Math.min(0, ...pnls);
  const maxP = Math.max(...pnls);
  const pRange = (maxP - minP) || 1;
  const minS = 60;
  const maxS = 100;
  const sRange = maxS - minS;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const step = innerWidth / days.length;
  const barWidth = step * 0.6;

  function yPnl(v) {
    const norm = (v - minP) / pRange;
    return padTop + (1 - norm) * innerHeight;
  }
  function yScore(v) {
    const norm = (v - minS) / sRange;
    return padTop + (1 - norm) * innerHeight;
  }

  const yZero = yPnl(0);

  let grid = `
    <line x1="${padLeft}" y1="${yZero}" x2="${padLeft+innerWidth}" y2="${yZero}"
          stroke="rgba(148,163,184,0.6)" stroke-width="1" stroke-dasharray="4 3" />
  `;

  let bars = "";
  let scorePoints = "";

  days.forEach((d, i) => {
    const cx = padLeft + i * step + step / 2;
    const yVal = yPnl(d.pnl);
    const isPos = d.pnl >= 0;
    const barH = Math.max(2, Math.abs(yVal - yZero));
    const barY = isPos ? yVal : yZero;
    const color = isPos ? "var(--bar-pos)" : "var(--bar-neg)";

    bars += `
      <rect x="${cx - barWidth/2}" y="${barY}"
            width="${barWidth}" height="${barH}"
            fill="${color}" opacity="0.9" rx="2" />
    `;

    const yS = yScore(d.score);
    scorePoints += cx + "," + yS + " ";
  });

  const scorePath = `
    <polyline points="${scorePoints.trim()}"
              fill="none"
              stroke="var(--line-score)"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round" />
  `;

  svg.innerHTML = grid + bars + scorePath;
}

function renderRegimeHeatmap(heat) {
  const svg = document.getElementById("regime-heatmap");
  const width = 320;
  const height = 220;
  const padLeft = 80;
  const padTop = 24;
  const cellW = 55;
  const cellH = 30;

  svg.setAttribute("viewBox","0 0 " + width + " " + height);
  svg.setAttribute("preserveAspectRatio","none");

  let content = `
    <text x="0" y="${padTop - 8}" fill="var(--text-secondary)" font-size="10">Regime</text>
    <text x="${padLeft + 8}" y="${padTop - 10}" fill="var(--text-secondary)" font-size="9">Low</text>
    <text x="${padLeft + cellW + 8}" y="${padTop - 10}" fill="var(--text-secondary)" font-size="9">Normal</text>
    <text x="${padLeft + cellW*2 + 8}" y="${padTop - 10}" fill="var(--text-secondary)" font-size="9">High</text>
  `;

  heat.regimes.forEach((r, ri) => {
    const y = padTop + ri * cellH + 18;
    content += `
      <text x="0" y="${y}" fill="var(--text-secondary)" font-size="9">${r}</text>
    `;
  });

  heat.cells.forEach(cell => {
    const ri = heat.regimes.indexOf(cell.regime);
    const vi = heat.vols.indexOf(cell.vol);
    const x = padLeft + vi * cellW;
    const y = padTop + ri * cellH;

    let fill;
    if (cell.winRate < 45) fill = "var(--heat-low)";
    else if (cell.winRate < 60) fill = "var(--heat-mid)";
    else fill = "var(--heat-high)";

    content += `
      <rect x="${x}" y="${y}" width="${cellW-6}" height="${cellH-6}"
            rx="5" fill="${fill}" opacity="0.95" />
      <text x="${x + (cellW-6)/2}" y="${y + cellH/2}"
            fill="#E5E7EB" font-size="10"
            text-anchor="middle" dominant-baseline="middle">
        ${cell.winRate.toFixed(0)}%
      </text>
    `;
  });

  svg.innerHTML = content;
}

function renderDriftChart(pts) {
  const svg = document.getElementById("drift-chart");
  const width = 320;
  const height = 220;
  const padLeft = 30;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 24;

  svg.setAttribute("viewBox","0 0 " + width + " " + height);
  svg.setAttribute("preserveAspectRatio","none");

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const step = innerWidth / Math.max(1, pts.length-1);

  const minScore = 60;
  const maxScore = 100;
  const minRR = 1.0;
  const maxRR = 3.2;

  function yScore(v) {
    const norm = (v - minScore) / (maxScore - minScore);
    return padTop + (1 - norm)*innerHeight;
  }
  function yRR(v) {
    const norm = (v - minRR) / (maxRR - minRR);
    return padTop + (1 - norm)*innerHeight;
  }

  let scorePts = "";
  let rrPts = "";

  pts.forEach((p, i) => {
    const x = padLeft + i * step;
    scorePts += x + "," + yScore(p.score) + " ";
    rrPts += x + "," + yRR(p.rr) + " ";
  });

  svg.innerHTML = `
    <polyline points="${scorePts.trim()}"
              fill="none" stroke="var(--line-score)" stroke-width="1.7" />
    <polyline points="${rrPts.trim()}"
              fill="none" stroke="var(--accent)" stroke-width="1.4"
              stroke-dasharray="4 3" />
  `;
}

function renderConfigChart(configs) {
  const svg = document.getElementById("config-chart");
  const width = 640;
  const height = 220;
  const padLeft = 40;
  const padRight = 10;
  const padTop = 18;
  const padBottom = 48;

  svg.setAttribute("viewBox","0 0 " + width + " " + height);
  svg.setAttribute("preserveAspectRatio","none");

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const step = innerWidth / configs.length;
  const barWidth = step * 0.4;

  const deltas = configs.map(c=>c.pnlDelta);
  const minD = Math.min(-5, ...deltas);
  const maxD = Math.max(5, ...deltas);
  const range = maxD - minD || 1;

  function yDelta(v){
    const norm = (v - minD) / range;
    return padTop + (1 - norm)*innerHeight;
  }
  const yZero = yDelta(0);

  let content = `
    <line x1="${padLeft}" y1="${yZero}" x2="${padLeft+innerWidth}" y2="${yZero}"
          stroke="rgba(148,163,184,0.6)" stroke-width="1" stroke-dasharray="4 3" />
  `;

  configs.forEach((c, i) => {
    const cx = padLeft + i*step + step/2;
    const yV = yDelta(c.pnlDelta);
    const isPos = c.pnlDelta >= 0;
    const barY = isPos ? yV : yZero;
    const barH = Math.max(2, Math.abs(yZero - yV));

    const color = c.isCurrent ? "rgba(148,163,184,0.9)" : "var(--accent)";

    content += `
      <rect x="${cx-barWidth/2}" y="${barY}"
            width="${barWidth}" height="${barH}"
            fill="${color}" opacity="0.95" rx="3" />
      <text x="${cx}" y="${height-28}" text-anchor="middle"
            font-size="9" fill="var(--text-secondary)">
        ${c.name.replace("Suggested – ","")}
      </text>
      <text x="${cx}" y="${height-12}" text-anchor="middle"
            font-size="9" fill="var(--text-muted)">
        ΔPnL ${c.pnlDelta.toFixed(1)}
      </text>
    `;
  });

  svg.innerHTML = content;
}

// -------- STRATEGY TABLE --------

function renderStrategyTable(rows) {
  const c = document.getElementById("strategy-rows");
  c.innerHTML = "";
  rows.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-[70px,70px,70px,70px,70px,80px,1fr] px-3 py-1.5 border-b text-[11px]";
    row.style.borderColor = "var(--border)";
    if (idx < 3) {
      row.style.animation = "subtlePulse 3s ease-in-out infinite";
    }

    row.innerHTML = `
      <div class="mono">${r.strategy}</div>
      <div class="mono">${r.symbol}</div>
      <div class="mono text-right">${r.tickets}</div>
      <div class="mono text-right">${r.winRate.toFixed(1)}%</div>
      <div class="mono text-right">${r.avgScore.toFixed(1)}</div>
      <div class="mono text-right">${r.avgRR.toFixed(2)}</div>
      <div class="text-[11px]">
        <span style="color:var(--text-secondary);">${r.atrUsed}</span>
        <span style="color:var(--text-muted);"> · ${r.notes}</span>
      </div>
    `;
    c.appendChild(row);
  });
}

// -------- INIT --------

document.addEventListener("DOMContentLoaded", () => {
  const daily = generateDailySeries(24);
  const heat = generateRegimeHeatmap();
  const drift = generateDriftSeries(24);
  const configs = generateConfigImpacts();
  const stratRows = generateStrategyTable();

  renderKpis(daily, stratRows);
  renderPnlScoreChart(daily);
  renderRegimeHeatmap(heat);
  renderDriftChart(drift);
  renderConfigChart(configs);
  renderStrategyTable(stratRows);
});
</script>

<div class="min-h-screen flex flex-col">

  <!-- FILTER BAR (sticky, same pattern as other pages) -->
  <header class="px-6 py-3 border-b sticky top-0 z-30"
          style="background:var(--bg-header);border-color:var(--border);">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-[11px] flex-wrap">
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Date Range ▾
        </button>
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Symbol ▾
        </button>
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Strategy ▾
        </button>
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Regime ▾
        </button>
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Volatility ▾
        </button>
        <button class="px-3 py-1 rounded-full border"
                style="border-color:var(--border);">
          Session ▾
        </button>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center px-3 py-1 rounded-full border"
             style="border-color:var(--border);">
          <span class="mr-2" style="color:var(--text-muted);">🔍</span>
          <input placeholder="Search symbol / strategy notes…"
                 class="bg-transparent outline-none text-[11px]"
                 style="color:var(--text);" />
        </div>
        <button onclick="toggleTheme()"
                class="px-3 py-1 rounded-full border text-[11px]"
                style="border-color:var(--border);color:var(--text-secondary);">
          Theme
        </button>
      </div>
    </div>
  </header>

  <!-- TITLE -->
  <section class="px-6 pt-4 pb-2">
    <div>
      <h1 class="text-xl font-semibold">Analytics</h1>
      <p class="text-sm" style="color:var(--text-secondary);">
        Performance insights across strategies, regimes, and configs.
      </p>
    </div>
  </section>

  <!-- KPI STRIP -->
  <section class="px-6 pb-4">
    <div id="kpi-grid"
         class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    </div>
  </section>

  <!-- MAIN GRID -->
  <main class="flex-1 px-6 pb-5 flex flex-col gap-4">

    <div class="flex flex-col lg:flex-row gap-4">
      <!-- PnL / Score by Day -->
      <div class="flex-1 rounded-lg border p-3 flex flex-col gap-2"
           style="border-color:var(--border);background:var(--bg-panel);">
        <div class="flex items-center justify-between text-[11px]"
             style="color:var(--text-secondary);">
          <span>PnL / Score by Day</span>
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1">
              <span class="w-3 h-[3px] rounded-full"
                    style="background:var(--bar-pos);"></span>
              <span>Day PnL</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-[3px] rounded-full"
                    style="background:var(--line-score);"></span>
              <span>Score</span>
            </span>
          </div>
        </div>
        <div class="rounded-lg border overflow-hidden"
             style="border-color:var(--border);background:var(--bg-header);">
          <svg id="pnl-score-chart" class="w-full h-56"></svg>
        </div>
      </div>

      <!-- Win Rate Heatmap + Drift -->
      <div class="w-full lg:w-[340px] flex flex-col gap-3">
        <div class="rounded-lg border p-3"
             style="border-color:var(--border);background:var(--bg-panel);">
          <div class="text-[11px] mb-1"
               style="color:var(--text-secondary);">
            Win Rate by Regime / Volatility
          </div>
          <div class="rounded-lg border"
               style="border-color:var(--border);background:var(--bg-header);">
            <svg id="regime-heatmap" class="w-full h-52"></svg>
          </div>
        </div>

        <div class="rounded-lg border p-3"
             style="border-color:var(--border);background:var(--bg-panel);">
          <div class="text-[11px] mb-1"
               style="color:var(--text-secondary);">
            Drift Analysis — Score & R:R
          </div>
          <div class="rounded-lg border"
               style="border-color:var(--border);background:var(--bg-header);">
            <svg id="drift-chart" class="w-full h-52"></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Config Impact + Strategy Table -->
    <div class="flex flex-col xl:flex-row gap-4">
      <div class="flex-1 rounded-lg border p-3"
           style="border-color:var(--border);background:var(--bg-panel);">
        <div class="text-[11px] mb-1 flex items-center justify-between"
             style="color:var(--text-secondary);">
          <span>Config Impact Comparison — Current vs Suggested</span>
        </div>
        <div class="rounded-lg border"
             style="border-color:var(--border);background:var(--bg-header);">
          <svg id="config-chart" class="w-full h-52"></svg>
        </div>
      </div>

      <div class="w-full xl:w-[480px] rounded-lg border overflow-hidden"
           style="border-color:var(--border);background:var(--bg-panel);">
        <div class="px-3 py-2 border-b text-[11px] font-medium"
             style="border-color:var(--border);color:var(--text-secondary);">
          Strategy Performance Table
        </div>
        <div class="grid grid-cols-[70px,70px,70px,70px,70px,80px,1fr]
                    px-3 py-1.5 border-b text-[10px] font-medium"
             style="border-color:var(--border);color:var(--text-secondary);background:var(--bg-header);">
          <div>Strategy</div>
          <div>Symbol</div>
          <div class="text-right">Tickets</div>
          <div class="text-right">Win%</div>
          <div class="text-right">Avg Score</div>
          <div class="text-right">Avg R:R</div>
          <div>ATR Used / Notes</div>
        </div>
        <div id="strategy-rows"></div>
      </div>
    </div>

  </main>
</div>

</body>
</html>
EON

cat > server.js << 'EON'
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3200;

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
  console.log("=== Analytics mock running at http://localhost:" + PORT + " ===");
});
EON

echo "=== STARTING ANALYTICS MOCK SERVER ON http://localhost:3200 ==="
node server.js

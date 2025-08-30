export function vwap(bars) {
    const out = [];
    let cumulativePriceVol = 0;
    let cumulativeVol = 0;
    for (const bar of bars) {
        const vol = bar.volume ?? 1;
        const typical = (bar.high + bar.low + bar.close) / 3;
        cumulativePriceVol += typical * vol;
        cumulativeVol += vol;
        out.push(cumulativePriceVol / cumulativeVol);
    }
    return out;
}
export function filterSession(bars, start, end) {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return bars.filter((bar) => {
        const d = new Date(bar.ts);
        const h = d.getUTCHours();
        const m = d.getUTCMinutes();
        const afterStart = h > sH || (h === sH && m >= sM);
        const beforeEnd = h < eH || (h === eH && m < eM);
        return afterStart && beforeEnd;
    });
}

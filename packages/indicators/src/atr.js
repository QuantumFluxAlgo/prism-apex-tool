export function trueRange(curr, prevClose) {
  const highLow = curr.high - curr.low;
  if (prevClose === undefined) return highLow;
  return Math.max(highLow, Math.abs(curr.high - prevClose), Math.abs(curr.low - prevClose));
}
export function atrWilderSeries(bars, period = 14, opts) {
  const out = [];
  let prevClose;
  let atr;
  const trs = [];
  for (const bar of bars) {
    if (!isValidBar(bar)) {
      out.push(null);
      prevClose = bar.close;
      continue;
    }
    const tr = trueRange(bar, prevClose);
    prevClose = bar.close;
    if (trs.length < period) {
      trs.push(tr);
      if (trs.length === period) {
        atr = trs.reduce((a, b) => a + b, 0) / period;
        out.push(convert(atr, opts));
      } else {
        out.push(null);
      }
    } else {
      atr = (atr * (period - 1) + tr) / period;
      out.push(convert(atr, opts));
    }
  }
  return out;
}
function convert(value, opts) {
  if (opts?.asTicks) {
    const size = opts.tickSpec?.tickSize;
    if (!size) throw new Error('tickSpec.tickSize required when asTicks is true');
    const ticks = value / size;
    return Math.round(ticks * 1e10) / 1e10;
  }
  return value;
}
function isValidBar(bar) {
  return [bar.open, bar.high, bar.low, bar.close, bar.volume].every(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
}

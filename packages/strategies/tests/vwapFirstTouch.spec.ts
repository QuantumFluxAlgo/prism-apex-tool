import { describe, expect, it } from "vitest";
import { vwapFirstTouch } from "../src/vwapFirstTouch.js";
import { Candle } from "../src/types.js";
import { TickSpec } from "../src/inputs.js";
import { ticksBetween } from "../src/util.js";

describe("vwapFirstTouch", () => {
  const tick: TickSpec = { tickSize: 0.25 };

  function buildBars(opts: { overshoot?: number; slope?: number }) {
    const bars: Candle[] = [];
    const vwap: number[] = [];
    const atr: number[] = [];
    const slope = opts.slope ?? 0.1;
    for (let i = 0; i < 20; i++) {
      const v = 100 + i * slope;
      vwap.push(v);
      atr.push(1);
      const close = i === 19 ? v + (opts.overshoot ?? 0) : v + 1;
      bars.push({
        ts: `2024-01-01T00:${String(i).padStart(2, "0")}:00.000Z`,
        open: close,
        high: close,
        low: close,
        close,
      });
    }
    return { bars, vwap, atr };
  }

  it("produces BUY suggestion on first clean touch", () => {
    const { bars, vwap, atr } = buildBars({});
    const res = vwapFirstTouch("ESZ4", bars, vwap, atr, tick);
    expect(res).toHaveLength(1);
    const s = res[0];
    expect(s.side).toBe("BUY");
    expect(s.meta.rr).toBeGreaterThanOrEqual(1.5);
    expect(ticksBetween(s.entry, s.stop, tick.tickSize)).toBeGreaterThanOrEqual(2);
  });

  it("rejects overshoot greater than 0.25 ATR", () => {
    const { bars, vwap, atr } = buildBars({ overshoot: 0.26 });
    const res = vwapFirstTouch("ESZ4", bars, vwap, atr, tick);
    expect(res).toHaveLength(0);
  });

  it("requires positive slope for long trades", () => {
    const { bars, vwap, atr } = buildBars({ slope: -0.1, overshoot: 0.01 });
    const res = vwapFirstTouch("ESZ4", bars, vwap, atr, tick);
    expect(res).toHaveLength(0);
  });
});

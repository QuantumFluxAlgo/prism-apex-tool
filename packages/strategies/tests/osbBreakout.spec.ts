import { describe, expect, it } from "vitest";
import { openingSwingBreakout } from "../src/osbBreakout.js";
import { Candle } from "../src/types.js";
import { TickSpec } from "../src/inputs.js";
import { ticksBetween } from "../src/util.js";

describe("openingSwingBreakout", () => {
  const tick: TickSpec = { tickSize: 0.25 };

  it("triggers BUY on OR breakout with default rr", () => {
    const bars: Candle[] = [];
    const atr: number[] = [];
    for (let i = 0; i < 7; i++) {
      atr.push(1);
      if (i < 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100, high: 101, low: 99, close: 100 });
      } else if (i === 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100.5, high: 101, low: 100, close: 100.5 });
      } else {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 101, high: 101.5, low: 100.5, close: 101.25 });
      }
    }
    const res = openingSwingBreakout("ESZ4", bars, atr, tick);
    expect(res).toHaveLength(1);
    const s = res[0];
    expect(s.side).toBe("BUY");
    expect(s.stop).toBeCloseTo(98.75, 5); // orLow -1 tick
    expect(s.meta.rr).toBeCloseTo(2, 5);
  });

  it("rejects OR width that is too small", () => {
    const bars: Candle[] = [];
    const atr: number[] = [];
    for (let i = 0; i < 7; i++) {
      atr.push(1);
      if (i < 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100, high: 100.5, low: 100, close: 100.25 });
      } else if (i === 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100.25, high: 100.5, low: 100, close: 100.25 });
      } else {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100.5, high: 100.75, low: 100.25, close: 100.5 });
      }
    }
    const res = openingSwingBreakout("ESZ4", bars, atr, tick);
    expect(res).toHaveLength(0);
  });

  it("bumps risk to minimum ticks when OR is tiny", () => {
    const bars: Candle[] = [];
    const atr: number[] = [];
    for (let i = 0; i < 7; i++) {
      atr.push(1);
      if (i < 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100, high: 100, low: 100, close: 100 });
      } else if (i === 5) {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100, high: 100.25, low: 100, close: 100.25 });
      } else {
        bars.push({ ts: `2024-01-01T00:0${i}:00.000Z`, open: 100.25, high: 100.5, low: 100.25, close: 100.5 });
      }
    }
    const res = openingSwingBreakout("ESZ4", bars, atr, tick, { widthMinTicks: 0, widthMinATR: 0 });
    expect(res).toHaveLength(1);
    const s = res[0];
    expect(ticksBetween(s.entry, s.stop, tick.tickSize)).toBe(3);
  });
});

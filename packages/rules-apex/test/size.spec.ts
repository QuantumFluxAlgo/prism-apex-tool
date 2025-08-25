import { guardSize } from '../src/guards/size.js';

describe('size guard', () => {
  it('half-size when buffer uncleared', () => {
    const res = guardSize({ qty: 4 } as any, {
      bufferCleared: false,
      accountMax: 10,
      recentSizes: [],
    });
    if (res.ok) {
      expect(res.qty).toBe(2);
      expect(res.guardrails).toContain('half-size');
    } else {
      throw new Error('unexpected rejection');
    }
  });

  it('clamps to apex max', () => {
    const res = guardSize({ qty: 10 } as any, {
      bufferCleared: true,
      accountMax: 3,
      recentSizes: [],
    });
    if (res.ok) {
      expect(res.qty).toBe(3);
      expect(res.guardrails).toContain('apex-max');
    } else {
      throw new Error('unexpected rejection');
    }
  });

  it('rejects windfall size jumps', () => {
    const res = guardSize({ qty: 10 } as any, {
      bufferCleared: true,
      accountMax: 20,
      recentSizes: [2],
    });
    expect(res.ok).toBe(false);
  });
});

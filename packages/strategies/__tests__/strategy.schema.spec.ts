import { describe, it, expect } from 'vitest';
import { validateStrategyConfig } from '../src/config/schema';

describe('strategy schema (generic)', () => {
  it('accepts numeric params and time fields', () => {
    const ok = validateStrategyConfig({
      rangeLookbackMinutes: 30,
      bufferTicks: 4,
      cooldownBars: 3,
      sessionStart: '09:30',
      sessionEnd: '16:00',
    });
    expect(ok['bufferTicks']).toBe(4);
  });

  it('rejects negative lookbacks and unknown keys when allowed list given', () => {
    expect(() => validateStrategyConfig({ lookbackBars: -1 })).toThrow(/>= 0/);
    expect(() => validateStrategyConfig({ foo: 1 }, { allowedKeys: ['bar'] })).toThrow(
      /unknown key/,
    );
  });

  it('rejects non-numeric where numbers required', () => {
    expect(() => validateStrategyConfig({ cooldownBars: '3' as any })).toThrow(
      /must be a finite number/,
    );
  });
});

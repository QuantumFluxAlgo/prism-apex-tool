import { guardStop } from '../src/guards/stop.js';

describe('stop guard', () => {
  it('requires stop in funded', () => {
    const res = guardStop(
      { symbol: 'ES', side: 'BUY', entry: 100, qty: 1, strategy: 'OSB' },
      'funded',
    );
    expect(res.ok).toBe(false);
  });

  it('rejects bad stop side', () => {
    const res = guardStop(
      { symbol: 'ES', side: 'BUY', entry: 100, stop: 101, qty: 1, strategy: 'OSB' },
      'eval',
    );
    expect(res.ok).toBe(false);
  });

  it('accepts good stop', () => {
    const res = guardStop(
      { symbol: 'ES', side: 'BUY', entry: 100, stop: 99, qty: 1, strategy: 'OSB' },
      'eval',
    );
    expect(res.ok).toBe(true);
  });
});

import { validateRR } from '../src/rr';

describe('validateRR', () => {
  it('rejects rr below min', () => {
    const res = validateRR(1.3, 1.5, 5);
    expect(res).toEqual({ ok: false, reason: 'rr below min' });
  });

  it('rejects rr above max', () => {
    const res = validateRR(6, 1.5, 5);
    expect(res).toEqual({ ok: false, reason: 'rr above max' });
  });

  it('accepts rr within range', () => {
    const res = validateRR(2, 1.5, 5);
    expect(res).toEqual({ ok: true });
  });
});

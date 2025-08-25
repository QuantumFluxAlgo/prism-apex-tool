import { evaluateTicket } from '../src/evaluate';
import { TicketInput } from '../src/types';

describe('evaluateTicket', () => {
  const opts = { minRR: 1.5, maxRR: 5, flatByUtc: '20:59' };

  it('accepts valid long and short before cutoff', () => {
    const long: TicketInput = { symbol: 'ES', side: 'long', entry: 100, stop: 95, target: 110 };
    const short: TicketInput = { symbol: 'ES', side: 'short', entry: 100, stop: 105, target: 90 };
    const now = new Date('2020-01-01T20:58:00Z');
    expect(evaluateTicket(long, { ...opts, now }).decision).toBe('accept');
    expect(evaluateTicket(short, { ...opts, now }).decision).toBe('accept');
  });

  it('rejects after cutoff', () => {
    const payload: TicketInput = { symbol: 'ES', side: 'long', entry: 100, stop: 95, target: 110 };
    const now = new Date('2020-01-01T20:59:00Z');
    const res = evaluateTicket(payload, { ...opts, now });
    expect(res.decision).toBe('reject');
    expect(res.reasons).toContain('eod flat cutoff');
  });

  it('rejects invalid geometry', () => {
    const bad: TicketInput = { symbol: 'ES', side: 'long', entry: 100, stop: 101, target: 110 };
    const res = evaluateTicket(bad, { ...opts, now: new Date('2020-01-01T20:58:00Z') });
    expect(res.decision).toBe('reject');
    expect(res.reasons).toContain('invalid risk/reward geometry');
  });
});

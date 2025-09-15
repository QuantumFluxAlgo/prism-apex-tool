import { describe, it, expect, beforeEach } from 'vitest';
import { setJobBeat } from '@prism-apex/runtime';
import { buildServer } from '../server.js';
import { _clear, saveTicket } from '../store/tickets.js';
import { withJobs } from './helpers/jobs';

withJobs();

beforeEach(() => {
  _clear();
});

const suggestionAccepted = {
  symbol: 'ES',
  contract: 'ESZ4',
  side: 'BUY',
  entry: 100,
  stop: 99,
  target: 102,
  qty: 1,
  timestampUtc: '2024-01-01T10:00:00Z',
  meta: { strategy: 'VWAP_FT' },
};

const suggestionRejected = {
  symbol: 'ES',
  contract: 'ESZ4',
  side: 'BUY',
  entry: 100,
  stop: 99,
  target: 100.5,
  qty: 1,
  timestampUtc: '2024-01-01T10:05:00Z',
  meta: { strategy: 'OSB' },
};

describe('ticketizer API', () => {
  it('debug replay and persistence', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/debug-replay',
      payload: [suggestionAccepted, suggestionRejected],
    });
    expect(res.statusCode).toBe(200);
    const tickets = res.json();
    expect(tickets).toHaveLength(2);
    expect(tickets[0].accepted).toBe(true);
    expect(tickets[1].accepted).toBe(false);
    expect(tickets[1].reasons).toContain('rr-too-low');

    await saveTicket(tickets[0]);
    await saveTicket(tickets[1]);

    const date = '2024-01-01';
    const list = await app.inject({ method: 'GET', url: `/tickets?date=${date}` });
    const body = list.json();
    expect(body.tickets.length).toBeGreaterThan(0);
    expect(body.tickets[0].meta.strategy).toBeTruthy();

    const csv = await app.inject({ method: 'GET', url: `/export/tickets?date=${date}` });
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body.split('\n')[0]).toContain('meta.strategy');

    setJobBeat('ticketizer');
    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.json().jobs.ticketizer.healthy).toBe(true);
    await app.close();
  });
});

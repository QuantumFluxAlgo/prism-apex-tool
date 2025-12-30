 
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import App from '../App.js';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const asString = typeof input === 'string' ? input : String((input as URL).toString());
    if (asString.includes('/api/tickets')) {
      return {
        ok: true,
        json: async () => ({ rows: [], total: 0 }),
      } as Response;
    }
    return {
      ok: true,
      json: async () => ({}),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders dashboard title', async () => {
    render(<App />);
    const headings = await screen.findAllByText(/Operator Dashboard/);
    expect(headings[0]).toBeInTheDocument();
  });

  it('lands on Worklist V2 by default', async () => {
    render(<App />);
    const worklistHeading = await screen.findByRole('heading', {
      name: /Worklist V2/i,
    });
    expect(worklistHeading).toBeInTheDocument();
  });
});

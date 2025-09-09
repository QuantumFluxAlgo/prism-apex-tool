import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PositionsPage from '../pages/Positions';

const positions = [{ contract: 'ESZ4', symbolRoot: 'ES', qty: 1, avgPrice: 100, unrealizedPnL: 2 }];

describe('PositionsPage', () => {
  it('shows positions and metrics', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('positions'))
        return Promise.resolve({ ok: true, json: async () => positions });
      return Promise.resolve({
        ok: true,
        json: async () => ({ balance: 1000, bufferCleared: false }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<PositionsPage />);
    await screen.findByText('ESZ4');
    expect(screen.getByText(/Account Balance/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

// src/__tests__/Analytics.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarketDataPage from '../pages/MarketData';

const renderMarketDataPage = () =>
  render(
    <MemoryRouter>
      <MarketDataPage />
    </MemoryRouter>,
  );

describe('MarketDataPage', () => {
  it('renders the session context header and shell chrome', () => {
    renderMarketDataPage();

    // Header title and description
    expect(
      screen.getByRole('heading', { name: /Session Context/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Price overlays, OR \/ ATR footprint, VWAP slope, and regime flags/i),
    ).toBeInTheDocument();

    // Header badges
    expect(screen.getByText(/Session · UTC/i)).toBeInTheDocument();
    expect(screen.getByText(/Environment · A3 Shell/i)).toBeInTheDocument();
  });

  it('renders symbol selector and overlay toggles', () => {
    const { container } = renderMarketDataPage();

    const filtersRoot = container.querySelector('.markets-a3-filters');
    expect(filtersRoot).not.toBeNull();

    const filters = within(filtersRoot as HTMLElement);

    // Symbol label – scoped to the filters card so we don’t hit other occurrences
    expect(filters.getByText(/^Symbol$/i)).toBeInTheDocument();

    // Symbol selector
    expect(filters.getByRole('combobox')).toBeInTheDocument();

    // Overlay toggles
    expect(
      screen.getByRole('button', { name: /OR band/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /VWAP trace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ATR marker/i }),
    ).toBeInTheDocument();
  });
});


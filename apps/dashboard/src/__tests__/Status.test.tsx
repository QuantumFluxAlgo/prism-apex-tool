import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Status from '../pages/Status';

describe('StatusPage', () => {
  it('renders the system status headline', () => {
    render(<Status />);
    expect(screen.getByText('System Status')).toBeInTheDocument();
  });

  it('renders core status tiles for engine and external dependencies', () => {
    render(<Status />);
    expect(screen.getByText(/Prism core jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/Tradovate API connectivity/i)).toBeInTheDocument();
  });

  it('shows the healthy components summary card', () => {
    render(<Status />);
    expect(screen.getByText(/Healthy components/i)).toBeInTheDocument();
  });
});

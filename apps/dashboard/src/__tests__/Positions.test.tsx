import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PositionsPage from '../pages/Positions.js';

describe('PositionsPage', () => {
  it('renders placeholder loading state', () => {
    render(<PositionsPage />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByText('Active positions')).toBeInTheDocument();
  });
});

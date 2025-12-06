import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Alerts from '../pages/Alerts';

describe('AlertsPage', () => {
  it('renders the alerts headline and filters', () => {
    render(<Alerts />);
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    expect(screen.getByLabelText('State')).toBeInTheDocument();
  });

  it('renders at least one critical alert by default (open state)', () => {
    render(<Alerts />);
    expect(screen.getByText(/Authentication error rate spike/i)).toBeInTheDocument();
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it('filters alerts by severity', () => {
    render(<Alerts />);

    const severitySelect = screen.getByLabelText('Severity') as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'warning' } });

    expect(severitySelect.value).toBe('warning');
    expect(screen.getByText(/Risk guardrail breach/i)).toBeInTheDocument();
  });
});

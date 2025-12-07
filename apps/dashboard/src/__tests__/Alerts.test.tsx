import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Alerts from '../pages/Alerts';

describe('AlertsPage', () => {
  it('renders the alerts headline and filters', () => {
    render(<Alerts />);

    expect(
      screen.getByRole('heading', { name: /Alerts/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Severity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
  });

  it('renders at least one critical alert by default (open state)', () => {
    render(<Alerts />);

    expect(
      screen.getByText(/Authentication error rate spike/i)
    ).toBeInTheDocument();

    const criticalElements = screen.getAllByText(/Critical/i);
    expect(criticalElements.length).toBeGreaterThan(0);

    const rows = screen.getAllByRole('row');
    const criticalOpenRows = rows.filter((row) => {
      const utils = within(row);
      const hasCritical = utils.queryByText(/Critical/i);
      const hasOpen = utils.queryByText(/Open/i);
      return Boolean(hasCritical && hasOpen);
    });

    expect(criticalOpenRows.length).toBeGreaterThan(0);
  });

  it('filters alerts by severity', () => {
    render(<Alerts />);

    const severitySelect = screen.getByLabelText(/Severity/i) as HTMLSelectElement;
    fireEvent.change(severitySelect, { target: { value: 'warning' } });

    expect(severitySelect.value).toBe('warning');

    expect(
      screen.getByText(/Risk guardrail breach/i)
    ).toBeInTheDocument();
  });
});

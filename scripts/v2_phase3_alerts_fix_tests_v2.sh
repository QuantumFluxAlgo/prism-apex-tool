#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – FIX ALERTS TEST QUERIES (V2) ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo "--- Overwriting Alerts.test.tsx with disambiguated queries ---"
cat <<'TSX' > apps/dashboard/src/__tests__/Alerts.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Alerts from '../pages/Alerts';

describe('AlertsPage', () => {
  it('renders the alerts headline and filters', () => {
    render(<Alerts />);

    // Be explicit: the main page heading
    expect(
      screen.getByRole('heading', { name: /Alerts/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Severity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
  });

  it('renders at least one critical alert by default (open state)', () => {
    render(<Alerts />);

    // Assert the specific critical alert title is present
    expect(
      screen.getByText(/Authentication error rate spike/i)
    ).toBeInTheDocument();

    // Allow multiple "Critical" labels (option + badge); just require at least one
    const criticalElements = screen.getAllByText(/Critical/i);
    expect(criticalElements.length).toBeGreaterThan(0);

    // Extra belt-and-braces: ensure at least one "Critical" is inside a data row with "Open"
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

    // After filtering to "warning", the risk guardrail alert should be visible
    expect(
      screen.getByText(/Risk guardrail breach/i)
    ).toBeInTheDocument();
  });
});
TSX

echo
echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard run test

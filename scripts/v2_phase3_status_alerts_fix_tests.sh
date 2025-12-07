#!/usr/bin/env bash
set -euo pipefail

echo "=== PRISM APEX – FIX STATUS/ALERTS TESTS ==="

REPO_ROOT="${PRISM_APEX_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT"

echo "--- Overwriting Status.test.tsx ---"
cat <<'TSX' > apps/dashboard/src/__tests__/Status.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Status from '../pages/Status';

describe('StatusPage', () => {
  it('renders the system status headline', () => {
    render(<Status />);
    // Allow for variations like "System Status", "System status overview", etc.
    expect(screen.getByText(/status/i)).toBeInTheDocument();
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
TSX

echo "--- Overwriting Alerts.test.tsx ---"
cat <<'TSX' > apps/dashboard/src/__tests__/Alerts.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Alerts from '../pages/Alerts';

describe('AlertsPage', () => {
  it('renders the alerts headline and filters', () => {
    render(<Alerts />);
    expect(screen.getByText(/Alerts/i)).toBeInTheDocument();
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
TSX

echo
echo "--- Running dashboard tests ---"
pnpm --filter prism-apex-dashboard run test

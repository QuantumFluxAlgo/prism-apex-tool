// src/__tests__/Alerts.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlertsPage from '../pages/Alerts';

const renderAlertsPage = () =>
  render(
    <MemoryRouter>
      <AlertsPage />
    </MemoryRouter>,
  );

describe('AlertsPage', () => {
  it('renders the alerts headline and filter groups', () => {
    const { container } = renderAlertsPage();

    // Headline
    expect(
      screen.getByRole('heading', { name: /Alerts/i }),
    ).toBeInTheDocument();

    // Scope to the filters row
    const filtersRow = container.querySelector('.alerts-filters-row');
    expect(filtersRow).not.toBeNull();

    const filters = within(filtersRow as HTMLElement);

    // Filter group labels (visual labels, not form labels)
    expect(filters.getByText(/^Severity$/i)).toBeInTheDocument();
    expect(filters.getByText(/^State$/i)).toBeInTheDocument();
  });

  it('renders at least one critical open alert by default', () => {
    renderAlertsPage();

    // Summary tile for critical alerts
    expect(
      screen.getByText(/Critical open/i),
    ).toBeInTheDocument();

    // At least one "Critical" badge in the page
    const criticalBadges = screen.getAllByText(/Critical/i);
    expect(criticalBadges.length).toBeGreaterThan(0);
  });

  it('filters alerts by severity when pill filters are used', () => {
    const { container } = renderAlertsPage();

    const filtersRow = container.querySelector('.alerts-filters-row');
    expect(filtersRow).not.toBeNull();

    // There are two filter groups: [0] Severity, [1] State
    const filterGroups = filtersRow!.querySelectorAll('.alerts-filter-group');
    expect(filterGroups.length).toBeGreaterThanOrEqual(2);

    const severityGroup = filterGroups[0] as HTMLElement;
    const severityFilters = within(severityGroup);

    // These are the SEVERITY pills (All / Info / Warning / Critical)
    const severityAllPill = severityFilters.getByRole('button', {
      name: /^All$/i,
    });
    const severityWarningPill = severityFilters.getByRole('button', {
      name: /^Warning$/i,
    });

    // Initial state: "All" active, "Warning" inactive
    expect(severityAllPill.className).toMatch(/alerts-filter-pill--active/);
    expect(severityWarningPill.className).not.toMatch(
      /alerts-filter-pill--active/,
    );

    // Click the "Warning" severity pill.
    fireEvent.click(severityWarningPill);

    // After click: "Warning" active, "All" inactive
    expect(severityWarningPill.className).toMatch(
      /alerts-filter-pill--active/,
    );
    expect(severityAllPill.className).not.toMatch(
      /alerts-filter-pill--active/,
    );
  });
});


import { test, expect } from '@playwright/test';

test.describe('EOD block modal & copy disabling', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept /rules/status to simulate EOD T-5 block
    await page.route('**/rules/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stopRequired: true, rrLeq5: true, ddHeadroom: true,
          halfSize: 'Half until buffer; maxContracts=4',
          consistencyPolicy: { warnAt: 0.25, failAt: 0.30 },
          eodState: 'BLOCK_NEW'
        })
      });
    });
    // Intercept /signals/preview to return a valid ticket but with block=false
    await page.route('**/signals/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticket: {
            id: 't1',
            symbol: 'ES',
            contract: 'ESU5',
            side: 'BUY',
            qty: 1,
            order: { type: 'LIMIT', entry: 5000, stop: 4995, targets: [5005], tif: 'DAY', oco: true },
            risk: { perTradeUsd: 5, rMultipleByTarget: [1] },
            apex: { stopRequired: true, rrLeq5: true, ddHeadroom: true, halfSize: true, eodReady: true, consistency30: 'OK' }
          },
          block: false,
          reasons: []
        })
      });
    });

    // Other endpoints
    await page.route('**/account', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ netLiq: 52000, cash: 52000, margin: 0, dayPnlRealized: 0, dayPnlUnrealized: 0 }) }));
    await page.route('**/positions', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/orders', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  });

  test('EOD modal appears and copy is blocked until “I am flat” checked', async ({ page }) => {
    await page.goto('/');
    // Wait for Next Ticket panel
    await expect(page.getByText('Next Ticket')).toBeVisible();

    // Copy status should show blocked due to EOD
    await expect(page.getByText('Copy blocked')).toBeVisible();

    // EOD modal visible
    await expect(page.getByText('EOD Block Window')).toBeVisible();

    // Buttons should be disabled
    await expect(page.getByRole('button', { name: 'Copy Text' })).toBeDisabled();

    // Acknowledge flat
    await page.getByLabel('I am flat').check();

    // Modal should disappear
    await expect(page.getByText('EOD Block Window')).toHaveCount(0);
  });
});


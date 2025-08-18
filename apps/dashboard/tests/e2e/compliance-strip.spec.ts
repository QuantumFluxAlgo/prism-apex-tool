import { test, expect } from '@playwright/test';

test('Compliance strip shows badges and EOD OK', async ({ page }) => {
  await page.route('**/rules/status', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stopRequired: true, rrLeq5: true, ddHeadroom: true,
        halfSize: false,
        consistencyPolicy: { warnAt: 0.25, failAt: 0.30 },
        eodState: 'OK'
      })
    });
  });
  await page.route('**/signals/preview', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ticket: null, block: true, reasons: ['No valid signal at this time'] }) }));

  await page.goto('/');
  await expect(page.getByText('Stop: OK')).toBeVisible();
  await expect(page.getByText('R:R ≤ 5: OK')).toBeVisible();
  await expect(page.getByText('DD Headroom: OK')).toBeVisible();
  await expect(page.getByText('EOD: OK')).toBeVisible();
});


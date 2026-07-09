import { test, expect } from '@playwright/test';

test('manage-subscription button hidden when logged out; retention-offer API enforces auth', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', res => { if (res.status() >= 400) errors.push(`[HTTP ${res.status()}] ${res.url()}`); });

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Logged-out state: no user, so "Manage Subscription" must not render.
  await expect(page.getByText('管理訂閱')).toHaveCount(0);
  await expect(page.getByText('Manage Subscription')).toHaveCount(0);

  // Page load itself must be clean before we start deliberately triggering 401s below.
  expect(errors).toEqual([]);

  // Route must exist and enforce auth (proves it's actually wired, not a 404).
  const getRes = await page.request.get('/prd-master/api/stripe/retention-offer');
  expect(getRes.status()).toBe(401);
  const getBody = await getRes.json();
  expect(getBody.error).toBe('Unauthorized');

  const postRes = await page.request.post('/prd-master/api/stripe/retention-offer');
  expect(postRes.status()).toBe(401);
  const postBody = await postRes.json();
  expect(postBody.error).toBe('Unauthorized');

  // Portal route (now with cancellation_reason config) still enforces auth too.
  const portalRes = await page.request.post('/prd-master/api/stripe/portal');
  expect(portalRes.status()).toBe(401);
});

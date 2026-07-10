import { test, expect } from '@playwright/test';

// The app's i18n may render EN or ZH depending on browser locale, so match both.
const MANAGE = /管理訂閱|Manage Subscription/;
const CANCEL = /取消訂閱|Cancel subscription/;
const RETENTION = /85 折|15% off/;

const PRO_USER = {
  id: 'test-pro-user',
  name: 'Test Pro',
  email: 'pro@test.com',
  tier: 'pro',
  totalRounds: 0,
  remainingDownloads: 0,
  invitationCode: 'ABC123',
  balanceCredits: 0,
};

// Inject a logged-in PRO user via localStorage before the app hydrates.
async function loginAsPro(page: any) {
  await page.addInitScript((u: any) => {
    localStorage.setItem('prd_v2_user', JSON.stringify(u));
  }, PRO_USER);
}

test('manage-subscription button sits next to PRO label and opens paywall with hidden cancel button', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await loginAsPro(page);
  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Button renders for a paid user.
  const manageBtn = page.getByRole('button', { name: MANAGE });
  await expect(manageBtn).toBeVisible();

  // Paywall (and its hidden cancel button) must NOT be visible before clicking.
  await expect(page.getByRole('button', { name: CANCEL })).toHaveCount(0);

  await manageBtn.click();

  // Paywall opened: the shared paywall copy is visible.
  await expect(page.getByText('想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？')).toBeVisible();

  // The hidden cancel button is now at the bottom of the paywall.
  const cancelBtn = page.getByRole('button', { name: CANCEL });
  await expect(cancelBtn).toBeVisible();

  await page.screenshot({ path: '.pw-verify/manage-paywall.png', fullPage: false });
});

test('cancel button → eligible user gets 15% off retention modal', async ({ page }) => {
  await loginAsPro(page);
  // Mock: user is eligible for retention offer (i.e. has paid before).
  await page.route('**/api/stripe/retention-offer', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ eligible: true }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: MANAGE }).click();
  await page.getByRole('button', { name: CANCEL }).click();

  // Retention modal with 15% off (85折) copy appears; paywall is dismissed.
  await expect(page.getByText(RETENTION)).toBeVisible();
  await expect(page.getByText('想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？')).toHaveCount(0);

  await page.screenshot({ path: '.pw-verify/manage-retention.png', fullPage: false });
});

test('cancel button → trial user (not eligible) goes straight to Stripe Portal', async ({ page }) => {
  await loginAsPro(page);
  let portalCalled = false;
  await page.route('**/api/stripe/retention-offer', async route => {
    // Not eligible (trial user never charged).
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ eligible: false }) });
  });
  await page.route('**/api/stripe/portal', async route => {
    portalCalled = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://billing.stripe.com/mock-portal' }) });
  });

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: MANAGE }).click();
  await page.getByRole('button', { name: CANCEL }).click();
  await page.waitForTimeout(800);

  // No retention modal for a trial user; Portal endpoint was hit instead.
  await expect(page.getByText(RETENTION)).toHaveCount(0);
  expect(portalCalled).toBe(true);
});

test('Pricing-opened paywall (non-manage) does NOT show the cancel button', async ({ page }) => {
  // No login needed — Pricing button opens the shared paywall in normal mode.
  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Pricing' }).click();
  await expect(page.getByText('想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？')).toBeVisible();

  // Regression guard: my `paywallVisible || managePaywallOpen` change must not
  // leak the cancel button into the normal Pricing-opened paywall.
  await expect(page.getByRole('button', { name: CANCEL })).toHaveCount(0);
});

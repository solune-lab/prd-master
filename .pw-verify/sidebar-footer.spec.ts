import { test, expect } from '@playwright/test';

test('sidebar footer shows Pricing/social links and Pricing opens paywall modal', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const pricingBtn = page.getByRole('button', { name: 'Pricing' });
  await expect(pricingBtn).toBeVisible();

  const twitterLink = page.getByRole('link', { name: 'X (Twitter)' });
  await expect(twitterLink).toHaveAttribute('href', 'https://x.com/soluneai?s=21');

  const emailLink = page.getByRole('link', { name: 'info@soluneai.com' });
  await expect(emailLink).toHaveAttribute('href', 'mailto:info@soluneai.com');

  // Paywall modal should not be visible yet
  await expect(page.getByText('想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？')).toHaveCount(0);

  await pricingBtn.click();

  await expect(page.getByText('想立即拿到這份包含 Stripe 變現與 Auth 系統的完整藍圖嗎？')).toBeVisible();

  expect(errors).toEqual([]);
});

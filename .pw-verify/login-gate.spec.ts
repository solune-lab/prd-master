import { test, expect } from '@playwright/test';

test('logged-out user cannot type or send in chat composer', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('/prd-master', { waitUntil: 'networkidle' });

  const textarea = page.locator('textarea').first();
  const sendBtn = page.getByRole('button', { name: /^(Send|發送|送出)$/i }).first();

  await expect(textarea).toBeDisabled();
  await expect(sendBtn).toBeDisabled();

  await expect(textarea.fill('hello world', { timeout: 3000 })).rejects.toThrow();
  await expect(textarea).toHaveValue('');
});

import { test } from '@playwright/test';

const FAKE_USER = {
  id: 'test-user-id-999',
  name: 'Test User',
  email: 'test@example.com',
  tier: 'free',
  totalRounds: 0,
  remainingDownloads: 0,
  invitationCode: 'TESTCODE',
  balanceCredits: 0,
};

test('diagnose soluneai.com/prd-master chat error', async ({ page }) => {
  const apiCalls: { url: string; status: number; body: string }[] = [];
  const consoleErrors: string[] = [];

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('/api/')) {
      let body = '';
      try { body = (await res.text()).slice(0, 1500); } catch {}
      apiCalls.push({ url: u, status: res.status(), body });
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.addInitScript((user) => {
    localStorage.setItem('prd_v2_user', JSON.stringify(user));
  }, FAKE_USER);

  await page.goto('https://soluneai.com/prd-master/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 10000 });
  const isDisabled = await textarea.isDisabled();
  console.log('=== TEXTAREA DISABLED ===', isDisabled);

  if (!isDisabled) {
    await textarea.fill('測試訊息');
    const sendBtn = page.locator('button:has-text("Send"), button:has-text("發送")').first();
    await sendBtn.click();
    await page.waitForTimeout(12000);
  }

  console.log('=== API CALLS ===');
  for (const c of apiCalls) console.log(c.status, c.url, '|', c.body);
  console.log('=== CONSOLE ERRORS ===');
  for (const e of consoleErrors) console.log(e);

  await page.screenshot({ path: '.pw-verify/diag-soluneai.png', fullPage: true });
});

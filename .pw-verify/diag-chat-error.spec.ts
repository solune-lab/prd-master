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

test('diagnose 服務發生錯誤 popup on send', async ({ page }) => {
  const consoleMsgs: string[] = [];
  const pageErrors: string[] = [];
  const apiCalls: { url: string; status: number; body: string }[] = [];

  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('/api/')) {
      let body = '';
      try { body = (await res.text()).slice(0, 500); } catch {}
      apiCalls.push({ url: u, status: res.status(), body });
    }
  });
  page.on('requestfailed', req => {
    console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });

  await page.addInitScript((user) => {
    localStorage.setItem('prd_v2_user', JSON.stringify(user));
  }, FAKE_USER);

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const textarea = page.locator('textarea').first();
  const sendBtn = page.locator('button:has-text("Send"), button:has-text("發送")').first();

  await textarea.fill('我想做一個冥想工具');
  await sendBtn.click();

  await page.waitForTimeout(15000);

  const bodyText = await page.locator('body').innerText();
  const hasErrorPopup = bodyText.includes('服務發生錯誤') || bodyText.includes('Service error');

  console.log('=== API CALLS ===');
  for (const c of apiCalls) console.log(c.status, c.url, '|', c.body);
  console.log('=== CONSOLE MESSAGES ===');
  for (const m of consoleMsgs) console.log(m);
  console.log('=== PAGE ERRORS ===');
  for (const e of pageErrors) console.log(e);
  console.log('=== ERROR POPUP SHOWN:', hasErrorPopup, '===');

  await page.screenshot({ path: '.pw-verify/diag-chat-error.png', fullPage: true });
});

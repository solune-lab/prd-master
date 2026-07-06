import { test, expect } from '@playwright/test';

const FAKE_USER = {
  id: 'test-user-id-000',
  name: 'Test User',
  email: 'test@example.com',
  tier: 'free',
  totalRounds: 0,
  remainingDownloads: 0,
  invitationCode: 'TESTCODE',
  balanceCredits: 0,
};

async function sendAndWait(page: import('@playwright/test').Page, text: string, waitMs = 8000) {
  const textarea = page.locator('textarea');
  const sendBtn = page.locator('button:has-text("Send"), button:has-text("發送")').first();
  await textarea.fill(text);
  await sendBtn.click();
  await page.waitForTimeout(waitMs);
}

test('typing "開始生成" in chat calls /api/finalize, never dumps raw PRD via /api/chat', async ({ page }) => {
  const errors: string[] = [];
  const apiCalls: { url: string; status: number }[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', res => {
    const u = res.url();
    if (u.includes('/api/chat') || u.includes('/api/finalize')) {
      apiCalls.push({ url: u, status: res.status() });
    }
  });

  await page.addInitScript((user) => {
    localStorage.setItem('prd_v2_user', JSON.stringify(user));
  }, FAKE_USER);

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await sendAndWait(page, '我想做一個冥想工具');
  await sendAndWait(page, '個人使用，主要想提升專注力');
  await sendAndWait(page, '越簡單越好');
  await sendAndWait(page, '不需要更多客製化了，先這樣就好');

  apiCalls.length = 0;
  const textarea = page.locator('textarea');
  const sendBtn = page.locator('button:has-text("Send"), button:has-text("發送")').first();

  const finalizeResponsePromise = page.waitForResponse(
    res => res.url().includes('/api/finalize'),
    { timeout: 30000 }
  );
  await textarea.fill('開始生成');
  await sendBtn.click();
  const finalizeResponse = await finalizeResponsePromise;

  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').innerText();
  const prdLeaked = bodyText.includes('# PRD') || /## 1\.|## 2\./.test(bodyText);
  const chatCalledOnTrigger = apiCalls.some(c => c.url.includes('/api/chat'));

  expect(finalizeResponse.url()).toContain('/api/finalize');
  expect(chatCalledOnTrigger, '/api/chat must NOT be called when trigger word is sent').toBe(false);
  expect(prdLeaked, 'chat body must not leak raw "# PRD:" content').toBe(false);
  expect(
    errors.filter(e => !e.includes('Unauthorized') && !e.includes('logUsage')),
    `unexpected console errors: ${JSON.stringify(errors)}`
  ).toEqual([]);
});

test('Q1 (operational mode) is asked only once even after vague follow-up replies', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.addInitScript((user) => {
    localStorage.setItem('prd_v2_user', JSON.stringify({ ...user, id: 'test-user-id-001' }));
  }, FAKE_USER);

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await sendAndWait(page, '我想做一個冥想工具');
  await sendAndWait(page, '個人使用，主要想提升專注力'); // should confirm mode
  await sendAndWait(page, '嗯 對啊 就這樣');              // vague — must NOT re-trigger Q1
  await sendAndWait(page, '好啊都可以');                   // vague — must NOT re-trigger Q1

  const bodyText = await page.locator('body').innerText();
  const q1Count = (bodyText.match(/首先.{0,2}我需要了解使用情境/g) || []).length;

  expect(q1Count, `Q1 should appear exactly once, got ${q1Count}`).toBe(1);
  expect(
    errors.filter(e => !e.includes('Unauthorized') && !e.includes('logUsage')),
    `unexpected console errors: ${JSON.stringify(errors)}`
  ).toEqual([]);
});

test('answering Q1 with a bare lowercase "a" is accepted, no infinite Q1 loop', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.addInitScript((user) => {
    localStorage.setItem('prd_v2_user', JSON.stringify({ ...user, id: 'test-user-id-002' }));
  }, FAKE_USER);

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await sendAndWait(page, '我想做一個冥想工具');
  await sendAndWait(page, 'a'); // bare lowercase letter answering (A)/(B)
  await sendAndWait(page, '越簡單越好');

  const bodyText = await page.locator('body').innerText();
  const q1Count = (bodyText.match(/首先.{0,2}我需要了解使用情境/g) || []).length;

  expect(q1Count, `Q1 should appear exactly once even after bare "a" answer, got ${q1Count}`).toBe(1);
  expect(
    errors.filter(e => !e.includes('Unauthorized') && !e.includes('logUsage')),
    `unexpected console errors: ${JSON.stringify(errors)}`
  ).toEqual([]);
});

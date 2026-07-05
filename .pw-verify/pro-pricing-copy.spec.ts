import { test, expect } from '@playwright/test';

test('pro/proAnnual pricing copy reflects unlimited downloads, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('requestfailed', req => errors.push(`requestfailed: ${req.url()}`));
  page.on('response', res => { if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`); });

  await page.goto('/prd-master', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Pull the compiled TRANSLATIONS strings straight out of the page's own script bundles
  // (no mocked auth session needed — this checks the actual shipped copy, not a re-typed literal).
  const scripts: string[] = await page.evaluate(async () => {
    const srcs = Array.from(document.querySelectorAll('script[src]'))
      .map(s => (s as HTMLScriptElement).src)
      .filter(src => src.includes('/_next/'));
    const bodies = await Promise.all(srcs.map(src => fetch(src).then(r => r.text()).catch(() => '')));
    return bodies;
  });

  const bundle = scripts.join('\n');

  // Note: "12 downloads/mo" also appears verbatim in FINAL_PRD_PROMPT's example
  // pricing table (AI prompt content, unrelated to this UI copy change), so it's
  // intentionally not asserted here — only the TRANSLATIONS proDesc/proAnnualDesc
  // strings actually shown on the paywall are checked.
  const checks = {
    hasEnUnlimited: bundle.includes('Unlimited downloads'),
    hasTwUnlimited: bundle.includes('無限下載額度'),
    hasCnUnlimited: bundle.includes('无限下载额度'),
    hasOldTwCount: bundle.includes('每月 12 次下載額度'),
    hasOldCnCount: bundle.includes('每月 12 次下载额度'),
  };

  expect(checks, `console errors: ${JSON.stringify(errors)}`).toEqual({
    hasEnUnlimited: true,
    hasTwUnlimited: true,
    hasCnUnlimited: true,
    hasOldTwCount: false,
    hasOldCnCount: false,
  });

  expect(errors).toEqual([]);
});

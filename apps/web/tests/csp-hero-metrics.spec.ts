import { test, expect } from '@playwright/test';
import { fixturePost } from './_support/content-fixtures';

for (const path of ['/', '/projects/transit-data-pipeline', `/blog/${fixturePost('en').slug}`, '/about', '/services', '/fr/services/data-pipeline']) {
 test(`hydration respects CSP on ${path}`, async ({ page }) => {
  await page.addInitScript(() => {
   const violations: object[] = [];
   Object.assign(window, { cspViolations: violations });
   document.addEventListener('securitypolicyviolation', event => violations.push({
    blocked: event.blockedURI, directive: event.violatedDirective, source: event.sourceFile,
   }));
  });
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  expect(await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content')).not.toContain("'unsafe-eval'");
  // Allow queued securitypolicyviolation events to dispatch after hydration.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => Reflect.get(window, 'cspViolations'))).toEqual([]);
 });
}

for (const locale of ['en', 'fr', 'es']) {
 for (const width of [320, 390, 1440]) {
  test(`hero metric words fit ${locale} at ${width}`, async ({ page }) => {
   await page.setViewportSize({ width, height: 900 });
   await page.goto(locale === 'en' ? '/' : `/${locale}`);
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   await page.evaluate(() => document.fonts.ready);
   const display = page.locator('[data-slot="metric-display"]').filter({ visible: true }).nth(2);
   const label = display.locator('.metric-label-text');
   const sub = display.locator(':scope > span:last-child');
   expect(await label.textContent()).not.toBe(await sub.textContent());
   const geometry = await display.evaluate(el => {
    const splits: string[] = [];
    const outside: string[] = [];
    const box = el.getBoundingClientRect();
    for (const span of el.querySelectorAll('.metric-label-text, :scope > span:last-child')) {
     const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
     while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const match of (node.textContent ?? '').matchAll(/[\p{L}\p{N}]+/gu)) {
       const range = document.createRange();
       range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
       const rects = [...range.getClientRects()].filter(rect => rect.width > 0);
       if (rects.length > 1) splits.push(match[0]);
       if (rects.some(rect => rect.left < box.left - 1 || rect.right > box.right + 1)) outside.push(match[0]);
      }
     }
    }
    return { splits, outside };
   });
   expect(geometry).toEqual({ splits: [], outside: [] });
  });
 }
}

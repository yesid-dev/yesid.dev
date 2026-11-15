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
  test(`Transit figure words fit ${locale} at ${width}`, async ({ page }) => {
   await page.setViewportSize({ width, height: 900 });
   await page.goto(locale === 'en' ? '/' : `/${locale}`);
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   await page.evaluate(() => document.fonts.ready);
   // The Transit card's three figures: their names and values never split a word or leave the figure.
   const figures = page.getByTestId('hero-transit-figure');
   await expect(figures).toHaveCount(3);
   const geometry = await figures.evaluateAll(nodes => {
    const splits: string[] = [];
    const outside: string[] = [];
    for (const el of nodes) {
     const box = el.getBoundingClientRect();
     for (const part of el.querySelectorAll('dt, dd')) {
      const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
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
    }
    return { splits, outside };
   });
   expect(geometry).toEqual({ splits: [], outside: [] });
  });
 }
}

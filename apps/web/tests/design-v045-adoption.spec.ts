import { test, expect } from '@playwright/test';
import { fixturePostPath } from './_support/content-fixtures';

for (const theme of ['light', 'dark']) {
 test(`footer hazard edge and terminus fit in ${theme}`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
   await page.setViewportSize({ width, height: 900 });
   await page.goto('/');
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   const edge = page.locator('[data-slot="footer-hazard-edge"]');
   await edge.scrollIntoViewIfNeeded();
   await expect(edge).toBeVisible();
   const geometry = await edge.evaluate(el => {
    const box = el.getBoundingClientRect();
    const scene = document.querySelector('[data-testid="closer-section"]')!.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { left: box.left, right: box.right, height: box.height, sceneAbove: scene.bottom <= box.top + 1,
     background: style.backgroundImage, overflow: document.documentElement.scrollWidth > innerWidth };
   });
   expect(geometry.left).toBe(0);
   expect(geometry.right).toBe(width);
   expect(geometry.height).toBe(3);
   expect(geometry.sceneAbove).toBe(true);
   expect(geometry.background).not.toBe('none');
   expect(geometry.overflow).toBe(false);
   await page.screenshot({ path: `test-results/dev37-footer-${theme}-${width}.png` });
  }
 });
}

for (const locale of ['en', 'fr', 'es'] as const) {
 test(`editorial headers fit ${locale}`, async ({ page }) => {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  for (const path of [`${prefix}/projects/transit-data-pipeline`, fixturePostPath(locale)]) {
   for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
    await page.evaluate(() => document.fonts.ready);
    for (const textSize of [100, 200]) {
     await page.evaluate(size => document.documentElement.style.fontSize = `${size}%`, textSize);
     const title = page.getByRole('heading', { level: 1 });
     await expect(title).toBeVisible();
     const geometry = await title.evaluate(el => {
      const box = el.closest('[data-slot="article-header"]')!.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(el);
      return { header: box.toJSON(), width: innerWidth, text: [...range.getClientRects()].map(r => r.toJSON()) };
     });
     expect(geometry.text.every(r => r.left >= -1 && r.right <= geometry.width + 1 && r.top >= geometry.header.top - 1 && r.bottom <= geometry.header.bottom + 1), JSON.stringify({ path, width, textSize, geometry })).toBe(true);
    }
   }
  }
 });
 test(`listing count announces search changes ${locale}`, async ({ page }) => {
  for (const listing of ['projects', 'blog']) {
   await page.goto(`${locale === 'en' ? '' : `/${locale}`}/${listing}`);
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   const status = page.getByRole('status').filter({ hasText: /\d/ });
   await expect(status).toHaveCount(1);
   const initial = await status.textContent();
   const search = page.locator('[data-slot="listing-search-field"] input');
   await page.keyboard.press('Tab');
   await search.focus();
   expect(await search.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px');
   expect(await search.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
   const toggle = page.locator('[data-slot="listing-filter-toggle"]');
   if (await toggle.isVisible()) {
    await toggle.focus();
    expect(await toggle.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px');
   }
   expect(await page.locator('[data-slot="listing-filter-search"]').evaluate(el => getComputedStyle(el).borderTopStyle)).not.toBe('dashed');
   await search.fill('zzzz-no-results');
   await expect(status).not.toHaveText(initial!);
   await expect(status).toContainText('0');
   await search.fill('');
   await expect(status).toHaveText(initial!);
  }
 });
}

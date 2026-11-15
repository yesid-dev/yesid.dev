import { test, expect, type Locator, type Page } from '@playwright/test';

async function styles(target: Locator) {
 return target.evaluate(el => {
  const s = getComputedStyle(el);
  return { shadow: s.boxShadow, textShadow: s.textShadow, filter: s.filter, transform: s.transform, border: s.borderColor, color: s.color };
 });
}
async function checkHover(page: Page, trigger: Locator, target = trigger, staticShadow = false) {
 await trigger.scrollIntoViewIfNeeded();
 await page.mouse.move(0, 0);
 await page.waitForTimeout(400);
 const before = await styles(target);
 await trigger.hover();
 await page.waitForTimeout(400);
 const after = await styles(target);
 expect(after.shadow).toBe(before.shadow);
 expect(after.textShadow).toBe(before.textShadow);
 expect(after.filter).toBe(before.filter);
 if (!staticShadow) expect(after.shadow === 'none' || after.shadow.includes('inset')).toBe(true);
 expect(after.transform !== before.transform || after.border !== before.border || after.color !== before.color).toBe(true);
 return { before, after };
}
for (const theme of ['light', 'dark']) {
 test(`hover keeps lift or colour without added shadow in ${theme}`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  await page.locator('html').evaluate((el, theme) => el.setAttribute('data-theme', theme), theme);
  const evidence: Record<string, unknown> = {};
  evidence.refresh = await checkHover(page, page.locator('.refresh-btn:visible').first(), undefined, true);
  evidence.home = await checkHover(page, page.locator('.services-card').first());
  evidence.panel = await checkHover(page, page.locator('.services-svg-panel').first());
  await page.goto('/projects');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  evidence.project = await checkHover(page, page.locator('.project-card').first(), page.locator('.project-card .card-surface').first());
  await page.goto('/projects/transit-data-pipeline');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  evidence.badge = await checkHover(page, page.getByTestId('work-service-badge').first());
  await page.goto('/services');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  evidence.service = await checkHover(page, page.locator('.deep-dive-cta:visible').first());
  await page.goto('/blog');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  const row = page.getByTestId('blog-row').first();
  await expect(row.locator('[data-slot="card"]')).toHaveAttribute('data-interactive', 'true');
  evidence.blog = await checkHover(page, row, row.locator('[data-slot="card"]'));
  await test.info().attach('computed-hover-styles', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
 });
}
for (const locale of ['en', 'fr', 'es']) {
 test(`header priority and fit in ${locale}`, async ({ page }) => {
  for (const width of [500, 550, 599, 600]) {
   await page.setViewportSize({ width, height: 900 });
   await page.goto(locale === 'en' ? '/' : `/${locale}`);
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   await page.evaluate(() => document.fonts.ready);
   const pill = page.getByTestId('nav-pill').filter({ visible: true });
   const links = pill.locator('.nav-pill-link:visible');
   await expect(links, `visible pill links at ${width}px`).toHaveCount(width < 600 ? 1 : 3);
   if (width < 600) expect(await links.getAttribute('href')).toMatch(/contact/);
   expect(await pill.evaluate(el => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
   })).toBe(true);
   await page.getByTestId('nav-menu-toggle').filter({ visible: true }).click();
   const menu = page.locator('.menu-content').filter({ visible: true });
   await expect(menu.locator('a[href$="/services"]')).toBeVisible();
   await expect(menu.locator('a[href$="/projects"]')).toBeVisible();
   await page.keyboard.press('Escape');
  }
 });
}

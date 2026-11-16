import { test, expect } from '@playwright/test';

const cases = [
 [320, 'en', 'light', 100], [390, 'fr', 'dark', 100], [768, 'es', 'light', 100],
 [390, 'en', 'light', 100], [1440, 'es', 'light', 100],
 [1024, 'fr', 'light', 100], [1440, 'en', 'dark', 100],
 [320, 'fr', 'light', 200], [390, 'es', 'dark', 200], [1024, 'fr', 'dark', 200],
] as const;
for (const [width, locale, theme, text] of cases) {
 for (const route of ['', '/services']) {
  test(`${route || 'home'} ${width} ${locale} ${theme} ${text}% fits`, async ({ page }, testInfo) => {
   await page.setViewportSize({ width, height: 900 });
   await page.emulateMedia({ reducedMotion: 'reduce' });
   await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
   await page.goto(`${locale === 'en' ? '' : '/' + locale}${route || '/'}`);
   await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
   await page.locator('html').evaluate((el, size) => el.style.fontSize = size + '%', text);
   await page.evaluate(() => document.fonts.ready);
   const cards = page.locator('.service-card');
   await expect(cards).toHaveCount(4);
   for (const card of await cards.all()) {
    await expect(card.locator('.service-description')).toBeVisible();
    await expect(card.getByRole('link')).toBeVisible();
    expect(await card.evaluate(el => el.scrollWidth - el.clientWidth), await card.locator('.service-title').textContent() ?? '').toBeLessThanOrEqual(1);
   }
   expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
   if (!route) {
    await expect(page.locator('.services-grid h3')).toHaveCount(4);
    const boundaries = page.locator('[data-slot="page-section-boundary"]');
    await expect(boundaries).toHaveCount(6);
    for (const rule of await boundaries.all()) {
     const geometry = await rule.evaluate(el => {
      const box = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { before: box.top - el.previousElementSibling!.getBoundingClientRect().bottom,
       after: el.nextElementSibling!.getBoundingClientRect().top - box.bottom,
       spacing: [s.marginTop,s.marginBottom,s.paddingTop,s.paddingBottom] };
     });
     expect(Math.abs(geometry.before)).toBeLessThanOrEqual(1);
     expect(Math.abs(geometry.after)).toBeLessThanOrEqual(1);
     expect(geometry.spacing).toEqual(['0px','0px','0px','0px']);
    }
    for (const id of ['hero-cta-contact', 'home-cta-band-booking']) {
     const button = page.getByTestId(id);
     for (const state of ['default', 'hover', 'focus']) {
      if (state === 'hover') await button.hover();
      if (state === 'focus') await button.focus();
      const fill = await button.evaluate(el => { const s = getComputedStyle(el); return { color: s.backgroundColor, image: s.backgroundImage, h: el.getBoundingClientRect().height }; });
      expect(fill.color).toMatch(/^rgb\(/);
      expect(fill.image).toBe('none');
      expect(fill.h).toBeGreaterThanOrEqual(44);
     }
     if (process.env.HOME_EVIDENCE_DIR && id === 'home-cta-band-booking' && width === 1440 && text === 100) {
      await button.scrollIntoViewIfNeeded();
      await page.screenshot({ path: process.env.HOME_EVIDENCE_DIR + `/booking-${theme}.png` });
     }
    }
   } else {
    await expect(page.locator('.service-card h2')).toHaveCount(4);
    if (text === 100) {
     const padding = await page.locator('[data-testid^="service-deep-dive-"]').evaluateAll(buttons => buttons.map(button => {
      const style = getComputedStyle(button);
      return [style.paddingTop, style.paddingBottom];
     }));
     expect(padding, 'listing actions retain their original CTA padding while labels can wrap').toEqual(Array.from({ length: 4 }, () => ['12px', '12px']));
    }
   }
   if (process.env.HOME_EVIDENCE_DIR && text === 100 && [390,1440].includes(width)) {
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: process.env.HOME_EVIDENCE_DIR + `/${route ? 'services' : 'home'}-${width}-${theme}.png` });
   }
   await testInfo.attach('fit', { body: JSON.stringify({width,locale,theme,text,route}), contentType:'application/json' });
  });
 }
}

 test('CMS delimiter renders through the article BlockRenderer with one thematic break and no spacing', async ({ page }) => {
  let injected = false;
  await page.route('**/__data.json*', async route => {
   const response = await route.fetch();
   const payload = await response.json();
   for (const node of payload.nodes ?? []) {
    const data = node?.data;
    if (!Array.isArray(data)) continue;
    for (const row of data) {
     if (!row || typeof row !== 'object' || row.blocks === undefined) continue;
     const blocks = data[row.blocks];
     if (!Array.isArray(blocks)) continue;
     const ref = (value: unknown) => data.push(value) - 1;
     const id = ref('delimiter-proof'), type = ref('delimiter'), empty = ref({});
     blocks.push(ref({ id, type, data: empty }));
     injected = true;
     break;
    }
   }
   await route.fulfill({ response, json: payload });
  });
  await page.goto('/fr/contact');
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
  await page.evaluate(() => {
   const a = document.createElement('a'); a.href = '/fr/blog/chacun-a-droit-a-un-peu-de-puissance-de-calcul';
   a.textContent = 'Delimiter test article'; a.id = 'delimiter-test-link'; document.body.append(a); a.click();
  });
  const delimiter = page.locator('.delimiter');
  await expect(delimiter).toBeVisible();
  expect(injected).toBe(true);
  await expect(delimiter).toHaveRole('separator');
  await expect(delimiter.locator('[data-variant="hand-drawn"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(delimiter.locator('svg')).toBeVisible();
  expect(await delimiter.evaluate(el => { const s = getComputedStyle(el); return [s.marginTop,s.marginBottom,s.paddingTop,s.paddingBottom]; })).toEqual(['0px','0px','0px','0px']);
  await expect(page.getByRole('separator')).toHaveCount(1);
 });

import { test, expect } from '@playwright/test';
import { expectDecorativeEdges } from './_support/accessibility';

// Explicit viewport/locale/theme matrix, run once in the desktop project.
test.skip(({ viewport }) => viewport?.width !== 1440, 'Explicit edge geometry matrix runs in desktop.');
for (const locale of ['', 'fr', 'es']) for (const width of [320, 360, 390, 768, 820, 1024, 1440, 1920]) for (const theme of ['dark', 'light']) {
 test(`${locale || 'en'} ${width} ${theme}: decorative edges stay noninteractive and clear of content`, async ({ page }, info) => {
  await page.route(/web3forms|cal\.com|plausible|\/api\/event/, r => r.abort());
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/' + locale);
  await page.evaluate(() => document.fonts.ready);
  const edge = page.getByTestId('manifesto-edge-right');
  await expect(edge).toBeVisible();
  await expect(edge).toHaveCSS('opacity', '0.45');
  await expect(page.locator('[data-decorative-edge]')).not.toHaveCount(0);
  await expectDecorativeEdges(page);
  const samples = [];
  for (const height of [640, 840, 841, 844, 879, 880, 900]) for (const reducedMotion of ['reduce', 'no-preference'] as const) {
   await page.setViewportSize({ width, height });
   await page.emulateMedia({ reducedMotion });
   await page.getByTestId('manifesto-section').scrollIntoViewIfNeeded();
   // Batch layout reads after the viewport/media change; keep the same form and tap assertions.
   const form = await edge.evaluate(node => {
    const route = node.querySelector<HTMLElement>('.manifesto__route')!;
    const fields = [...node.querySelectorAll<HTMLElement>('.manifesto__full .manifesto__coord')];
    const section = node.closest('[data-testid="manifesto-section"]')!;
    const visible = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility === 'visible'; };
    const style = getComputedStyle(route), box = route.getBoundingClientRect(), bounds = section.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(route); const ink = range.getBoundingClientRect();
    return {
     routeVisible: visible(route), fullVisible: fields.map(visible),
     expected: fields.slice(2).map(el => (el.textContent ?? '').replace(/^\S+\s+/, '').split(',')[0].trim()).join(' · '), actual: route.textContent,
     height: box.height, lineHeight: Number.parseFloat(style.lineHeight), fontSize: style.fontSize,
     left: Math.min(box.left, ink.left), right: Math.max(box.right, ink.right), sectionLeft: bounds.left, sectionRight: bounds.right,
     pillHeights: [...section.querySelectorAll('[data-testid="manifesto-pill"]')].map(el => el.getBoundingClientRect().height)
    };
   });
   expect(form.pillHeights.length).toBeGreaterThan(0);
   for (const pillHeight of form.pillHeights) expect(pillHeight).toBeGreaterThanOrEqual(44);
   const shortRoute = width <= 360 && height <= 840;
   expect(form.routeVisible).toBe(shortRoute);
   expect(form.fullVisible).toEqual(Array(6).fill(!shortRoute));
   if (shortRoute) {
    expect(form.actual).toBe(form.expected);
    expect(form.fontSize).toBe('9px');
    expect(form.height).toBeCloseTo(form.lineHeight, 1);
    expect(form.left).toBeGreaterThanOrEqual(form.sectionLeft);
    expect(form.right).toBeLessThanOrEqual(form.sectionRight);
   }
   await expect.poll(async () => edge.evaluate((node, { width, height }) => {
    const box = node.getBoundingClientRect();
    // The short route keeps 8px from text/controls; phone art may touch but never overlap.
    const shortPhone = width <= 360 && height <= 840;
    const tightPhoneArt = width <= 640 && !shortPhone && !(width >= 360 && height >= 880);
    const clearance = (other: DOMRect) => Math.hypot(Math.max(other.left - box.right, box.left - other.right, 0), Math.max(other.top - box.bottom, box.top - other.bottom, 0));
    const obstacles = [...document.querySelectorAll('[data-testid="manifesto-prompt"], .manifesto__statement, [data-testid="manifesto-line-huge"], [data-testid="manifesto-pill"], [data-testid="manifesto-edge-bottom"], [data-testid="manifesto-edge-left"] .manifesto__readout, [data-testid="manifesto-edge-top"], .manifesto__stripe, .manifesto__badge, .manifesto__roundel, .manifesto__roundel-name, .manifesto__beck-line, .manifesto__chevrons')];
    const section = node.closest('[data-testid="manifesto-section"]')!.getBoundingClientRect();
    const violations = obstacles.flatMap(el => {
     const other = el.getBoundingClientRect();
     if (!other.width || !other.height) return [];
     const minimum = el.matches('[data-testid="manifesto-prompt"]') ? 24 : el.matches('.manifesto__statement, [data-testid="manifesto-line-huge"], [data-testid="manifesto-pill"]') ? (shortPhone ? 8 : 24) : el.matches('.manifesto__badge') ? 16 : el.matches('.manifesto__stripe, .manifesto__roundel, .manifesto__roundel-name') ? (tightPhoneArt ? 0 : 16) : 0;
     const distance = clearance(other);
     const intersects = box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
     return intersects || distance < minimum ? [{ element: el.getAttribute('data-testid') ?? el.className, minimum, distance }] : [];
    });
    if (getComputedStyle(node).visibility !== 'visible' || box.width <= 0 || box.left < section.left || box.right > section.right || box.top < section.top || box.bottom > section.bottom) violations.push({ element: 'section bounds', minimum: 0, distance: -1 });
    return violations;
   }, { width, height }), { message: `${locale || 'en'} ${width}x${height} ${theme} ${reducedMotion} clearance` }).toEqual([]);
   const scrollProof = await edge.evaluate(async node => {
    const section = node.closest('[data-testid="manifesto-section"]')!;
    const origin = section.getBoundingClientRect().top + scrollY;
    let mutations = 0;
    const observer = new MutationObserver(records => { mutations += records.length; });
    observer.observe(node, { attributes: true });
    const positions = [];
    for (const offset of [0, 150, 300]) {
     scrollTo(0, origin + offset);
     await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
     const box = node.getBoundingClientRect(), base = section.getBoundingClientRect();
     positions.push({ scroll: scrollY, x: box.left - base.left, y: box.top - base.top });
    }
    observer.disconnect();
    return { mutations, positions };
   });
   expect(scrollProof.mutations).toBe(0);
   expect(new Set(scrollProof.positions.map(p => p.scroll)).size).toBe(3);
   for (const position of scrollProof.positions) {
    expect(position.x).toBeCloseTo(scrollProof.positions[0].x, 1);
    expect(position.y).toBeCloseTo(scrollProof.positions[0].y, 1);
   }
   samples.push({ height, reducedMotion, scrollProof, ...await edge.evaluate(node => ({ box: node.getBoundingClientRect().toJSON(), text: node.textContent })) });
  }
  await info.attach('edge-geometry', { body: JSON.stringify(samples), contentType: 'application/json' });
 });
}

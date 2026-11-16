import { expect, test } from '@playwright/test';

// D23 (owner, 15 November): the home's section titles are the kit's RailTitle: the section's real
// h2, rotated on a side rail outside the centred content from 1024px, sticky under the header pill
// while its section scrolls, then the next title takes over; horizontal below 1024px.
test.skip(({ viewport }) => viewport?.width !== 1440, 'Explicit title matrix runs in desktop.');

for (const locale of ['en', 'fr', 'es']) {
	for (const viewport of [{ width: 1024, height: 900 }, { width: 1440, height: 900 }, { width: 1440, height: 1200 }]) {
		test(`${locale} ${viewport.width}x${viewport.height} rail titles share type, sit on the rails and stay in view while their section scrolls`, async ({ page }, testInfo) => {
			await page.setViewportSize(viewport);
			await page.goto(locale === 'en' ? '/' : `/${locale}`);
			await page.evaluate(() => document.fonts.ready);
			const titles = page.locator('[data-slot="rail-title"]');
			await expect(titles).toHaveCount(4);
			const pillBottom = await page.locator('header').first().evaluate(el => {
				const pill = el.querySelector('nav') ?? el;
				return pill.getBoundingClientRect().bottom;
			});
			const samples = [];
			for (let i = 0; i < 4; i++) {
				const title = titles.nth(i);
				await title.evaluate(el => el.closest('[data-slot="page-section"]')!.scrollIntoView({ block: 'start', behavior: 'instant' }));
				await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
				const measured = await title.evaluate(el => {
					const heading = el.querySelector('h2')!;
					// Terminus owns its rail (the scene runs to the right edge); the others centre their content.
					const layout = el.closest('[data-slot="rail-title-layout"]') ?? el.closest('[data-slot="page-section"]')!;
					const content = (layout.querySelector('[data-slot="rail-title-content"]') ?? layout.querySelector('[data-testid="closer-section"]'))!.getBoundingClientRect();
					const style = getComputedStyle(heading);
					const r = el.getBoundingClientRect(), t = heading.getBoundingClientRect(), l = layout.getBoundingClientRect();
					return {
						side: el.getAttribute('data-side'),
						type: { font: style.fontFamily, weight: style.fontWeight, writing: style.writingMode },
						title: t.toJSON(), rail: r.toJSON(), content: content.toJSON(), layout: l.toJSON(),
						section: el.closest('[data-slot="page-section"]')!.getBoundingClientRect().toJSON(),
						centred: Boolean(el.closest('[data-slot="rail-title-layout"]')),
					};
				});
				expect(measured.type.writing).toBe('vertical-rl');
				// On its rail, never over the content.
				if (measured.side === 'left') expect(measured.title.right).toBeLessThanOrEqual(measured.content.left + 1);
				else expect(measured.title.left).toBeGreaterThanOrEqual(measured.content.right - 1);
				// The content is centred between the two rails.
				if (measured.centred) expect(Math.abs((measured.content.left - measured.layout.left) - (measured.layout.right - measured.content.right))).toBeLessThanOrEqual(2);
				// Sticky: once the section's top has scrolled under the pill, the title has not
				// (only the last section may stop short of that, at the end of the page).
				if (i < 3) expect(measured.section.top).toBeLessThan(pillBottom);
				if (measured.section.top < pillBottom) expect(measured.title.top).toBeGreaterThanOrEqual(pillBottom - 1);
				else expect(measured.title.top).toBeGreaterThanOrEqual(measured.section.top - 1);
				expect(measured.title.bottom).toBeLessThanOrEqual(viewport.height);
				samples.push(measured);
			}
			for (const sample of samples) expect(sample.type).toEqual(samples[0]!.type);
			expect(samples.map(sample => sample.side)).toEqual(['right', 'left', 'right', 'left']);
			await testInfo.attach('title-geometry', { body: JSON.stringify({ locale, ...viewport, pillBottom, samples }, null, 2), contentType: 'application/json' });
		});
	}
}

for (const width of [390, 768]) {
	test(`${width}px: the rail titles read horizontally above their sections`, async ({ page }) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		const titles = page.locator('[data-slot="rail-title"] h2');
		await expect(titles).toHaveCount(4);
		for (const title of await titles.all()) {
			await expect(title).toHaveCSS('writing-mode', 'horizontal-tb');
			await expect(title).toBeVisible();
		}
	});
}

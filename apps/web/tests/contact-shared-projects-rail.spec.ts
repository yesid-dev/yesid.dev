import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.route(/web3forms|plausible|cal\.com|\/api\/event|cloudflareinsights|cdn-cgi\/rum|vitals\.vercel|\/_vercel\/(?:insights|speed-insights)/, route => route.abort());
});

for (const locale of ['en', 'fr', 'es']) {
	test(`${locale}: Contact reuses Projects' centered rail and original dot clusters`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(`${locale === 'en' ? '' : '/' + locale}/contact`);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.evaluate(() => document.fonts.ready);
		const title = page.getByRole('heading', { level: 1 });
		await expect(title).toHaveCount(1);
		await expect(title).toBeVisible();
		const rail = page.locator('main [data-slot="listing-edge-title"]');
		await expect(rail).toHaveCount(1);
		expect(await title.evaluate(element => element.closest('[data-slot="listing-edge-title"]') !== null)).toBe(true);

		if (page.viewportSize()!.width >= 1024) {
			const geometry = await title.evaluate(element => {
				const title = element.getBoundingClientRect();
				const rail = element.closest('[data-slot="listing-edge-title"]')!.getBoundingClientRect();
				return { center: Math.abs(title.top + title.height / 2 - rail.top - rail.height / 2), left: rail.left, right: rail.right };
			});
			expect(geometry.center, 'title centered in its own left rail').toBeLessThanOrEqual(1);
			expect(geometry.left).toBeLessThan(page.viewportSize()!.width / 2);
			const clusters = rail.locator(':scope > [aria-hidden="true"]');
			await expect(clusters).toHaveCount(2);
			const circles = await clusters.evaluateAll(roots => roots.map(root => [...root.children].filter(child => {
				const box = child.getBoundingClientRect();
				return box.width > 0 && Math.abs(box.width - box.height) < 0.5 && parseFloat(getComputedStyle(child).borderRadius) > 0;
			}).length));
			expect(circles, 'the two original four-dot clusters').toEqual([4, 4]);
		} else if (page.viewportSize()!.width < 768) {
			await expect(title).toHaveCSS('font-size', '32px');
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
	});
}

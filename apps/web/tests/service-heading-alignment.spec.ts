import { expect, test } from '@playwright/test';

for (const locale of ['en', 'fr', 'es']) {
	for (const textScale of [1, 2])
	test(`${locale} keeps service card titles level with their icons at ${textScale * 100}% text`, async ({ page }) => {
		const prefix = locale === 'en' ? '' : `/${locale}`;
		await page.goto(`${prefix}/services/data-pipeline`);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.evaluate(() => document.fonts.ready);
		await page.evaluate((scale) => { document.documentElement.style.fontSize = `${16 * scale}px`; }, textScale);

		const headings = page.locator('.sections').getByRole('heading', { level: 2 });
		expect(await headings.count()).toBeGreaterThan(1);
		for (const heading of await headings.all()) {
			const geometry = await heading.evaluate((element) => {
				const header = element.closest('button') ?? element.parentElement?.parentElement;
				const icon = header?.querySelector('svg');
				const card = element.closest('[data-slot="card"]');
				if (!icon || !card) return null;
				const titleBox = element.getBoundingClientRect();
				const iconBox = icon.getBoundingClientRect();
				return {
					centerDifference: Math.abs(titleBox.top + titleBox.height / 2 - iconBox.top - iconBox.height / 2),
					topInset: titleBox.top - card.getBoundingClientRect().top,
					rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
				};
			});
			expect(geometry, 'each section heading has its own card and icon').not.toBeNull();
			expect(geometry!.centerDifference, 'the title and its icon share a row center').toBeLessThanOrEqual(1);
			expect(geometry!.topInset, 'the heading starts near the top of the card').toBeLessThanOrEqual(geometry!.rootFont * 3);
		}
	});
}

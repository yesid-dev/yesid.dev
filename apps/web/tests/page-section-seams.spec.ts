import { expect, test } from '@playwright/test';

test('Home section backgrounds touch at the drawn stroke, including the end of the manifesto', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(() => document.fonts.ready);
	const seams = page.locator('[data-slot="page-section-boundary"]');
	await expect(seams).toHaveCount(6);
	for (const seam of await seams.all()) {
		const geometry = await seam.evaluate(element => {
			const before = element.previousElementSibling!.getBoundingClientRect();
			const after = element.nextElementSibling!.getBoundingClientRect();
			const path = element.querySelector('path')!;
			const ink = path.getBBox();
			const middle = new DOMPoint(ink.x + ink.width / 2, ink.y + ink.height / 2).matrixTransform(path.getScreenCTM()!);
			return { gap: after.top - before.bottom, inkToEdge: middle.y - before.bottom, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, width: innerWidth };
		});
		expect(Math.abs(geometry.gap), 'no padded strip between section backgrounds').toBeLessThanOrEqual(0.5);
		expect(Math.abs(geometry.inkToEdge), 'the actual orange stroke lies on the section edge').toBeLessThanOrEqual(1);
		expect(geometry.left).toBeCloseTo(0, 0);
		expect(geometry.right).toBeCloseTo(geometry.width, 0);
	}
});

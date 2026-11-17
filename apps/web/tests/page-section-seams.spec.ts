import { expect, test } from '@playwright/test';

test('Home section backgrounds touch at the drawn stroke, including the end of the manifesto', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(() => document.fonts.ready);
	const seams = page.locator('[data-slot="page-section-boundary"]');
	await expect(seams).toHaveCount(6);
	expect(await seams.evaluateAll(lines => lines.map(line => line.getAttribute('data-stroke-segments')))).toEqual(['4', '5', '4', '5', '4', '5']);
	for (const seam of await seams.all()) {
		const geometry = await seam.evaluate(element => {
			const before = element.previousElementSibling!.getBoundingClientRect();
			const after = element.nextElementSibling!.getBoundingClientRect();
			const edge = element.getBoundingClientRect();
			const art = element.querySelector('svg')!;
			const ink = art.getBoundingClientRect();
			return {
				gap: after.top - before.bottom,
				edgeHeight: edge.height,
				clipEdge: ink.top + ink.height / 2 - before.bottom,
				clip: getComputedStyle(art).clipPath,
				left: edge.left,
				right: edge.right,
				width: innerWidth,
			};
		});
		expect(Math.abs(geometry.gap), 'no padded strip between section backgrounds').toBeLessThanOrEqual(0.5);
		expect(geometry.edgeHeight).toBe(0);
		expect(geometry.clip).toContain('50%');
		expect(Math.abs(geometry.clipEdge), 'the visible ink ends at the shared edge').toBeLessThanOrEqual(0.5);
		expect(geometry.left).toBeCloseTo(0, 0);
		expect(geometry.right).toBeCloseTo(geometry.width, 0);
	}
});

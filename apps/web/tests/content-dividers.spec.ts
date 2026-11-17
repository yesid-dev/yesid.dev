import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light'])
test(`${theme} ordinary content boundaries reuse the Home stroke at their edges`, async ({ page }) => {
	await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const reference = await page.locator('[data-slot="page-section-boundary"] path').first().getAttribute('d');
	expect(reference).toBeTruthy();

	for (const path of ['/', '/services', '/services/data-pipeline', '/projects', '/about']) {
		await page.goto(path);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		for (const scale of [1, 2]) {
			await page.evaluate((value) => { document.documentElement.style.fontSize = `${16 * value}px`; }, scale);
			const rules = page.locator('[data-testid="content-divider"]:visible');
			expect(await rules.count(), `content boundaries on ${path}`).toBeGreaterThan(0);
			for (const rule of await rules.all()) {
				await expect(rule.locator('path')).toHaveAttribute('d', reference!);
				await expect(rule).toHaveAttribute('aria-hidden', 'true');
				const geometry = await rule.evaluate((element) => {
					const style = getComputedStyle(element);
					const box = element.getBoundingClientRect();
					const parent = (element as HTMLElement).offsetParent?.getBoundingClientRect();
					return {
						margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
						padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
						edgeDifference: style.position === 'absolute' && parent
							? Math.min(Math.abs(box.y + box.height / 2 - parent.top), Math.abs(box.y + box.height / 2 - parent.bottom))
							: 0,
					};
				});
				expect(geometry.margin).toEqual(['0px', '0px', '0px', '0px']);
				expect(geometry.padding).toEqual(['0px', '0px', '0px', '0px']);
				expect(geometry.edgeDifference, `${path} keeps the stroke at the content edge at ${scale * 100}% text`).toBeLessThanOrEqual(1);
			}
		}
	}
});

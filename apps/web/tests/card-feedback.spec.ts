import { expect, test } from '@playwright/test';

for (const route of ['/', '/services']) {
	test(`${route} card body hover also morphs its service drawing`, async ({ page, isMobile }) => {
		test.skip(isMobile, 'Hover uses mouse or pen.');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto(route);
		const card = page.locator('.service-card').first();
		const panel = card.locator('[data-testid="service-svg-panel"]:visible');
		await panel.scrollIntoViewIfNeeded();
		const shapes = () => panel.locator('svg').evaluate(svg => new Set([...svg.querySelectorAll('path')].map(path => path.getAttribute('d'))).size);
		await expect.poll(shapes).toBeGreaterThan(1);
		await card.locator('.service-description').hover();
		await expect.poll(shapes).toBe(1);
		expect(new URL(page.url()).pathname).toBe(route);
	});
}

test('hovering the train card outside its button morphs its drawing', async ({ page, isMobile }) => {
	test.skip(isMobile, 'Hover uses mouse or pen.');
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/about');
	const card = page.getByTestId('about-train');
	await card.scrollIntoViewIfNeeded();
	const drawing = () => card.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')).join('|'));
	const before = await drawing();
	await card.hover({ position: { x: 3, y: 3 } });
	await expect.poll(drawing).not.toBe(before);
});

test('the Services listing has no divider at its closing band', async ({ page }) => {
	await page.goto('/services');
	await expect(page.getByTestId('services-cta-band')).toBeVisible();
	await expect(page.getByTestId('service-listing-page').locator('[data-slot="page-section-boundary"], [data-edge-rule]')).toHaveCount(0);
});

test('Fun Facts uses an orange drawn cross within its compact quadrants', async ({ page }, info) => {
	await page.goto('/about');
	const card = page.getByTestId('about-metrics');
	await expect(card.getByRole('listitem')).toHaveCount(4);
	const paths = card.locator('svg path');
	await expect(paths).toHaveCount(2);
	for (const path of await paths.all()) {
		const ink = await path.evaluate(element => {
			const probe = document.createElement('span'); probe.style.color = 'var(--primary)'; element.parentElement!.append(probe);
			const primary = getComputedStyle(probe).color; probe.remove();
			return { stroke: getComputedStyle(element).stroke, primary };
		});
		expect(ink.stroke).toBe(ink.primary);
		await expect(path).toHaveAttribute('vector-effect', 'non-scaling-stroke');
	}
	if (process.env.CARD_FEEDBACK_CAPTURE_DIR) {
		for (const text of [100, 200]) {
			await page.locator('html').evaluate((el, size) => { el.style.fontSize = size + '%'; }, text);
			await card.screenshot({ path: `${process.env.CARD_FEEDBACK_CAPTURE_DIR}/facts-${info.project.name}-${text}.png` });
		}
	}
});

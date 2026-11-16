import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import contract from '../../../contracts/kpis-v1.examples.json' with { type: 'json' };

for (const rowCount of [4, 1]) {
	test(`live Transit card renders a reading with ${rowCount} usable routes without overflow`, async ({ page }, testInfo) => {
		test.skip(!['desktop', 'phone'].includes(testInfo.project.name), 'Desktop and mobile contract coverage.');
		// Opt this test alone into the real polling path, with a local response.
		// All other suites retain the production webdriver bypass.
		await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const body = structuredClone(contract.examples[1].body);
		if ('topRoutes' in body && body.topRoutes) {
			body.topRoutes = body.topRoutes.map((row, index) => ({ ...row, avgDelayS: index < rowCount ? row.avgDelayS : null }));
		}
		await page.route('https://transit.yesid.dev/api/v1/kpis', route => route.fulfill({ json: body }));
		await page.goto('/');
		const card = page.getByTestId('hero-transit-card');
		await expect(page.getByTestId('hero-transit-proof')).toHaveAttribute('data-state', 'live');
		await expect(page.getByTestId('hero-transit-state')).toHaveText(/^Live · updated/);
		await expect(page.getByTestId('hero-transit-figure')).toHaveCount(3);
		await expect(page.getByTestId('hero-transit-figures')).toContainText('10');
		await expect(page.getByTestId('hero-transit-figures')).toContainText('of 6');
		await page.evaluate(() => document.fonts.ready);
		const geometry = await card.evaluate(el => {
			const box = el.getBoundingClientRect();
			const figures = [...el.querySelectorAll('[data-testid="hero-transit-figure"]')].map(figure => {
				const rect = figure.getBoundingClientRect();
				const value = figure.querySelector('dd')!;
				return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, clipped: value.scrollWidth > value.clientWidth + 1 };
			});
			return { width: innerWidth, left: box.left, right: box.right, bottom: box.bottom, figures,
				overflow: document.documentElement.scrollWidth - innerWidth };
		});
		expect(geometry.overflow).toBeLessThanOrEqual(1);
		expect(geometry.left).toBeGreaterThanOrEqual(0);
		expect(geometry.right).toBeLessThanOrEqual(geometry.width);
		for (const figure of geometry.figures) {
			expect(figure.bottom).toBeLessThan(geometry.bottom);
			expect(figure.left).toBeGreaterThanOrEqual(geometry.left);
			expect(figure.right).toBeLessThanOrEqual(geometry.right);
			expect(figure.clipped).toBe(false);
		}
		const measurementsPath = testInfo.outputPath('live-figures-layout.json');
		await writeFile(measurementsPath, JSON.stringify(geometry, null, 2));
		await testInfo.attach('live-figures-layout', { path: measurementsPath, contentType: 'application/json' });
		await card.screenshot({ path: testInfo.outputPath('live-transit.png') }).then(shot =>
			testInfo.attach('live-transit', { body: shot, contentType: 'image/png' }));
	});
}

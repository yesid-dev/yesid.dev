import { expect, test, type Locator } from '@playwright/test';

async function focusedOverlap(target: Locator) {
	return target.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const pill = document.querySelector('[data-testid="nav-pill"]')!.getBoundingClientRect();
		const width = Math.max(0, Math.min(box.right, pill.right) - Math.max(box.left, pill.left));
		const height = Math.max(0, Math.min(box.bottom, pill.bottom) - Math.max(box.top, pill.top));
		return { area: width * height, top: box.top, bottom: box.bottom, pillBottom: pill.bottom };
	});
}

test.beforeEach(async ({ page, context, baseURL }) => {
	const origin = new URL(baseURL!).origin;
	await context.route('**/*', (route) => {
		const request = route.request();
		return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method())
			? route.continue() : route.abort();
	});
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const locale of ['en', 'fr', 'es']) {
	const prefix = locale === 'en' ? '' : '/' + locale;
	test(locale + ' puts 404 recovery before its illustration', async ({ page }, info) => {
		const response = await page.goto(prefix + '/consumer-acceptance-missing-page');
		expect(response?.status()).toBe(404);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.evaluate(() => document.fonts.ready);
		const error = page.locator('[data-slot="error-page"]');
		const heading = error.getByRole('heading', { level: 1 });
		const links = error.getByTestId('error-suggestion-link');
		const scene = error.getByTestId('construction-scene');
		await expect(heading).toBeVisible();
		await expect(scene).toBeVisible();
		expect(await links.count()).toBeGreaterThan(0);
		const picture = (await scene.boundingBox())!;
		expect((await heading.boundingBox())!.y).toBeLessThan(picture.y);
		for (const link of await links.all()) {
			await expect(link).toBeInViewport();
			const box = (await link.boundingBox())!;
			expect(box.y + box.height).toBeLessThanOrEqual(picture.y + 1);
		}
		await info.attach('recovery-geometry', { body: JSON.stringify({ picture }), contentType: 'application/json' });
	});

	test(locale + ' keeps the footer wordmark clear after backward Tab', async ({ page }, info) => {
		await page.goto(prefix + '/projects/transit-data-pipeline');
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.evaluate(() => document.fonts.ready);
		await page.keyboard.press('End');
		const footer = page.getByRole('contentinfo');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeInViewport();
		await expect(page.getByTestId('toc-pill')).toBeHidden();
		const links = footer.getByRole('link');
		const wordmark = links.first();
		await links.last().evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
		const steps = await links.count();
		for (let index = 0; index < steps; index++) {
			if (await wordmark.evaluate((el) => el === document.activeElement)) break;
			await page.keyboard.press('Shift+Tab');
		}
		await expect(wordmark).toBeFocused();
		try {
			await expect.poll(async () => (await focusedOverlap(wordmark)).area).toBeLessThan(1);
			expect(await wordmark.evaluate((el) => {
				const b = el.getBoundingClientRect();
				const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
				return el === hit || (hit !== null && el.contains(hit));
			})).toBe(true);
		} finally {
			await info.attach('focus-geometry', { body: JSON.stringify(await focusedOverlap(wordmark)), contentType: 'application/json' });
		}
	});
}

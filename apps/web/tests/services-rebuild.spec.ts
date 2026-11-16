// DEV-39: the services pages rebuilt from the reviewed preview D-M5 (owner, 15 November 2026).
import { test, expect, type Locator, type Page } from '@playwright/test';

const THEMES = ['dark', 'light'] as const;
const LISTING = '/services';
const DETAIL = '/services/data-pipeline';

async function open(page: Page, path: string, theme: (typeof THEMES)[number] = 'dark') {
	await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/**
 * Contrast of a text colour painted over a stack of backgrounds (bottom first), composited by
 * the browser itself, so color-mix(), alpha and any colour space resolve as they paint.
 */
async function contrast(page: Page, text: string, layers: string[]): Promise<number> {
	return page.evaluate(
		([text, layers]) => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const context = canvas.getContext('2d', { willReadFrequently: true })!;
			const paint = (colours: string[]) => {
				context.clearRect(0, 0, 1, 1);
				for (const colour of colours) {
					context.fillStyle = colour;
					context.fillRect(0, 0, 1, 1);
				}
				const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
				const channel = (value: number) => {
					const c = value / 255;
					return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
				};
				return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
			};
			const background = paint(layers);
			const foreground = paint([...layers, text]);
			const [light, dark] = background > foreground ? [background, foreground] : [foreground, background];
			return (light + 0.05) / (dark + 0.05);
		},
		[text, layers] as const,
	);
}

const css = (locator: Locator, property: string, pseudo?: string) =>
	locator.evaluate((el, [property, pseudo]) => getComputedStyle(el, pseudo || null).getPropertyValue(property), [property, pseudo ?? ''] as const);

test.describe('the orange top strip', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Viewport-independent checks, set per test.');

	for (const theme of THEMES)
		for (const path of [LISTING, DETAIL])
			test(`${path} ${theme}: the orange starts at the window's top edge behind a legible pill`, async ({ page }) => {
				for (const width of [390, 1440]) {
					await page.setViewportSize({ width, height: 900 });
					await open(page, path, theme);
					const strip = page.getByTestId('station-strip');
					const orange = await css(strip, 'background-color');
					expect(orange).toBe('rgb(224, 120, 0)');
					expect(await css(strip, 'background-color', '::before')).toBe(orange);
					const reach = await strip.evaluate((el) => el.getBoundingClientRect().top - parseFloat(getComputedStyle(el, '::before').height));
					expect(reach, 'the band reaches the window top edge').toBeLessThanOrEqual(0);

					// The pill floats over the orange: it paints its own fill on top of the band.
					const pill = page.getByTestId('nav-pill');
					const pillBox = (await pill.boundingBox())!;
					const stripBox = (await strip.boundingBox())!;
					expect(pillBox.y + pillBox.height).toBeLessThanOrEqual(stripBox.y + 1);
					const pillFill = await css(pill, 'background-color');
					for (const link of await pill.locator('a:visible').all()) {
						const ratio = await contrast(page, await css(link, 'color'), [orange, pillFill]);
						expect(ratio, `pill link legible over the orange (${theme}, ${width})`).toBeGreaterThanOrEqual(4.5);
					}

					// Dark text on orange; the current station in the signage pair.
					for (const station of await strip.locator('.station-tab').all()) {
						const back = await css(station, 'background-color');
						const ratio = await contrast(page, await css(station, 'color'), [orange, back]);
						expect(ratio, `station text meets 4.5:1 (${theme}, ${width})`).toBeGreaterThanOrEqual(4.5);
					}
				}
			});

	test('on Services the strip is a named list of in-page jumps with the service in view marked', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, LISTING);
		const nav = page.getByRole('navigation', { name: 'Services on this page' });
		await expect(nav.getByRole('link')).toHaveCount(4);
		await expect(page.getByRole('tab')).toHaveCount(0);
		await expect(nav.locator('[aria-current]')).toHaveCount(1);
		for (const link of await nav.getByRole('link').all()) await expect(link).toHaveAttribute('href', /^#service-/);
		await nav.getByTestId('station-tab-analytics-reporting').click();
		await expect(page).toHaveURL(/station=analytics-reporting/);
		await expect(nav.getByTestId('station-tab-analytics-reporting')).toHaveAttribute('aria-current', 'true');
		await expect(page.locator('#svc-title-analytics-reporting')).toBeFocused();
		const title = (await page.locator('#svc-title-analytics-reporting').boundingBox())!;
		const strip = (await page.getByTestId('station-strip').boundingBox())!;
		expect(title.y, 'the focused title lands below the sticky strip').toBeGreaterThanOrEqual(strip.y + strip.height);
	});

	test('on a service page the strip links to each service with the current one marked as the page', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, DETAIL);
		const nav = page.getByRole('navigation', { name: 'Service navigation' });
		await expect(nav.getByRole('link')).toHaveCount(4);
		await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
		await expect(nav.getByTestId('station-tab-data-pipeline')).toHaveAttribute('aria-current', 'page');
		await expect(nav.getByTestId('station-tab-web-development')).toHaveAttribute('href', '/services/web-development');
	});

	test('the strip sticks on Services and scrolls away on a service page', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const [path, sticks] of [[LISTING, true], [DETAIL, false]] as const) {
			await open(page, path);
			const strip = page.getByTestId('station-strip');
			const before = (await strip.boundingBox())!;
			await page.evaluate(() => window.scrollTo(0, 900));
			await expect
				.poll(async () => (await strip.boundingBox())!.y)
				.toBe(sticks ? before.y : before.y - 900);
		}
	});
});

test.describe('Services page', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Sets its own viewports.');

	test('"Services." is the rotated, sticky left rail title on desktop and reads across on phones', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, LISTING);
		const title = page.getByRole('heading', { level: 1 });
		await expect(title).toHaveText('Services.');
		expect(await css(title, 'writing-mode')).toBe('vertical-rl');
		const firstCard = page.locator('[data-testid^="service-card-"] [data-slot="card"]').first();
		expect((await title.boundingBox())!.x + (await title.boundingBox())!.width).toBeLessThanOrEqual((await firstCard.boundingBox())!.x);
		await page.evaluate(() => window.scrollTo(0, 700));
		await expect.poll(async () => {
			const box = (await title.boundingBox())!;
			const strip = (await page.getByTestId('station-strip').boundingBox())!;
			return box.y >= strip.y + strip.height && box.y + box.height <= 900;
		}, { message: 'the rail title stays in view below the strip' }).toBe(true);

		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => window.scrollTo(0, 0));
		await expect.poll(() => css(title, 'writing-mode')).toBe('horizontal-tb');
		expect((await title.boundingBox())!.y + (await title.boundingBox())!.height).toBeLessThanOrEqual((await firstCard.boundingBox())!.y);
	});

	for (const theme of THEMES)
		test(`${theme}: a service card lifts 1px with its edge lit, without glow or shadow`, async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 900 });
			await open(page, LISTING, theme);
			const item = page.getByTestId('service-card-data-pipeline');
			const card = item.locator('[data-slot="card"]');
			await item.scrollIntoViewIfNeeded();
			await page.mouse.move(0, 0);
			const read = () => card.evaluate((el) => {
				const s = getComputedStyle(el);
				return { transform: s.transform, border: s.borderTopColor, shadow: s.boxShadow, filter: s.filter };
			});
			await expect.poll(async () => (await read()).transform).toBe('none');
			const before = await read();
			await item.locator('.service-description').hover();
			await expect.poll(async () => (await read()).transform).toBe('matrix(1, 0, 0, 1, 0, -1)');
			const after = await read();
			expect(after.border).not.toBe(before.border);
			expect(after.shadow).toBe(before.shadow);
			expect(after.shadow === 'none' || after.shadow.includes('inset')).toBe(true);
			expect(after.filter).toBe('none');
		});

	test('the whole card leads to its service; the drawing keeps its own tap', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, LISTING);
		const item = page.getByTestId('service-card-data-pipeline');
		await item.locator('.card-art [data-testid="service-svg-panel"]').click();
		await expect(page).toHaveURL(/\/services(\?.*)?$/);
		await expect(item.getByRole('link')).toHaveCount(1);
		await item.locator('.service-description').click();
		await expect(page).toHaveURL(/\/services\/data-pipeline$/);
		await expect(page.getByTestId('service-detail-page')).toBeVisible();
	});

	test('no counters, numbering or giant type; metrics in reading ink', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, LISTING);
		const main = page.locator('main');
		await expect(main).not.toContainText(/Service\s*\d+\s*\/\s*\d+/i);
		await expect(page.getByTestId('station-strip')).not.toContainText(/\d/);
		const value = page.locator('[data-testid="service-metric"] .metric-value').first();
		expect(await css(value, 'color')).toBe(await css(page.locator('main h1'), 'color'));
		expect(await css(page.locator('[data-testid="service-metric"] .metric-label').first(), 'text-transform')).toBe('none');
	});
});

test.describe('dividers and the closing band', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Viewport-independent.');

	for (const [path, sections] of [[LISTING, 2], [DETAIL, 3]] as const)
		test(`${path}: a divider ends every section but the last; none before the footer`, async ({ page }) => {
			await open(page, path);
			await expect(page.locator('main [data-slot="page-section"]')).toHaveCount(sections);
			await expect(page.locator('main [data-slot="page-section-boundary"]')).toHaveCount(sections - 1);
			const last = page.locator('main [data-slot="page-section"]').last();
			await expect(last.getByTestId(/cta-band$/)).toBeVisible();
			await expect(last.getByRole('link', { name: /./ }).first()).toBeVisible();
			// Nothing drawn between the band and the footer's hazard edge.
			const gap = await page.evaluate(() => {
				const band = [...document.querySelectorAll('main [data-slot="page-section"]')].at(-1)!.getBoundingClientRect();
				const edge = document.querySelector('[data-slot="footer-hazard-edge"]')!.getBoundingClientRect();
				const visible = [...document.querySelectorAll('[data-slot="separator"], [data-slot="page-section-boundary"]')].filter((el) => {
					const box = el.getBoundingClientRect();
					return box.height > 0 && getComputedStyle(el).display !== 'none' && box.top >= band.top - 1 && box.bottom <= edge.top + 1;
				});
				return visible.length;
			});
			expect(gap, 'no divider inside the band or before the footer').toBe(0);
		});
});

test.describe('the service page', () => {
	test.skip(({ viewport }) => viewport!.width < 1024, 'Sets its own viewports.');

	test('fit first, the larger opening, "click me" on phone and desktop, no counters', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await open(page, DETAIL);
		const anchors = await page.locator('.sections.article-body [data-toc]').evaluateAll((els) => els.map((el) => el.getAttribute('data-toc')));
		expect(anchors[0]).toBe('svc-section-0');
		await expect(page.locator('[data-toc="svc-section-0"] [aria-expanded]')).toHaveCount(0);
		// DEV-43: one step larger from the existing type tokens (--text-display, --text-reading).
		const size = parseFloat(await css(page.getByRole('heading', { level: 1 }), 'font-size'));
		expect(size).toBeGreaterThan(48);
		expect(size).toBeLessThanOrEqual(64.5);
		const subtitle = parseFloat(await css(page.locator('.detail-description'), 'font-size'));
		expect(subtitle).toBeGreaterThan(17.5);
		expect(subtitle).toBeLessThanOrEqual(19.5);
		// The opening keeps its top tight under the strip, not pushed down.
		const opening = await page.evaluate(() => {
			const strip = document.querySelector('[data-testid="station-strip"]')!.getBoundingClientRect();
			const title = document.querySelector('h1')!.getBoundingClientRect();
			const bulk = document.querySelector('.sections-slot')!.getBoundingClientRect();
			const grid = document.querySelector('.service-story-section')!.getBoundingClientRect();
			return { toTitle: title.top - strip.bottom, toStory: grid.top - bulk.bottom };
		});
		expect(opening.toTitle).toBeLessThanOrEqual(76);
		expect(opening.toStory).toBeLessThanOrEqual(140);
		await expect(page.locator('.svg-desktop [data-testid="hero-dot-annotation"]')).toBeVisible();
		await expect(page.locator('main')).not.toContainText(/SEC\s*\d+\s*\/\s*\d+|Service\s*\d+\s*\/\s*\d+/i);
		await expect(page.locator('main [data-slot="badge"]')).toHaveCount(0);
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.getByTestId('toc-pill')).toHaveCount(0);
	});

	test('phone: the 56px drawing keeps its "click me", the desktop panel stays away', async ({ page }) => {
		for (const width of [320, 390]) {
			for (const locale of ['en', 'fr']) {
				await page.setViewportSize({ width, height: 844 });
				await open(page, locale === 'en' ? DETAIL : `/fr${DETAIL}`);
				await expect(page.locator('.svg-mobile [data-testid="hero-dot-annotation"]')).toBeVisible();
				await expect(page.locator('.svg-desktop')).toBeHidden();
				const tile = await page.locator('.svg-mobile [data-testid="service-svg-panel"] [data-slot="svg-icon"]').evaluate((el) => {
					const box = el.getBoundingClientRect();
					return { width: box.width, height: box.height };
				});
				expect(tile.width).toBeCloseTo(56, 0);
				expect(tile.height).toBeCloseTo(56, 0);
				// The annotation is a pointer-transparent overlay, never a control.
				const annotation = page.locator('.svg-mobile [data-testid="hero-dot-annotation"]');
				expect(await css(annotation, 'pointer-events')).toBe('none');
				// The tile keeps the tap that morphs the drawing.
				const url = page.url();
				await page.locator('.svg-mobile [data-testid="service-svg-panel"]').click();
				expect(page.url()).toBe(url);
				await expect(page.locator('.svg-mobile [data-testid="service-svg-panel"]')).toBeVisible();
				expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
			}
		}
	});

	test('under reduced motion the drawings stand still and "click me" is not shown', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const path of [LISTING, DETAIL]) {
			await open(page, path);
			const icons = page.locator('[data-testid="service-svg-panel"] [data-slot="svg-icon"]');
			expect(await icons.count()).toBeGreaterThan(0);
			for (const icon of await icons.all()) await expect(icon).toHaveAttribute('data-still', '');
		}
		await expect(page.locator('.svg-desktop [data-testid="hero-dot-annotation"]')).toBeHidden();
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.locator('.svg-mobile [data-testid="hero-dot-annotation"]')).toBeHidden();
	});
});

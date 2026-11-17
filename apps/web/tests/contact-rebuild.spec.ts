// The contact page rebuilt from the owner-reviewed preview D-M4 (DEV-40): the shared listing rail,
// solid yellow rule and hazard edge, the phone order, the hover without halo, and CSP.
import { test, expect } from '@playwright/test';
import { visibleContactTerminal } from './_support/helpers';
import { tokenColor } from './_support/token-color';

const blockExternal = async (page: import('@playwright/test').Page) =>
	page.route('https://**/*', (route) => route.abort());

for (const path of ['/contact', '/fr/contact']) {
	test(`hydration respects CSP on ${path}`, async ({ page }) => {
		await page.addInitScript(() => {
			const violations: object[] = [];
			Object.assign(window, { cspViolations: violations });
			document.addEventListener('securitypolicyviolation', (event) =>
				violations.push({ blocked: event.blockedURI, directive: event.violatedDirective, source: event.sourceFile }),
			);
		});
		await blockExternal(page);
		await page.goto(path);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await expect(visibleContactTerminal(page).getByTestId('contact-submit')).toBeEnabled();
		// Exercise the hydrated title while scrolling.
		await page.evaluate(() => window.scrollBy(0, 400));
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
		expect(await page.evaluate(() => Reflect.get(window, 'cspViolations'))).toEqual([]);
	});
}

test('desktop: "Contact." stays centered in the sticky Projects rail, clear of the header pill', async ({ page }) => {
	test.skip(test.info().project.name !== 'desktop', 'One desktop pass covers the rail title.');
	await page.setViewportSize({ width: 1440, height: 900 });
	await blockExternal(page);
	await page.goto('/contact');
	await expect(visibleContactTerminal(page).getByTestId('contact-submit')).toBeEnabled();
	await page.evaluate(() => document.fonts.ready);
	const title = page.getByRole('heading', { level: 1 });
	await expect(title).toHaveText('Contact.');
	await expect(title).toHaveAttribute('data-slot', 'rail-title-text');
	await expect.poll(() => title.evaluate((el) => getComputedStyle(el).writingMode)).toBe('vertical-rl');
	const size = await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
	expect(size).toBeGreaterThanOrEqual(48);
	expect(size).toBeLessThanOrEqual(56);
	const rail = page.locator('[data-slot="listing-edge-title"]');
	expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
	// It never overlaps the panels: the info panel starts right of the title.
	const titleBox = (await title.boundingBox())!;
	const info = (await page.getByTestId('contact-info-terminal').boundingBox())!;
	expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(info.x);
	// The column sticks as a unit, keeping its title centered below the header pill.
	const pill = (await page.getByTestId('nav-pill').boundingBox())!;
	const railBox = (await rail.boundingBox())!;
	expect(titleBox.y).toBeGreaterThanOrEqual(pill.y + pill.height);
	const scrollBy = Math.max(1, Math.ceil(railBox.y));
	await page.evaluate((by) => window.scrollBy(0, by), scrollBy);
	await expect.poll(async () => {
		const titleBox = (await title.boundingBox())!;
		const railBox = (await rail.boundingBox())!;
		return Math.abs(titleBox.y + titleBox.height / 2 - railBox.y - railBox.height / 2);
	}).toBeLessThanOrEqual(1);
});

test('phone: horizontal title, then the details, then the form', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await blockExternal(page);
	await page.goto('/contact');
	await expect(visibleContactTerminal(page).getByTestId('contact-submit')).toBeEnabled();
	const title = page.getByRole('heading', { level: 1 });
	expect(await title.evaluate((el) => getComputedStyle(el).writingMode)).toBe('horizontal-tb');
	const titleBox = (await title.boundingBox())!;
	const info = (await page.getByTestId('contact-info-terminal').boundingBox())!;
	const form = (await page.getByTestId('contact-form-terminal').boundingBox())!;
	expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(info.y);
	expect(info.y + info.height).toBeLessThanOrEqual(form.y);
	await expect(page.getByText('NEXT STOP: YOU')).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

// The 32px horizontal Contact heading is part of the accepted phone and tablet layout.
for (const path of ['/contact', '/fr/contact', '/es/contact']) {
	test(`horizontal title renders at 32px in EN, FR and ES on ${path}`, async ({ page }, testInfo) => {
		test.skip(
			!['phone', 'tablet'].includes(testInfo.project.name),
			'The horizontal title is measured below the desktop breakpoint.',
		);
		await blockExternal(page);
		const widths = testInfo.project.name === 'phone' ? [390, 360] : [768];
		for (const width of widths) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(path);
			await expect(visibleContactTerminal(page).getByTestId('contact-submit')).toBeEnabled();
			await page.evaluate(() => document.fonts.ready);
			const title = page.getByRole('heading', { level: 1 });
			await expect(title).toBeVisible();
			expect(await title.evaluate((el) => getComputedStyle(el).writingMode)).toBe('horizontal-tb');
			// Geometry first: one 32px line paints about 34px tall, where the 40px default painted 42px.
			const box = (await title.boundingBox())!;
			expect(box.height, `${width}px ${path}`).toBeGreaterThan(31);
			expect(box.height, `${width}px ${path}`).toBeLessThan(35);
			expect(await title.evaluate((el) => getComputedStyle(el).fontSize), `${width}px ${path}`).toBe('32px');
			// The title still sits above the panels, details first.
			const info = (await page.getByTestId('contact-info-terminal').boundingBox())!;
			expect(box.y + box.height).toBeLessThanOrEqual(info.y);
		}
	});
}

for (const width of [390, 1440]) {
	test(`the solid yellow rule sits under both title bars, and no divider before the footer at ${width}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await blockExternal(page);
		await page.goto('/contact');
		for (const id of ['contact-info-terminal', 'contact-form-terminal']) {
			const panel = page.getByTestId(id);
			await expect(panel).toHaveClass(/terminal-rule-line/);
			await expect(panel.locator(':scope > .terminal-rule')).toHaveCount(0);
			const bar = panel.locator(':scope > .terminal-titlebar');
			await expect(bar).toHaveCSS('border-bottom-width', '1px');
			await expect(bar).toHaveCSS('border-bottom-style', 'solid');
			await expect(bar).toHaveCSS('border-bottom-color', await tokenColor(page, 'var(--accent)'));
			const barBox = (await bar.boundingBox())!;
			const panelBox = (await panel.boundingBox())!;
			const borders = await panel.evaluate(el => {
				const style = getComputedStyle(el);
				return parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
			});
			expect(barBox.width, 'the yellow border spans the complete inner panel width').toBeCloseTo(panelBox.width - borders, 1);
		}
		await expect(page.locator('main [data-slot="page-section-boundary"]')).toHaveCount(0);
		await expect(page.locator('main [data-variant="hazard"], main .hazard-tape')).toHaveCount(0);
		await expect(page.locator('[data-slot="footer-hazard-edge"]')).toHaveCount(1);
	});
}

for (const theme of ['dark', 'light']) {
	test(`hover: Send message darkens and lifts 1px with no halo, the same in ${theme}`, async ({ page }, testInfo) => {
		// The kit's lift applies under hover-capable pointers only; touch projects get the tap check below.
		test.skip(testInfo.project.name !== 'desktop', 'Hover is exercised on the desktop pointer project.');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
		await blockExternal(page);
		await page.goto('/contact');
		const submit = visibleContactTerminal(page).getByTestId('contact-submit');
		await expect(submit).toBeEnabled();
		const rest = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
		await submit.hover();
		await expect.poll(() => submit.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -1px');
		const hover = await submit.evaluate((el) => {
			const style = getComputedStyle(el);
			return { background: style.backgroundColor, shadow: style.boxShadow, text: style.textShadow, filter: style.filter };
		});
		expect(hover.background).not.toBe(rest);
		expect(hover).toMatchObject({ shadow: 'none', text: 'none', filter: 'none' });
		for (const id of ['contact-booking-link', 'contact-social-calendar']) {
			const link = page.getByTestId(id);
			await link.hover();
			await expect.poll(() => link.evaluate((el) => getComputedStyle(el).translate)).toBe('0px -1px');
			expect(await link.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
		}
	});
}

// Touch devices have no hover: the controls keep a 44px tap target and a tap adds no glow.
test('touch: controls keep their tap target and a tap adds no glow', async ({ page }, testInfo) => {
	test.skip(!['phone', 'tablet'].includes(testInfo.project.name), 'Tap is exercised on touch projects.');
	await blockExternal(page);
	await page.goto('/contact');
	const terminal = visibleContactTerminal(page);
	const submit = terminal.getByTestId('contact-submit');
	await expect(submit).toBeEnabled();
	for (const control of [submit, terminal.getByTestId('contact-booking-link'), page.getByTestId('contact-social-calendar')]) {
		const box = (await control.boundingBox())!;
		expect(box.height).toBeGreaterThanOrEqual(44);
		expect(box.width).toBeGreaterThanOrEqual(44);
	}
	await submit.tap();
	await expect(terminal.getByTestId('contact-error-summary')).toBeFocused();
	expect(
		await submit.evaluate((el) => {
			const style = getComputedStyle(el);
			return { shadow: style.boxShadow, text: style.textShadow, filter: style.filter };
		}),
	).toEqual({ shadow: 'none', text: 'none', filter: 'none' });
});

// Every link and button in the form panel keeps the 44px tap minimum in each state the visitor
// reaches: the empty form, the errors, the not-sent box (its address link) and the result.
async function expectTargets(scope: import('@playwright/test').Locator, state: string) {
	const controls = await scope.locator('a, button').filter({ visible: true }).all();
	expect(controls.length, `${state}: controls to measure`).toBeGreaterThan(0);
	for (const control of controls) {
		const box = (await control.boundingBox())!;
		const name = `${state}: ${(await control.textContent())?.trim()}`;
		expect(box.height, name).toBeGreaterThanOrEqual(44);
		expect(box.width, name).toBeGreaterThanOrEqual(44);
	}
}

for (const width of [390, 1440]) {
	test(`fields read at 16px and every control is at least 44px in every form state at ${width}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await blockExternal(page);
		await page.goto('/contact');
		const terminal = visibleContactTerminal(page);
		await expect(terminal.getByTestId('contact-submit')).toBeEnabled();
		const fields = terminal.getByRole('textbox');
		for (const field of await fields.all()) {
			expect(await field.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
			expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		}
		await expectTargets(terminal, 'empty');
		await expectTargets(page.getByTestId('contact-info-terminal'), 'info');

		await terminal.getByTestId('contact-submit').click();
		await expect(terminal.getByTestId('contact-error-summary')).toBeFocused();
		await expectTargets(terminal, 'errors');

		await fields.nth(0).fill('Fixture Reader');
		await fields.nth(1).fill('reader@example.test');
		await fields.nth(2).fill('A fixture message.');
		await terminal.getByTestId('contact-submit').click();
		const failure = terminal.getByTestId('contact-send-error');
		await expect(failure).toBeFocused();
		await expect(failure.getByRole('link', { name: 'contact@yesid.dev', exact: true })).toBeVisible();
		await expectTargets(failure, 'not sent');
		await expectTargets(terminal, 'not sent');

		await page.unrouteAll({ behavior: 'ignoreErrors' });
		await page.route('https://api.web3forms.com/submit', (route) => route.fulfill({ json: { success: true } }));
		await terminal.getByTestId('contact-submit').click();
		const success = terminal.getByTestId('contact-success');
		await expect(success.getByTestId('contact-sent-message')).toBeFocused();
		await expect(success.getByRole('link')).toHaveCount(2);
		await expectTargets(success, 'sent');
		await success.getByTestId('contact-reset').click();
	});
}

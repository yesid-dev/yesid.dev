// The contact page rebuilt from the owner-reviewed preview D-M4 (DEV-40): the kit's RailTitle,
// dimension line and street edge, the phone order, the hover without halo, and CSP.
import { test, expect } from '@playwright/test';
import { visibleContactTerminal } from './_support/helpers';

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
		// The rail title sets its fitted size and clip after hydration; scroll so the clip runs too.
		await page.evaluate(() => window.scrollBy(0, 400));
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
		expect(await page.evaluate(() => Reflect.get(window, 'cspViolations'))).toEqual([]);
	});
}

test('desktop: "Contact." is a sticky rail title at about 144px, clear of the header pill', async ({ page }) => {
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
	expect(size).toBeGreaterThan(120);
	expect(size).toBeLessThanOrEqual(144);
	const rail = page.locator('[data-slot="rail-title"]');
	expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
	// It never overlaps the panels: the info panel starts right of the title.
	const titleBox = (await title.boundingBox())!;
	const info = (await page.getByTestId('contact-info-terminal').boundingBox())!;
	expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(info.x);
	// Sticky: while its section still has room below it, a scroll leaves it pinned below the pill;
	// it leaves with the section's end, never before the footer.
	const pill = (await page.getByTestId('nav-pill').boundingBox())!;
	const stickyTop = await rail.evaluate((el) => parseFloat(getComputedStyle(el).top));
	expect(stickyTop).toBeGreaterThanOrEqual(pill.y + pill.height);
	const section = (await page.locator('main [data-slot="page-section"]').boundingBox())!;
	const slack = section.y + section.height - (titleBox.y + titleBox.height);
	expect(slack).toBeGreaterThan(40);
	await page.evaluate((by) => window.scrollBy(0, by), Math.round(slack / 2) + Math.max(0, titleBox.y - stickyTop));
	await expect.poll(async () => Math.round((await title.boundingBox())!.y)).toBe(Math.round(stickyTop));
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

for (const width of [390, 1440]) {
	test(`the dimension line sits under both title bars, and no divider before the footer at ${width}`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await blockExternal(page);
		await page.goto('/contact');
		for (const id of ['contact-info-terminal', 'contact-form-terminal']) {
			const panel = page.getByTestId(id);
			const rule = panel.locator('[data-variant="dimension"]');
			await expect(rule).toHaveCount(1);
			const bar = (await panel.locator('.terminal-titlebar').boundingBox())!;
			const line = (await rule.boundingBox())!;
			expect(Math.abs(line.y - (bar.y + bar.height))).toBeLessThanOrEqual(1);
			expect(line.width).toBeGreaterThan(bar.width - 2);
		}
		await expect(page.locator('main [data-slot="page-section-boundary"]')).toHaveCount(0);
		await expect(page.locator('main [data-variant="hazard"], main .hazard-tape')).toHaveCount(0);
		await expect(page.locator('[data-slot="footer-street-edge"]')).toHaveCount(1);
	});
}

for (const theme of ['dark', 'light']) {
	test(`hover: Send message darkens and lifts 1px with no halo, the same in ${theme}`, async ({ page, isMobile }) => {
		test.skip(isMobile, 'Hover needs a pointer.');
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

test('fields read at 16px and every control is at least 44px tall', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await blockExternal(page);
	await page.goto('/contact');
	const terminal = visibleContactTerminal(page);
	await expect(terminal.getByTestId('contact-submit')).toBeEnabled();
	for (const field of await terminal.getByRole('textbox').all()) {
		expect(await field.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
		expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
	}
	for (const control of [
		terminal.getByTestId('contact-submit'),
		terminal.getByTestId('contact-booking-link'),
		...(await page.getByTestId('contact-info-terminal').getByRole('link').all()),
	])
		expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

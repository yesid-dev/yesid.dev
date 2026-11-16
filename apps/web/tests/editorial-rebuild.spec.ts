// DEV-41: the editorial pages rebuilt from the reviewed previews D-M2 (case study) and D-M3 (article).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixturePostPath } from './_support/content-fixtures';
import { tokenColor } from './_support/token-color';

const transit = '/projects/transit-data-pipeline';
const cafe = '/projects/cafe-arona';
const article = fixturePostPath('en');

const summaries = {
	en: 'The tools behind each part of Transit, then the tests and the size of the code, dated.',
	fr: 'Les outils derrière chaque partie de Transit, puis les tests et la taille du code, datés.',
	es: 'Las herramientas detrás de cada parte de Transit, y luego las pruebas y el tamaño del código, con fecha.',
} as const;
const developersTitle = { en: 'For developers', fr: 'Pour les développeurs', es: 'Para desarrolladores' } as const;

async function open(page: Page, path: string, width: number, height = 900) {
	await page.setViewportSize({ width, height });
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(() => document.fonts.ready);
}

const box = (locator: Locator) => locator.evaluate(el => {
	const r = el.getBoundingClientRect();
	return { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom };
});

/** Visible tape or ruler backgrounds inside the page; drawn pen strokes are allowed. */
const visibleHazards = (page: Page) => page.locator('main').evaluate(main =>
	[...main.querySelectorAll<HTMLElement>('[data-slot="separator"]:not(.hand-drawn-line)')].filter(el => {
		const style = getComputedStyle(el);
		return el.getClientRects().length > 0 && style.display !== 'none' && style.backgroundImage.includes('repeating-linear-gradient');
	}).length);

test.describe('full-bleed frame', () => {
	test('the case study keeps today’s 1 : 2 : 1 at 1440 and caps the story at 48rem at 1920', async ({ page }) => {
		await open(page, transit, 1440);
		const [left, center, right] = await Promise.all([
			box(page.locator('[data-slot="detail-shell-left"]')),
			box(page.locator('[data-slot="detail-shell-center"]')),
			box(page.locator('[data-slot="detail-shell-right"]')),
		]);
		expect(Math.abs(left.width - right.width)).toBeLessThanOrEqual(1);
		expect(Math.abs(center.width - 2 * left.width)).toBeLessThanOrEqual(2);

		await open(page, transit, 1920);
		const viewport = await page.evaluate(() => document.documentElement.clientWidth);
		const wide = {
			left: await box(page.locator('[data-slot="detail-shell-left"]')),
			center: await box(page.locator('[data-slot="detail-shell-center"]')),
			right: await box(page.locator('[data-slot="detail-shell-right"]')),
			contents: await box(page.locator('.toc-column')),
			facts: await box(page.locator('.glance-column')),
		};
		expect(Math.abs(wide.center.width - 768)).toBeLessThanOrEqual(1);
		expect(Math.abs((wide.center.left + wide.center.right) / 2 - viewport / 2)).toBeLessThanOrEqual(1);
		// The panels take the extra width out to the viewport's edges.
		expect(wide.contents.width).toBeGreaterThan(left.width);
		expect(wide.facts.width).toBeGreaterThan(right.width);
		expect(Math.abs(wide.contents.left - wide.left.left)).toBeLessThanOrEqual(1);
		expect(Math.abs(wide.facts.right - wide.right.right)).toBeLessThanOrEqual(1);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});

	test('the article stays at its 46rem measure with its panels at the edges at 1920', async ({ page }) => {
		await open(page, article, 1440);
		const narrow = {
			context: await box(page.locator('.context-column')),
			entry: await box(page.locator('.entry-column')),
		};
		await open(page, article, 1920);
		const viewport = await page.evaluate(() => document.documentElement.clientWidth);
		const center = await box(page.locator('[data-slot="detail-shell-center"]'));
		const left = await box(page.locator('[data-slot="detail-shell-left"]'));
		const right = await box(page.locator('[data-slot="detail-shell-right"]'));
		const context = await box(page.locator('.context-column'));
		const entry = await box(page.locator('.entry-column'));
		expect(Math.abs(center.width - 736)).toBeLessThanOrEqual(1);
		expect(Math.abs((center.left + center.right) / 2 - viewport / 2)).toBeLessThanOrEqual(1);
		expect(context.width).toBeGreaterThan(narrow.context.width);
		expect(entry.width).toBeGreaterThan(narrow.entry.width);
		expect(Math.abs(context.left - left.left)).toBeLessThanOrEqual(1);
		expect(Math.abs(entry.right - right.right)).toBeLessThanOrEqual(1);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	});
});

test.describe('header, counters and dividers', () => {
	test('the case-study header keeps its band and drops the edge readouts and the ruler', async ({ page }) => {
		await open(page, transit, 1440);
		const header = page.getByTestId('project-detail-header');
		await expect(header.locator('.header__edge')).toHaveCount(0);
		const decoration = await header.locator('.header__decoration-layer').innerText();
		expect(decoration).not.toMatch(/PRJ|STATUS|NODES|LAYER|\b480\b/);
		await expect(header.getByTestId('project-header-crosshair')).toBeVisible();
		await expect(header.locator('.header__chevron')).toHaveCount(3);
		await expect(header.getByRole('link', { name: '← All projects' })).toBeVisible();
		await expect(header.getByRole('link', { name: /Live site/ })).toBeVisible();
	});

	test('the article header drops its edge readouts', async ({ page }) => {
		await open(page, article, 1440);
		const header = page.getByTestId('blog-detail-header');
		await expect(header.locator('.header__edge')).toHaveCount(0);
		expect(await header.innerText()).not.toMatch(/VOL\.|ISS\./);
	});

	test('the contents keep their numbers without the SEC counter, and the pill has no n/total', async ({ page }) => {
		await open(page, transit, 1440);
		const contents = page.locator('.toc-column nav');
		await expect(contents).toContainText('01');
		expect(await contents.innerText()).not.toMatch(/SEC\s*\d|\d+\s*\/\s*\d+/);

		await open(page, transit, 390, 844);
		const pill = page.getByTestId('toc-pill').getByRole('button').first();
		await expect(pill).toBeVisible();
		expect(await pill.innerText()).not.toMatch(/\d+\s*\/\s*\d+/);
		expect(await pill.getAttribute('aria-label')).not.toMatch(/\d+\s*\/\s*\d+/);
	});

	for (const [name, path, boundaries] of [['case study', transit, 1], ['article', article, 0]] as const) {
		test(`the ${name} uses the drawn line and draws none before the footer`, async ({ page }) => {
			await open(page, path, 1440);
			await expect(page.getByTestId('detail-header-rule')).toBeVisible();
			await expect(page.getByTestId('detail-header-rule')).toHaveClass(/hand-drawn-line/);
			expect(await visibleHazards(page)).toBe(0);
			const boundary = page.locator('[data-slot="page-section-boundary"]');
			await expect(boundary).toHaveCount(boundaries);
			const geometry = await page.evaluate(() => {
				const sections = [...document.querySelectorAll('[data-slot="page-section"]')];
				const last = sections.at(-1)!.getBoundingClientRect();
				const lines = [...document.querySelectorAll('.hand-drawn-line')].filter(el => el.getClientRects().length > 0);
				return {
					linesBelowLast: lines.filter(el => el.getBoundingClientRect().top >= last.bottom - 1).length,
					lastIsTheEnd: sections.at(-1)!.nextElementSibling === null,
				};
			});
			// The last section closes the page: no divider follows it before the footer's street edge.
			expect(geometry).toEqual({ linesBelowLast: 0, lastIsTheEnd: true });
			if (boundaries) {
				const line = await box(boundary);
				const band = await box(page.getByTestId('project-cta'));
				expect(line.bottom).toBeLessThanOrEqual(band.top + 1);
			}
		});
	}

	test('Café Arona’s code panel uses a solid yellow title rule without tape or ticks', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('sections-choice', 'expanded'));
		await open(page, cafe, 1440);
		const terminal = page.locator('[data-slot="terminal-panel"]').first();
		await terminal.scrollIntoViewIfNeeded();
		await expect(terminal).toHaveClass(/terminal-rule-line/);
		await expect(terminal.locator(':scope > .terminal-rule')).toHaveCount(0);
		await expect(terminal.locator(':scope > .terminal-titlebar')).toHaveCSS('border-bottom-color', await tokenColor(page, 'var(--accent)'));
		expect(await visibleHazards(page)).toBe(0);
	});
});

test.describe('reading details', () => {
	test('impact figures read in the reading ink with sentence-case labels', async ({ page }) => {
		await open(page, transit, 1440);
		const card = page.getByTestId('project-impact-card');
		const value = card.locator('.metric-value').first();
		const label = card.locator('.label-reading').first();
		expect(await value.evaluate(el => getComputedStyle(el).color)).toBe(await tokenColor(page, 'var(--foreground)'));
		await expect(label).toHaveCSS('text-transform', 'none');
		expect(await label.evaluate(el => getComputedStyle(el).fontFamily)).not.toMatch(/mono/i);
	});

	for (const theme of ['dark', 'light'] as const) {
		test(`hover lights edges without a halo in ${theme}`, async ({ page }, testInfo) => {
			test.skip(testInfo.project.name !== 'desktop', 'Hover runs on the desktop pointer project.');
			await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
			await open(page, transit, 1440);
			const heading = page.locator('.sections-column [data-section-index="1"] .section-header');
			const card = page.locator('.sections-column [data-section-index="1"] [data-slot="card"]').first();
			await heading.scrollIntoViewIfNeeded();
			await page.mouse.move(0, 0);
			const restingShadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
			await heading.hover();
			const title = heading.locator('.section-title');
			await expect.poll(() => title.evaluate(el => getComputedStyle(el).color)).toBe(await tokenColor(page, 'var(--primary)'));
			// The card's own static inset edge stays; hover adds no halo or shadow.
			const hoverShadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
			expect(hoverShadow).toBe(restingShadow);
			expect(hoverShadow === 'none' || hoverShadow.includes('inset')).toBe(true);

			const tile = page.getByTestId('project-image-gallery-trigger').filter({ visible: true }).first();
			await tile.scrollIntoViewIfNeeded();
			await page.mouse.move(0, 0);
			const before = await tile.evaluate(el => getComputedStyle(el).borderColor);
			await tile.hover();
			await expect.poll(() => tile.evaluate(el => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -1)');
			expect(await tile.evaluate(el => getComputedStyle(el).borderColor)).not.toBe(before);
			expect(await tile.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');

			const badge = page.getByTestId('work-service-badge').first();
			await badge.scrollIntoViewIfNeeded();
			await badge.hover();
			await expect.poll(() => badge.evaluate(el => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -1)');
			expect(await badge.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none');
		});
	}
});

test.describe('first visit', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	for (const locale of ['en', 'fr', 'es'] as const) {
		test(`“For developers” starts closed with its one-line summary (${locale})`, async ({ page }) => {
			const prefix = locale === 'en' ? '' : `/${locale}`;
			await open(page, `${prefix}${transit}`, 1440);
			const developers = page.locator('.sections-column .section-block').filter({ has: page.locator('.section-title', { hasText: developersTitle[locale] }) });
			const trigger = developers.locator('[data-section-trigger]').first();
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(developers.getByTestId('project-section-summary')).toHaveText(summaries[locale]);
			await expect(page.locator('.sections-column [data-section-index="0"] [data-section-trigger]').first()).toHaveAttribute('aria-expanded', 'true');
			if (locale === 'en') {
				// A contents jump opens it and lands its heading.
				await page.locator('.toc-column nav').getByRole('button', { name: developersTitle.en }).click();
				await expect(trigger).toHaveAttribute('aria-expanded', 'true');
				await expect(developers.getByTestId('project-section-summary')).toBeVisible();
			}
		});
	}

	test('a saved Expand all still wins over the first-visit state', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('sections-choice', 'expanded'));
		await open(page, transit, 1440);
		const developers = page.locator('.sections-column .section-block').filter({ has: page.locator('.section-title', { hasText: developersTitle.en }) });
		await expect(developers.locator('[data-section-trigger]').first()).toHaveAttribute('aria-expanded', 'true');
	});

	for (const path of [transit, `/fr${cafe}`, fixturePostPath('es')]) {
		test(`hydration on ${path} respects CSP`, async ({ page }) => {
			await page.addInitScript(() => {
				const violations: object[] = [];
				Object.assign(window, { cspViolations: violations });
				document.addEventListener('securitypolicyviolation', event => violations.push({
					blocked: event.blockedURI, directive: event.violatedDirective, source: event.sourceFile,
				}));
			});
			await open(page, path, 1440);
			expect(await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content')).not.toContain("'unsafe-eval'");
			await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
			expect(await page.evaluate(() => Reflect.get(window, 'cspViolations'))).toEqual([]);
		});
	}
});

test('the phone contents pill steps aside at the closing band', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await open(page, transit, 390, 844);
	const pill = page.getByTestId('toc-pill');
	await page.locator('.sections-column [data-section-index="2"]').scrollIntoViewIfNeeded();
	await expect(pill).toBeVisible();

	const contact = page.getByTestId('project-cta-band-contact');
	await contact.focus();
	await expect(contact).toBeFocused();
	await expect(pill).toHaveCount(0);
	// Nothing sits over "Get in touch" once it is focused and in view.
	const covered = await contact.evaluate(el => {
		const r = el.getBoundingClientRect();
		const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
		return !(hit && (hit === el || el.contains(hit)));
	});
	expect(covered).toBe(false);

	// It comes back once the reader returns to the story.
	await page.locator('.sections-column [data-section-index="2"]').scrollIntoViewIfNeeded();
	await expect(pill).toBeVisible();
});

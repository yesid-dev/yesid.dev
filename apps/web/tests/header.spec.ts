import { headerLanguageLink, pillControls } from './_support/header-controls';
import { localeCopy } from '../src/lib/locales';
import { expect, test, type Page } from '@playwright/test';

import { menuItems } from '../src/lib/content/nav';
import { menuGroupLabels } from '../src/lib/navigation/menu-groups';

const CLIENT_LOGIN_URL = 'https://login.yesid.dev';
import type { Locale } from '../src/lib/types';
import { DEFAULT_LOCALE, resolveLocale } from '../src/lib/utils/locale';
import { PUBLISHED_LOCALES } from '../src/lib/utils/published-locales';

const chrome = localeCopy;

const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const localized = (href: string, locale: Locale) =>
	locale === DEFAULT_LOCALE ? href : `/${locale}${href === '/' ? '' : href}`;
const start = (locale: Locale) => localized(menuItems[0].href, locale);
const next = (locale: Locale) =>
	PUBLISHED_LOCALES[(PUBLISHED_LOCALES.indexOf(locale) + 1) % PUBLISHED_LOCALES.length];
const samePath = (href: string) => (url: URL) => url.pathname === new URL(href, url).pathname;
const toggle = (page: Page, locale: Locale) =>
	page.getByRole('button', {
		name: new RegExp(
			`^(${literal(chrome[locale].navChrome.shared.openMenuAria)}|${literal(chrome[locale].navChrome.shared.closeMenuAria)})$`,
		),
	});
const menu = (page: Page, locale: Locale) =>
	page.getByRole('navigation', { name: chrome[locale].navChrome.shared.menuOverlayAria });

// SSR shows the toggle before hydration wires it; retry the click until the menu opens.
async function openMenu(page: Page, locale: Locale) {
	await expect(async () => {
		if (!(await menu(page, locale).isVisible())) await toggle(page, locale).click();
		await expect(menu(page, locale)).toBeVisible({ timeout: 1000 });
	}).toPass();
	return menu(page, locale);
}

async function assertSymmetricNavbarPipes(page: Page) {
	const splits = await page.getByTestId('nav-pill').evaluate(pill => {
		const visible = (el: Element) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
		const renderedBox = (el: Element): { left: number; right: number } | undefined => {
			const style = getComputedStyle(el);
			if (style.display === 'none' || style.visibility === 'hidden') return;
			if (style.display !== 'contents') return visible(el) ? el.getBoundingClientRect() : undefined;
			const children = [...el.children].map(renderedBox).filter((r): r is { left: number; right: number } => Boolean(r));
			if (children.length) return { left: Math.min(...children.map(r => r.left)), right: Math.max(...children.map(r => r.right)) };
		};
		const adjacent = (el: Element, direction: 'previousElementSibling' | 'nextElementSibling') => {
			let sibling = el[direction];
			while (sibling && !renderedBox(sibling)) sibling = sibling[direction];
			return sibling ? renderedBox(sibling) : undefined;
		};
		return [...pill.querySelectorAll('span[aria-hidden="true"]')].filter(el => {
			const r = el.getBoundingClientRect();
			return visible(el) && r.width > 0 && r.width <= 2 && r.height > 8;
		}).map(el => {
			const r = el.getBoundingClientRect(), before = adjacent(el, 'previousElementSibling'), after = adjacent(el, 'nextElementSibling');
			return { left: before ? r.left - before.right : null, right: after ? after.left - r.right : null };
		});
	});
	if (page.viewportSize()!.width >= 768) expect(splits.length).toBeGreaterThan(0);
	for (const split of splits) {
		expect(split.left).not.toBeNull();
		expect(split.right).not.toBeNull();
		expect(Math.abs(split.left! - split.right!), 'each navbar pipe has symmetric physical space').toBeLessThanOrEqual(1);
	}
}

for (const locale of PUBLISHED_LOCALES) {
	test(`${locale}: the menu lists every destination, holds focus and gives it back on Escape`, async ({ page }) => {
		await page.goto(start(locale));
		const list = await openMenu(page, locale);

		for (const item of menuItems) {
			await expect(list.getByRole('link').getByText(resolveLocale(item.label, locale), { exact: true })).toBeVisible();
		}
		// The open menu holds destinations only; both controls stay in the pill, once each.
		const { theme, language } = pillControls(page);
		await expect(theme).toBeVisible();
		await expect(language).toBeVisible();
		await expect(page.getByTestId('theme-toggle')).toHaveCount(1);
		await expect(page.getByTestId('language-toggle')).toHaveCount(1);
		await expect(toggle(page, locale)).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);

		await page.keyboard.press('Escape');
		await expect(list).toBeHidden();
		await expect(toggle(page, locale)).toBeFocused();
	});

	test(`${locale}: a menu destination navigates and closes the menu`, async ({ page }) => {
		const target = menuItems.at(-1)!;
		await page.goto(start(locale));
		const list = await openMenu(page, locale);
		await list.getByRole('link').getByText(resolveLocale(target.label, locale), { exact: true }).click();

		await expect(page).toHaveURL(samePath(localized(target.href, locale)));
		await expect(list).toBeHidden();
	});

	test(`${locale}: the language switch goes to the next locale`, async ({ page }) => {
		await page.goto(start(locale));
		await headerLanguageLink(page);
		await page
			.getByRole('link', { name: new RegExp(`^${literal(chrome[locale].navChrome.shared.localeSwitcherAria)}:`) })
			.click();

		await expect(page).toHaveURL(samePath(start(next(locale))));
		await expect(page.locator('html')).toHaveAttribute('lang', next(locale));
	});

	// Links that don't fit move to the menu once the app script measures them, so poll the settled pill.
	test(`${locale}: the header stays inside the viewport`, async ({ page }) => {
		await page.goto(start(locale));
		if (page.viewportSize()!.width < 500) {
			await expect(page.getByTestId('nav-pill').getByRole('link', { name: resolveLocale(menuItems.find(item => item.href === '/contact')!.label, locale), exact: true })).toBeVisible();
		}
		await expect.poll(async () => {
			const pill = (await page.getByTestId('nav-pill').boundingBox())!;
			return pill.x >= 0 && pill.x + pill.width <= page.viewportSize()!.width;
		}).toBe(true);
	});
}

// The theme switch and language signpost stay in the navbar pill at every width (owner, 14 November 2026).
// SiteHeader 0.42 shows priority 2 links from a 500px header until links-fit measures them; with both controls
// in the pill that first row is wider than headers of about 500 to 555px, so that band is left to yesid.design.
const CONTROL_WIDTHS = [320, 360, 375, 390, 414, 480, 600, 768, 1024, 1280, 1440, 1920];
const contactLabel = (locale: Locale) => resolveLocale(menuItems.find((item) => item.href === '/contact')!.label, locale);

async function expectControlsInPill(page: Page, locale: Locale) {
	const shared = chrome[locale].navChrome.shared;
	const { theme, language } = pillControls(page);
	await expect(theme).toBeVisible();
	await expect(language).toBeVisible();
	await expect(theme).toHaveAccessibleName(shared.themeToggleAria);
	await expect(language).toHaveAccessibleName(
		new RegExp(`^${literal(shared.localeSwitcherAria)}: ${literal(shared.languageNames[locale])} [(]`),
	);
	for (const control of [theme, language]) {
		const box = (await control.boundingBox())!;
		expect(box.width).toBeGreaterThanOrEqual(44);
		expect(box.height).toBeGreaterThanOrEqual(44);
	}
	const width = page.viewportSize()!.width;
	const pill = (await page.getByTestId('nav-pill').boundingBox())!;
	expect(pill.x).toBeGreaterThanOrEqual(0);
	expect(pill.x + pill.width).toBeLessThanOrEqual(width);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
	if (width >= 375 && width < 500) {
		await expect(page.getByTestId('nav-pill').getByRole('link', { name: contactLabel(locale), exact: true })).toBeVisible();
	}
}

const controlBoxes = (page: Page) => page.evaluate(() =>
	['theme-toggle', 'language-toggle'].map((id) => {
		const box = document.querySelector(`[data-testid="nav-pill"] [data-testid="${id}"]`)!.getBoundingClientRect();
		return { x: box.x, y: box.y, width: box.width, height: box.height };
	}));

for (const locale of PUBLISHED_LOCALES) {
	test.describe(`${locale}: pill controls`, () => {
		test.skip(({ viewport }) => viewport!.width !== 390 && viewport!.width !== 1440, 'Phone and desktop projects resize through every width');

		test('stay in the pill at every width after hydration', async ({ page }) => {
			for (const width of CONTROL_WIDTHS) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(start(locale));
				await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
				await page.evaluate(() => document.fonts.ready);
				await expectControlsInPill(page, locale);
			}
		});

		test('keep their place through hydration', async ({ page }) => {
			// Hold the app bundles so the server-rendered header can be measured before hydration.
			let release = () => {};
			let bundles = Promise.resolve();
			await page.route('**/_app/immutable/**/*.js', async (route) => {
				await bundles;
				await route.continue();
			});
			try {
				for (const width of CONTROL_WIDTHS) {
					bundles = new Promise<void>((resolve) => { release = resolve; });
					await page.setViewportSize({ width, height: 900 });
					await page.goto(start(locale), { waitUntil: 'commit' });
					await expect(pillControls(page).language).toBeVisible();
					await page.evaluate(() => document.fonts.ready);
					await expect(page.locator('html')).not.toHaveAttribute('data-hydrated');
					const before = await controlBoxes(page);
					release();
					await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
					await page.evaluate(() => document.fonts.ready);
					await expect.poll(async () => {
						const after = await controlBoxes(page);
						return Math.max(...after.flatMap((box, i) => [
							Math.abs(box.x - before[i].x), Math.abs(box.y - before[i].y),
							Math.abs(box.width - before[i].width), Math.abs(box.height - before[i].height),
						]));
					}).toBeLessThanOrEqual(1.5);
				}
			} finally {
				release();
				await page.unrouteAll({ behavior: 'wait' });
			}
		});

		test('are reached by keyboard in pill order', async ({ page }) => {
			for (const width of [320, 390, 768, 1440]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(start(locale));
				await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
				const { theme, language } = pillControls(page);
				const focused = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
				for (let step = 0; step < 20 && (await focused()) !== 'theme-toggle'; step++) await page.keyboard.press('Tab');
				await expect(theme).toBeFocused();
				await page.keyboard.press('Tab');
				await expect(language).toBeFocused();
				await page.keyboard.press('Tab');
				await expect(toggle(page, locale)).toBeFocused();
			}
		});
	});

	test.describe(`${locale}: pill controls without JavaScript`, () => {
		test.use({ javaScriptEnabled: false });
		test.skip(({ viewport }) => viewport!.width !== 390 && viewport!.width !== 1440, 'Phone and desktop projects resize through every width');

		test('stay in the pill at every width', async ({ page }) => {
			for (const width of CONTROL_WIDTHS) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(start(locale));
				await page.evaluate(() => document.fonts.ready);
				await expectControlsInPill(page, locale);
			}
		});
	});
}

// DEV-43: the menu is organised into named groups from the same visible destinations.
for (const locale of PUBLISHED_LOCALES) {
	test(`${locale}: the menu groups every destination once, keeps the current state and its locale href`, async ({ page }) => {
		const labels = menuGroupLabels(locale);
		await page.goto(localized('/projects', locale));
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await assertSymmetricNavbarPipes(page);
		const list = await openMenu(page, locale);

		const headings = list.getByRole('heading', { level: 3 });
		expect(await headings.allTextContents()).toEqual([labels.work, labels.explore, labels.connect]);
		const columns = await list.locator('[data-slot="menu-group"]').evaluateAll(groups =>
			new Set(groups.map(group => Math.round(group.getBoundingClientRect().left))).size);
		if (page.viewportSize()!.width < 768) expect(columns).toBe(1);
		else expect(columns, 'desktop and tablet menus use organized columns').toBeGreaterThan(1);

		const links = await list.locator('a[href]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
		const expected = menuItems.map((item) =>
			item.href === CLIENT_LOGIN_URL
				? `${CLIENT_LOGIN_URL}/?lang=${locale}`
				: localized(item.href, locale),
		);
		expect([...links].sort()).toEqual([...expected].sort());
		expect(new Set(links).size).toBe(links.length);

		const projects = list.locator(`a[href="${localized('/projects', locale)}"]`);
		await expect(projects).toHaveCount(1);
		await expect(projects).toHaveAttribute('aria-current', 'page');
		// Every other destination is not marked current.
		await expect(list.locator('a[aria-current="page"]')).toHaveCount(1);

		// The grouped menu keeps the dialog contract: Escape closes it and restores the trigger.
		await page.keyboard.press('Escape');
		await expect(list).toBeHidden();
		await expect(toggle(page, locale)).toBeFocused();
	});
}

// Kit 3 forwards native events for direct links, but has no accepted-start subscription.
test('an open menu survives direct language links and Escape restores the trigger', async ({ page }) => {
	await page.goto('/services');
	await openMenu(page, 'en');
	await page.getByTestId('language-toggle').click();
	await expect(page).toHaveURL(samePath('/fr/services'));
	await expect(menu(page, 'fr')).toBeVisible();
	await expect(page.getByTestId('language-toggle')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(menu(page, 'fr')).toBeHidden();
	await expect(toggle(page, 'fr')).toBeFocused();
});

test('a language link landing on a router redirect closes the menu with the Kit 3 fallback', async ({ page }) => {
	// Emulate an editorial redirect in Kit's data response, preserving a real native click and router hooks.
	await page.route('**/fr/services/__data.json*', route => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ type: 'redirect', location: '/fr/projects' }),
	}));
	await page.goto('/services');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await openMenu(page, 'en');
	await page.getByTestId('language-toggle').click();
	await expect(page).toHaveURL(samePath('/fr/projects'));
	await expect(menu(page, 'fr')).toBeHidden();
	await expect(page.locator('[data-testid="language-toggle"]:focus')).toHaveCount(0);
});

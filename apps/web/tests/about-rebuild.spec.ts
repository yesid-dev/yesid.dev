// The About page rebuilt from the reviewed preview D-M6 (DEV-42): the same bento with the AI slop
// taken out. These checks cover what the rebuild changed or must keep working.
import { test, expect, type Page } from '@playwright/test';
import { aboutPageContent } from '../src/lib/content/about-page';
import { siteLabels } from '../src/lib/content/site-labels';
import { resolveLocale } from '../src/lib/utils/locale';
import { sentenceCase } from '../src/lib/components/about/about-copy';

const LOCALES = ['en', 'fr', 'es'] as const;
type Locale = (typeof LOCALES)[number];
const aboutPath = (locale: Locale) => (locale === 'en' ? '/about' : `/${locale}/about`);
const WEATHER = { en: 'Weather', fr: 'Météo', es: 'Clima' } as const;
const QUOTE = { en: (i: number, n: number) => `Quote ${i} of ${n}`, fr: (i: number, n: number) => `Citation ${i} sur ${n}`, es: (i: number, n: number) => `Cita ${i} de ${n}` } as const;

test.beforeEach(async ({ page }) => {
	await page.route(/web3forms|plausible|cal\.com|\/api\/event/, (route) => route.abort());
	await page.route('**/api/weather*', (route) => route.fulfill({ json: { temp: 3, condition: 'Clouds', icon: '04n' } }));
});

async function open(page: Page, locale: Locale) {
	await page.goto(aboutPath(locale));
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(() => document.fonts.ready);
}

const runningWeather = (page: Page) =>
	page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && /weather-/.test((a as CSSAnimation).animationName)).length);

test('the page is one section without extra rulers or stop labels', async ({ page }) => {
	await open(page, 'en');
	const about = page.getByTestId('page-about');
	await expect(about).toHaveAttribute('data-slot', 'page-section');
	await expect(page.locator('main [data-slot="page-section-boundary"]')).toHaveCount(0);
	// Ordinary content uses drawn strokes; the terminal keeps only its yellow border.
	const rules = page.locator('main [data-slot="separator"]');
	await expect(rules).toHaveCount(aboutPageContent.methodology.length + 1);
	for (const rule of await rules.all()) await expect(rule).toHaveAttribute('data-variant', 'hand-drawn');
	await expect(page.locator('[data-testid="about-cta"] [data-slot="separator"]')).toHaveCount(0);
	await expect(page.locator('main [data-slot="terminal-panel"]')).toHaveClass(/terminal-rule-line/);
	await expect(page.locator('main [data-slot="stop-label"]')).toHaveCount(0);
	await expect(page.locator('main')).not.toContainText(/\bSTOP\s+\d/);
	// The h1 reads in sentence case in the reading ink.
	const h1 = page.locator('h1');
	await expect(h1).toHaveText(resolveLocale(aboutPageContent.identity.title, 'en'));
	expect(await h1.evaluate((el) => getComputedStyle(el).textTransform)).toBe('none');
	await expect(page.locator('[data-slot="footer-hazard-edge"]')).toHaveCount(1);
});

for (const locale of LOCALES)
	test(`weather card: heading, pause and play (${locale})`, async ({ page }) => {
		test.skip(test.info().project.name !== 'desktop', 'One run covers the card.');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await open(page, locale);
		const weather = page.getByTestId('about-weather');
		await expect(weather.getByRole('heading', { level: 2 })).toHaveText(WEATHER[locale]);
		await expect(weather).toHaveAttribute('data-register', 'expressive');
		const pause = weather.getByRole('button', { name: resolveLocale(siteLabels.a11y.animationPause, locale), exact: true });
		await expect(pause).toBeVisible();
		await expect.poll(() => runningWeather(page)).toBeGreaterThan(0);
		await pause.click();
		await expect.poll(() => runningWeather(page)).toBe(0);
		const play = weather.getByRole('button', { name: resolveLocale(siteLabels.a11y.animationPlay, locale), exact: true });
		await expect(play).toBeFocused();
		await play.click();
		await expect.poll(() => runningWeather(page)).toBeGreaterThan(0);
	});

test('weather card under reduced motion: still scene, no pause control', { tag: '@motion' }, async ({ page }) => {
	await open(page, 'en');
	const weather = page.getByTestId('about-weather');
	await expect(weather.locator('.weather-skyline')).toBeVisible();
	await expect(weather.getByRole('button', { name: resolveLocale(siteLabels.a11y.animationPause, 'en'), exact: true })).toBeHidden();
	await expect.poll(() => runningWeather(page)).toBe(0);
	// The train snaps to the rocket instead of morphing.
	const train = page.getByTestId('about-train-button');
	await train.click();
	await expect(train).toHaveAttribute('aria-pressed', 'true');
	const shape = () => train.locator('svg path').first().getAttribute('d');
	const first = await shape();
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
	expect(await shape(), 'no tween runs under reduced motion').toBe(first);
});

for (const locale of LOCALES)
	test(`interests: the heading sits on the photos, Transit first, one choice at a time (${locale})`, async ({ page }) => {
		test.skip(test.info().project.name === 'tablet', 'Phone and desktop cover both layouts.');
		await open(page, locale);
		const card = page.getByTestId('about-interests');
		await card.scrollIntoViewIfNeeded();
		const heading = card.getByRole('heading', { level: 2 });
		await expect(heading).toHaveText(sentenceCase(resolveLocale(aboutPageContent.stopLabels.interests, locale), locale));
		await expect(card.locator('[data-slot="stop-label"]')).toHaveCount(0);
		const strips = card.locator('button[aria-pressed]');
		const geometry = await card.evaluate((node) => {
			const box = node.getBoundingClientRect();
			const heading = node.querySelector('h2')!.getBoundingClientRect();
			const strip = node.querySelector('button[aria-pressed]')!.getBoundingClientRect();
			const labels = [...node.querySelectorAll('.strip-label')].map((label) => label.getBoundingClientRect().toJSON());
			return { box: box.toJSON(), heading: heading.toJSON(), strip: strip.toJSON(), labels };
		});
		// The photos fill the card: no padded band was taken from them for the heading.
		expect(geometry.strip.top - geometry.box.top, 'the photo stack starts at the card edge').toBeLessThanOrEqual(3);
		// The heading returns inside the imagery it belongs to, and stays inside the card.
		expect(geometry.heading.top).toBeGreaterThanOrEqual(geometry.box.top);
		expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.box.left);
		expect(geometry.heading.right).toBeLessThanOrEqual(geometry.box.right);
		expect(geometry.heading.bottom, 'the heading overlaps the photo area').toBeGreaterThan(geometry.strip.top);
		expect(geometry.heading.bottom, 'the heading stays in the card').toBeLessThanOrEqual(geometry.box.bottom);
		// No photo label ever cuts the heading, and the heading is painted above the strips.
		for (const label of geometry.labels) {
			const overlaps = geometry.heading.left < label.right && geometry.heading.right > label.left && geometry.heading.top < label.bottom && geometry.heading.bottom > label.top;
			expect(overlaps, 'a photo label never sits on the heading').toBe(false);
		}
		const paintedOnTop = await heading.evaluate((node) => {
			const box = node.getBoundingClientRect();
			const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
			return hit === node || node.contains(hit);
		});
		expect(paintedOnTop, 'the heading paints above the photos').toBe(true);
		const ids = aboutPageContent.interests.map((interest) => interest.id);
		await expect(strips.nth(ids.indexOf('transit'))).toHaveAttribute('aria-pressed', 'true');
		await expect(card.getByRole('button', { pressed: true })).toHaveCount(1);
		const food = ids.indexOf('food');
		await strips.nth(food).focus();
		await page.keyboard.press('Enter');
		await expect(strips.nth(food)).toHaveAttribute('aria-pressed', 'true');
		await expect(card.getByRole('button', { pressed: true })).toHaveCount(1);
		await expect(card.getByTestId('interest-credit-trigger')).toHaveCount(0);
		await strips.nth(ids.indexOf('space')).click();
		await expect(card.getByTestId('interest-credit-trigger')).toHaveCount(1);
	});

for (const locale of LOCALES)
	test(`languages: the heading sits on the flags, readable names (${locale})`, async ({ page }) => {
		await open(page, locale);
		const card = page.getByTestId('about-languages');
		await card.scrollIntoViewIfNeeded();
		await expect(card.locator('[data-slot="stop-label"]')).toHaveCount(0);
		const heading = card.getByRole('heading', { level: 2 });
		await expect(heading).toHaveText(sentenceCase(resolveLocale(aboutPageContent.stopLabels.clients, locale), locale));
		const flags = card.getByTestId('about-language-flag');
		const geometry = await card.evaluate((node) => {
			const box = node.getBoundingClientRect();
			const heading = node.querySelector('h2')!.getBoundingClientRect();
			const flag = node.querySelector('[data-testid="about-language-flag"]')!.getBoundingClientRect();
			const labels = [...node.querySelectorAll('.flag-label')].map((label) => label.getBoundingClientRect().toJSON());
			return { box: box.toJSON(), heading: heading.toJSON(), flag: flag.toJSON(), labels };
		});
		// The flags fill the card again; the heading sits over the first one, inside the card.
		expect(geometry.flag.top - geometry.box.top, 'the flags start at the card edge').toBeLessThanOrEqual(3);
		expect(geometry.heading.top).toBeGreaterThanOrEqual(geometry.box.top);
		expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.box.left);
		expect(geometry.heading.right).toBeLessThanOrEqual(geometry.box.right);
		expect(geometry.heading.bottom, 'the heading overlaps the flag area').toBeGreaterThan(geometry.flag.top);
		expect(geometry.heading.bottom, 'the heading stays in the card').toBeLessThanOrEqual(geometry.box.bottom);
		for (const label of geometry.labels) {
			const overlaps = geometry.heading.left < label.right && geometry.heading.right > label.left && geometry.heading.top < label.bottom && geometry.heading.bottom > label.top;
			expect(overlaps, 'a flag name never sits on the heading').toBe(false);
		}
		const paintedOnTop = await heading.evaluate((node) => {
			const box = node.getBoundingClientRect();
			const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
			return hit === node || node.contains(hit);
		});
		expect(paintedOnTop, 'the heading paints above the flags').toBe(true);
		for (const size of await card.locator('.flag-label').evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)))) {
			expect(size, 'flag names stay at 13px').toBeGreaterThanOrEqual(13);
		}
		await flags.nth(1).click();
		await expect(flags.nth(1)).toHaveAttribute('aria-pressed', 'true');
	});

for (const locale of LOCALES)
	test(`quote dots are named by their place (${locale})`, async ({ page }) => {
		test.skip(test.info().project.name !== 'desktop', 'One run covers the control.');
		await open(page, locale);
		const card = page.getByTestId('about-testimonials');
		const total = aboutPageContent.testimonials.length;
		const dots = card.getByTestId('about-quote-dot');
		await expect(card.getByRole('tab')).toHaveCount(0);
		for (let i = 1; i <= total; i++) await expect(card.getByRole('button', { name: QUOTE[locale](i, total), exact: true })).toHaveCount(1);
		await expect(dots.first()).toHaveAttribute('aria-current', 'true');
		await card.getByRole('button', { name: resolveLocale(aboutPageContent.labels.testimonialsNextAria, locale), exact: true }).click();
		await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
		await expect(dots.first()).not.toHaveAttribute('aria-current');
		const author = card.getByTestId('about-quote-author').nth(1);
		await expect(author).toHaveText(aboutPageContent.testimonials[1].author);
		const ink = await author.evaluate((el) => ({ family: getComputedStyle(el).fontFamily, color: getComputedStyle(el).color, accent: (() => { const p = document.createElement('span'); p.style.color = 'var(--accent-text)'; el.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })() }));
		expect(ink.family, 'the author is not in mono').not.toMatch(/mono/i);
		expect(ink.color, 'the author is not yellow').not.toBe(ink.accent);
	});

test('no word breaks inside itself between 500 and 1023px', async ({ page }) => {
	test.skip(test.info().project.name !== 'tablet', 'One sweep covers the tablet range.');
	const selectors = '[data-slot="card-heading"], .belief-title, .belief-text, .school, .program, [data-testid="about-metrics"] li, .flag-label, .strip-label, [data-testid="about-contact-lines"] li';
	const failures: string[] = [];
	for (const locale of LOCALES) {
		await open(page, locale);
		for (const width of [500, 560, 640, 700, 768, 820, 900, 960, 1023]) {
			await page.setViewportSize({ width, height: 1024 });
			const split = await page.getByTestId('page-about').evaluate((root, selector) => {
				const out: string[] = [];
				for (const element of root.querySelectorAll(selector)) {
					const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
					while (walker.nextNode()) {
						const node = walker.currentNode;
						if ((node.parentElement as HTMLElement).closest('.sr-only')) continue;
						for (const match of (node.textContent ?? '').matchAll(/[\p{L}\p{N}'’]+/gu)) {
							const range = document.createRange();
							range.setStart(node, match.index!);
							range.setEnd(node, match.index! + match[0].length);
							const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
							if (lines.size > 1) out.push(match[0]);
						}
					}
				}
				return out;
			}, selectors);
			if (split.length) failures.push(`${locale} ${width}px: ${split.join(', ')}`);
		}
	}
	expect(failures).toEqual([]);
});

for (const locale of LOCALES)
	 test(`get in touch: real links, no console costume (${locale})`, { tag: '@theme' }, async ({ page }) => {
		await open(page, locale);
		const card = page.getByTestId('about-cta');
		await card.scrollIntoViewIfNeeded();
		await expect(card.getByRole('heading', { level: 2 })).toHaveText({ en: 'Get in touch', fr: 'Me joindre', es: 'Ponte en contacto' }[locale]);
		const links = card.getByTestId('about-contact-link');
		await expect(links).toHaveCount(3);
		expect(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))).toEqual([
			'mailto:contact@yesid.dev',
			'https://github.com/mgkdante',
			'https://www.linkedin.com/in/otaloray/',
		]);
		for (const index of [1, 2]) await expect(links.nth(index)).toHaveAttribute('target', '_blank');
		await expect(card).not.toContainText('$ yesid --contact');
		await expect(card).not.toContainText(/AI-accelerated|assisté par l'IA|Con ayuda de IA/);
		expect(await card.locator('.terminal-body').innerText()).not.toMatch(/^\s*[>~]/m);
		for (const box of await links.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()))) {
			expect(box.height, 'each link keeps a 44px target').toBeGreaterThanOrEqual(44);
		}
		for (const link of await links.all()) {
			await link.scrollIntoViewIfNeeded();
			const target = await link.evaluate((el) => {
				const box = el.getBoundingClientRect();
				const style = getComputedStyle(el);
				const ownsTarget = [0.05, 0.5, 0.95].every((fraction) =>
					document.elementFromPoint(box.x + box.width / 2, box.y + box.height * fraction)?.closest('a') === el
				);
				const probe = document.createElement('span');
				probe.style.color = 'var(--primary)';
				el.append(probe);
				const orange = getComputedStyle(probe).color;
				probe.remove();
				return { ownsTarget, color: style.color, decoration: style.textDecorationLine, orange };
			});
			expect(target.ownsTarget, 'each 44px target belongs to its own link').toBe(true);
			expect(target.color, 'contact links use the kit orange ink').toBe(target.orange);
			expect(target.decoration, 'contact links retain the kit underline').toContain('underline');
		}
		expect(await card.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
		await expect(card.getByTestId('about-cta-button')).toHaveAttribute('href', locale === 'en' ? '/contact' : `/${locale}/contact`);
	});

test('hover: static cards stay still, the card with links lifts 1px and lights its edge, no glow @theme', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await open(page, 'en');
	const look = (testId: string) =>
		page.getByTestId(testId).evaluate((el) => {
			const style = getComputedStyle(el);
			return { border: style.borderTopColor, transform: style.transform, shadow: style.boxShadow };
		});
	for (const testId of ['about-identity', 'about-metrics', 'about-testimonials', 'about-method', 'about-education', 'about-languages', 'about-interests', 'about-polaroids', 'about-weather', 'about-train']) {
		const card = page.getByTestId(testId);
		await card.scrollIntoViewIfNeeded();
		const before = await look(testId);
		const box = (await card.boundingBox())!;
		await page.mouse.move(box.x + 4, box.y + 4);
		await page.waitForTimeout(400);
		expect(await look(testId), `${testId} stays still on hover`).toEqual(before);
		await page.mouse.move(0, 0);
	}
	const cta = page.getByTestId('about-cta');
	await cta.scrollIntoViewIfNeeded();
	const rest = await look('about-cta');
	await cta.hover({ position: { x: 8, y: 8 } });
	await expect.poll(() => look('about-cta').then((value) => value.transform)).toBe('matrix(1, 0, 0, 1, 0, -1)');
	const hovered = await look('about-cta');
	expect(hovered.border, 'the edge lights up').not.toBe(rest.border);
	expect(hovered.shadow, 'no glow or shadow is added').toBe(rest.shadow);
	// No glow anywhere: the train has no drop shadow and no cursor glow layer follows the pointer.
	expect(await page.getByTestId('about-train-button').locator('svg').evaluate((el) => getComputedStyle(el).filter)).toBe('none');
	expect(await page.getByTestId('page-about').evaluate((root) => [...root.querySelectorAll('*')].filter((el) => /radial-gradient/.test(getComputedStyle(el).backgroundImage) && !el.closest('[data-testid="about-weather"]')).length)).toBe(0);
});

test('hydration respects CSP on every About language', async ({ page }) => {
	test.skip(test.info().project.name !== 'desktop', 'One run covers the policy.');
	await page.addInitScript(() => {
		const violations: object[] = [];
		Object.assign(window, { cspViolations: violations });
		document.addEventListener('securitypolicyviolation', (event) => violations.push({ blocked: event.blockedURI, directive: event.violatedDirective }));
	});
	for (const locale of LOCALES) {
		await open(page, locale);
		await page.getByTestId('about-cta').scrollIntoViewIfNeeded();
		await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
		expect(await page.evaluate(() => Reflect.get(window, 'cspViolations')), locale).toEqual([]);
	}
});

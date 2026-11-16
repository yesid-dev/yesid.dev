// The home's About block (owner live QA, DEV-43): it renders the same four shared About cards as
// /about, with the same headings, no STOP badges and no glow, so both surfaces look alike.
import { test, expect } from '@playwright/test';
import { aboutPageContent } from '../src/lib/content/about-page';
import { sentenceCase } from '../src/lib/components/about/about-copy';
import { resolveLocale } from '../src/lib/utils/locale';

const locales = ['en', 'fr', 'es'] as const;

for (const locale of locales) {
	test(`${locale}: the home About block reuses About's cards, headings and behaviour`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.route(/web3forms|plausible|cal\.com|\/api\/event/, route => route.abort());
		await page.goto(locale === 'en' ? '/' : `/${locale}`);
		const teaser = page.getByTestId('home-about-teaser');
		await teaser.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);

		// One card set, no legacy STOP numbers, lamps or glow.
		await expect(teaser.locator('[data-slot="stop-label"]')).toHaveCount(0);
		await expect(teaser).not.toContainText(/\b(STOP|ARRÊT|PARADA)\s*\d/);
		for (const id of ['about-languages', 'about-education', 'about-weather', 'about-interests']) {
			await expect(teaser.getByTestId(id), `${id} renders once on home and about`).toHaveCount(1);
		}

		// Every card leads with the same sentence-case heading About computes.
		const headings = await teaser.locator('[data-slot="card-heading"]').allTextContents();
		expect(headings).toEqual([
			sentenceCase(resolveLocale(aboutPageContent.stopLabels.clients, locale), locale),
			sentenceCase(resolveLocale(aboutPageContent.stopLabels.stack, locale), locale),
			sentenceCase(resolveLocale(aboutPageContent.cardHeadings.weather, locale), locale),
			sentenceCase(resolveLocale(aboutPageContent.stopLabels.interests, locale), locale),
		]);

		// Home keeps the media-integrated heading composition: the photos and flags start at the
		// card edge and the heading sits on them, inside the card.
		for (const id of ['about-languages', 'about-interests']) {
			const card = teaser.getByTestId(id);
			const geometry = await card.evaluate((node) => {
				const box = node.getBoundingClientRect();
				const heading = node.querySelector('h2')!.getBoundingClientRect();
				const image = (node.querySelector('[data-testid="about-language-flag"]') ?? node.querySelector('button[aria-pressed]'))!.getBoundingClientRect();
				return { box: box.toJSON(), heading: heading.toJSON(), image: image.toJSON() };
			});
			expect(geometry.image.top - geometry.box.top, `${id}: the imagery keeps the card's top`).toBeLessThanOrEqual(3);
			expect(geometry.heading.top).toBeGreaterThanOrEqual(geometry.box.top);
			expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.box.left);
			expect(geometry.heading.right).toBeLessThanOrEqual(geometry.box.right);
			expect(geometry.heading.bottom, `${id}: the heading stays inside the card`).toBeLessThanOrEqual(geometry.box.bottom);
			expect(geometry.heading.bottom, `${id}: the heading sits on the imagery`).toBeGreaterThan(geometry.image.top);
		}

		// Weather stays empty on the home (`weather={null}`) and reads its own heading.
		const weather = teaser.getByTestId('about-weather');
		await expect(weather.getByRole('heading', { level: 2 })).toHaveText(sentenceCase(resolveLocale(aboutPageContent.cardHeadings.weather, locale), locale));
		await expect(weather).not.toContainText('°C');

		// The biography and the more link stay as they are.
		await expect(teaser.getByTestId('home-about-more')).toHaveAttribute('href', locale === 'en' ? '/about' : `/${locale}/about`);
	});
}

test('the home About block keeps the biography above its four cards on phones', async ({ page }) => {
	test.skip(page.viewportSize()!.width >= 640, 'Phone stacking.');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	const teaser = page.getByTestId('home-about-teaser');
	await teaser.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	const order = await teaser.evaluate((node) => {
		const rect = (selector: string) => node.querySelector(selector)!.getBoundingClientRect();
		return {
			bio: rect('.teaser-bio').bottom,
			languages: rect('[data-testid="about-languages"]').top,
			cells: [...node.querySelectorAll('.badge-cell')].map((cell) => cell.getBoundingClientRect().top),
		};
	});
	expect(order.bio).toBeLessThanOrEqual(order.languages);
	expect(order.cells).toEqual([...order.cells].sort((a, b) => a - b));
});

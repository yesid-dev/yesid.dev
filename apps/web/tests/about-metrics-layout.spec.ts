// The Fun Facts card (owner live QA, DEV-43): one square two-by-two panel on phones and desktops,
// with each value and its words gathering toward the panel's central intersection.
import { expect, test, type Page } from '@playwright/test';
import { aboutPageContent } from '../src/lib/content/about-page';
import { resolveLocale } from '../src/lib/utils/locale';
import { sentenceCase } from '../src/lib/components/about/about-copy';

const locales = ['en', 'fr', 'es'] as const;
const widths = [320, 390, 499, 500, 639, 640, 767, 768, 1023, 1024, 1280, 1440, 1920];

async function openAbout(page: Page, locale: string) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(locale === 'en' ? '/about' : `/${locale}/about`);
	await expect(page.getByTestId('about-metrics').getByRole('heading', { level: 2 })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
}

async function geometry(page: Page) {
	return page.getByTestId('about-metrics').evaluate((card) => {
		const rect = (element: Element) => {
			const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
			return { left, right, top, bottom, width, height };
		};
		const text = (element: Element) => {
			const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
			const words = [];
			const lines = [];
			while (walker.nextNode()) {
				const node = walker.currentNode;
				for (const match of node.textContent!.matchAll(/\S+/gu)) {
					const range = document.createRange();
					range.setStart(node, match.index!);
					range.setEnd(node, match.index! + match[0].length);
					words.push({ word: match[0], rects: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })) });
				}
				const range = document.createRange();
				range.selectNodeContents(node);
				lines.push(...[...range.getClientRects()].filter(rect => rect.width > 0).map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })));
			}
			return { ...rect(element), align: getComputedStyle(element).textAlign, fontSize: parseFloat(getComputedStyle(element).fontSize), words, lines };
		};
		const panel = card.querySelector<HTMLElement>('[data-testid="about-metrics-square"]')!;
		const facts = [...card.querySelectorAll('li')];
		return {
			card: rect(card),
			cell: rect(card.closest('.area-metrics')!),
			panel: rect(panel),
			panelStyle: {
				borderTopWidth: parseFloat(getComputedStyle(panel).borderTopWidth),
				borderTopColor: getComputedStyle(panel).borderTopColor,
			},
			contentScroll: {
				x: panel.scrollWidth - panel.clientWidth,
				y: panel.scrollHeight - panel.clientHeight,
			},
			heading: rect(card.querySelector('h2')!),
			headingText: card.querySelector('h2')!.textContent?.trim() ?? '',
			facts: facts.map((fact) => {
				const figure = fact.querySelector('b')!;
				return {
					...text(fact),
					color: getComputedStyle(fact).color,
					figure: { text: figure.textContent, weight: Number(getComputedStyle(figure).fontWeight), color: getComputedStyle(figure).color },
				};
			}),
			ink: Object.fromEntries((['foreground', 'accent-text'] as const).map((token) => {
				const probe = document.createElement('span');
				probe.style.color = `var(--${token})`;
				card.append(probe);
				const color = getComputedStyle(probe).color;
				probe.remove();
				return [token, color];
			})),
		};
	});
}

async function expectLayout(page: Page, locale: string) {
	const state = await geometry(page);
	const { card, panel, facts } = state;
	expect(facts).toHaveLength(4);
	expect(facts.map((fact) => fact.figure.text), 'the four facts keep their order and values').toEqual(
		aboutPageContent.metrics.map((metric) => metric.value),
	);

	// The panel is the facts' visible surface, and it is actually square at every width.
	expect(Math.abs(panel.width - panel.height), `${panel.width}x${panel.height} panel is square`).toBeLessThanOrEqual(1);
	expect(panel.width, 'the square panel is large enough to read').toBeGreaterThan(140);
	expect(state.panelStyle.borderTopWidth).toBeGreaterThanOrEqual(1);
	expect(state.panelStyle.borderTopColor, 'the square panel has a visible edge').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
	// Fits inside the card it was given, centred, never exceeding the card's inner box.
	expect(panel.left).toBeGreaterThanOrEqual(card.left);
	expect(panel.right).toBeLessThanOrEqual(card.right + 0.5);
	expect(Math.abs((panel.left - card.left) - (card.right - panel.right)), 'the square is centred in its card').toBeLessThanOrEqual(1);
	expect(state.contentScroll.x, 'the facts never overflow the square horizontally').toBeLessThanOrEqual(1);
	expect(state.contentScroll.y, 'the facts never overflow the square vertically').toBeLessThanOrEqual(1);

	// The heading stays at the card top, clear of the square.
	expect(state.heading.bottom).toBeLessThanOrEqual(panel.top + 0.5);
	expect(state.headingText).not.toBe('');

	// Every cluster gathers to the corner nearest the central intersection, with a gap between.
	const centreX = panel.left + panel.width / 2;
	const centreY = panel.top + panel.height / 2;
	for (const i of [0, 2]) {
		expect(facts[i].right, 'left-hand facts sit against the centre column').toBeLessThanOrEqual(centreX - 1);
		expect(facts[i].right, 'left-hand facts reach the centre column').toBeGreaterThan(centreX - 40);
		expect(['right', 'end']).toContain(facts[i].align);
	}
	for (const i of [1, 3]) {
		expect(facts[i].left, 'right-hand facts sit against the centre column').toBeGreaterThanOrEqual(centreX + 1);
		expect(facts[i].left, 'right-hand facts reach the centre column').toBeLessThan(centreX + 40);
		expect(['left', 'start']).toContain(facts[i].align);
	}
	for (const i of [0, 1]) {
		expect(facts[i].bottom, 'upper facts sit against the centre row').toBeLessThanOrEqual(centreY - 1);
		expect(facts[i].bottom, 'upper facts reach the centre row').toBeGreaterThan(centreY - 40);
	}
	for (const i of [2, 3]) {
		expect(facts[i].top, 'lower facts sit against the centre row').toBeGreaterThanOrEqual(centreY + 1);
		expect(facts[i].top, 'lower facts reach the centre row').toBeLessThan(centreY + 40);
	}

	for (const fact of facts) {
		expect(fact.fontSize, 'facts read at body size').toBeGreaterThanOrEqual(16);
		expect(fact.figure.weight).toBeGreaterThanOrEqual(700);
		expect(fact.figure.color, 'the figure reads in reading ink').toBe(state.ink.foreground);
		expect(fact.figure.color, 'the figure is not yellow').not.toBe(state.ink['accent-text']);
		expect(fact.color, 'the sentence is not yellow').not.toBe(state.ink['accent-text']);
		for (const line of fact.lines) {
			expect(line.left).toBeGreaterThanOrEqual(panel.left);
			expect(line.right).toBeLessThanOrEqual(panel.right);
			expect(line.top).toBeGreaterThanOrEqual(panel.top);
			expect(line.bottom).toBeLessThanOrEqual(panel.bottom);
		}
		for (const word of fact.words) expect(word.rects, `word stays whole: ${word.word}`).toHaveLength(1);
	}
	return state;
}

for (const locale of locales) {
	test(`${locale} facts keep one square two-by-two panel at phone, tablet and desktop widths`, async ({ page }, testInfo) => {
		// Each project owns its range, avoiding triplicated boundary sweeps in CI.
		const projectWidths = widths.filter(width => testInfo.project.name === 'phone' ? width < 640 : testInfo.project.name === 'tablet' ? width >= 640 && width < 1024 : width >= 1024);
		await openAbout(page, locale);
		const measurements = [];
		for (const width of projectWidths) {
			await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
			measurements.push({ width, ...await expectLayout(page, locale) });
		}
		await testInfo.attach(`${locale}-geometry.json`, { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
	});

	test(`${locale} facts read as sentences in both themes @theme`, async ({ page }, testInfo) => {
		await openAbout(page, locale);
		await expect(page.getByTestId('about-metrics').getByRole('heading', { level: 2 })).toHaveText(
			sentenceCase(resolveLocale(aboutPageContent.stopLabels.metrics, locale), locale),
		);
		for (const [name, width, height] of [['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900], ['short-desktop', 1280, 640]] as const) {
			await page.setViewportSize({ width, height });
			await expectLayout(page, locale);
			await page.getByTestId('about-metrics').screenshot({ path: testInfo.outputPath(`${locale}-${name}-${testInfo.project.name}-block.png`) });
			if (['phone', 'tablet', 'desktop'].includes(name)) await page.screenshot({ path: testInfo.outputPath(`${locale}-${name}-${testInfo.project.name}-about.png`), fullPage: true });
		}
	});
}

import { expect, test, type Page } from '@playwright/test';

const locales = ['en', 'fr', 'es'] as const;
const widths = [320, 390, 499, 500, 639, 640, 767, 768, 1023, 1024, 1280, 1440, 1789, 1790, 1795, 1796, 1797, 1800, 1920];

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
		const facts = [...card.querySelectorAll('li')];
		return {
			card: rect(card), cell: rect(card.closest('.area-metrics')!),
			content: rect(card.querySelector('h2')!.parentElement!),
			heading: rect(card.querySelector('h2')!),
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

async function expectLayout(page: Page, width: number) {
	const state = await geometry(page);
	const { card, facts } = state;
	expect(facts).toHaveLength(4);
	// Four in a row needs 560px of content; phones always use the corners.
	const fourColumns = width >= 640 && state.content.width >= 560;
	// Pin the mode to the spec's ranges for the current About grid so a grid change cannot shift them silently.
	const specFourColumns = (width >= 640 && width <= 767) || width >= 1796;
	expect(fourColumns, `${width}px uses ${specFourColumns ? 'four columns' : 'two-by-two corners'}`).toBe(specFourColumns);
	if (fourColumns) {
		for (let i = 1; i < facts.length; i++) expect(facts[i].left).toBeGreaterThan(facts[i - 1].right);
	} else {
		for (const i of [0, 2]) {
			expect(facts[i].left).toBeLessThan(card.left + card.width / 2);
			expect(facts[i + 1].left).toBeGreaterThan(card.left + card.width / 2);
		}
		expect(facts[2].top).toBeGreaterThan(Math.max(facts[0].bottom, facts[1].bottom));
		expect(facts[2].left).toBeCloseTo(facts[0].left, 0);
		expect(facts[3].left).toBeCloseTo(facts[1].left, 0);
	}
	expect(Math.abs(card.height - state.cell.height), 'card stretches with its grid row').toBeLessThanOrEqual(1);
	for (const fact of facts) {
		// D-M6: a short sentence in reading ink with its figure in bold; no yellow metric figure.
		expect(fact.fontSize, 'facts read at body size').toBeGreaterThanOrEqual(16);
		expect(fact.figure.weight).toBeGreaterThanOrEqual(700);
		expect(fact.figure.color, 'the figure reads in reading ink').toBe(state.ink.foreground);
		expect(fact.figure.color, 'the figure is not yellow').not.toBe(state.ink['accent-text']);
		expect(fact.color, 'the sentence is not yellow').not.toBe(state.ink['accent-text']);
		expect(['left', 'start']).toContain(fact.align);
		for (const line of fact.lines) {
			expect(line.left).toBeGreaterThanOrEqual(card.left);
			expect(line.right).toBeLessThanOrEqual(card.right);
			expect(line.top).toBeGreaterThanOrEqual(card.top);
			expect(line.bottom).toBeLessThanOrEqual(card.bottom);
		}
		for (const word of fact.words) expect(word.rects, `word stays whole: ${word.word}`).toHaveLength(1);
	}
	return state;
}

for (const locale of locales) {
	test(`${locale} About facts align at phone, tablet, desktop and layout boundaries`, async ({ page }, testInfo) => {
		// Each project owns its range, avoiding triplicated boundary sweeps in CI.
		const projectWidths = widths.filter(width => testInfo.project.name === 'phone' ? width < 640 : testInfo.project.name === 'tablet' ? width >= 640 && width < 1024 : width >= 1024);
		await openAbout(page, locale);
		const measurements = [];
		for (const width of projectWidths) {
			await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
			measurements.push({ width, ...await expectLayout(page, width) });
		}
		await testInfo.attach(`${locale}-geometry.json`, { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
	});

	test(`${locale} About facts read as sentences in both themes @theme`, async ({ page }, testInfo) => {
		await openAbout(page, locale);
		for (const [name, width, height] of [['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900], ['four-columns-min', 640, 900], ['desktop-four-columns-min', 1796, 900]] as const) {
			await page.setViewportSize({ width, height });
			await expectLayout(page, width);
			await page.getByTestId('about-metrics').screenshot({ path: testInfo.outputPath(`${locale}-${name}-${testInfo.project.name}-block.png`) });
			if (['phone', 'tablet', 'desktop'].includes(name)) await page.screenshot({ path: testInfo.outputPath(`${locale}-${name}-${testInfo.project.name}-about.png`), fullPage: true });
		}
	});
}

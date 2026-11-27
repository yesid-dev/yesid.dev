import { test, expect } from '@playwright/test';
import { PUBLISHED_LOCALES } from '../src/lib/utils/published-locales';

for (const locale of PUBLISHED_LOCALES) {
	test(`${locale}: hero content and annotation remain clear`, async ({ page }) => {
		await page.goto(locale === 'en' ? '/' : `/${locale}`);
		await expect(page.getByTestId('hero-dot-replay')).toBeEnabled();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByTestId('hero-banner').getByTestId('hero-dot-annotation')).toBeVisible();
		await page.getByTestId('hero-banner').getByTestId('hero-dot-annotation').evaluate(async svg => {
			await Promise.allSettled(svg.getAnimations({ subtree: true }).map(animation => animation.finished));
		});
		const geometry = await page.evaluate(() => {
			const get = (id: string) => document.querySelector(`[data-testid="${id}"]`)!;
			const rect = (id: string) => get(id).getBoundingClientRect();
			const label = rect('hero-annotation-label');
			const dot = rect('hero-dot');
			const lastWord = get('hero-dot-replay').closest('.hero-title-tail')!.getBoundingClientRect();
			const path = get('hero-annotation-arrow') as SVGPathElement;
			const matrix = path.getScreenCTM()!;
			const length = path.getTotalLength();
			const tip = path.getPointAtLength(length).matrixTransform(matrix);
			const obstacles: DOMRect[] = ['hero-heading'].flatMap((id) => {
				const range = document.createRange();
				const ink = document.createElement('canvas').getContext('2d')!;
				const nodes = document.createTreeWalker(get(id), NodeFilter.SHOW_TEXT);
				const rectangles: DOMRect[] = [];
				while (nodes.nextNode()) {
					if (!nodes.currentNode.textContent?.trim()) continue;
					range.selectNodeContents(nodes.currentNode);
					const style = getComputedStyle(nodes.currentNode.parentElement!);
					ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
					const metrics = ink.measureText(nodes.currentNode.textContent!);
					for (const box of range.getClientRects()) {
						const baseline = box.top + metrics.fontBoundingBoxAscent;
						rectangles.push(new DOMRect(box.left, baseline - metrics.actualBoundingBoxAscent, box.width,
							metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent));
					}
				}
				return rectangles;
			});
			for (const id of ['nav-pill', 'hero-subtitle', 'hero-cta-project', 'hero-cta-contact', 'hero-transit-card']) {
				const element = get(id);
				if (element.checkVisibility()) obstacles.push(element.getBoundingClientRect());
			}
			const overlaps = (r: DOMRect) => label.left < r.right && label.right > r.left && label.top < r.bottom && label.bottom > r.top;
			let arrowHits = 0;
			let letteringHits = 0;
			const glyphs = Array.from(get('hero-annotation-label').querySelectorAll<SVGPathElement>('path'));
			const joinAllowance = Math.max(1, parseFloat(getComputedStyle(path).strokeWidth) * 3);
			for (let distance = joinAllowance; distance <= length; distance++) {
				const point = path.getPointAtLength(distance).matrixTransform(matrix);
				if (glyphs.some(glyph => glyph.isPointInStroke(point.matrixTransform(glyph.getScreenCTM()!.inverse())))) letteringHits++;
			}
			// A figure's value (with its smaller unit) stays on one line and inside its column.
			const wrappedValues = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="hero-transit-figure"] dd')).filter(el => el.checkVisibility()).filter(el =>
				el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.5 || el.scrollWidth > el.clientWidth + 1,
			).length;
			for (let i = 0; i <= 100; i++) {
				const p = path.getPointAtLength(length * i / 100).matrixTransform(matrix);
				if (obstacles.some(r => p.x > r.left - 1 && p.x < r.right + 1 && p.y > r.top - 1 && p.y < r.bottom + 1)) arrowHits++;
			}
			return {
				overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
				dotOnWordLine: dot.top + dot.height / 2 >= lastWord.top && dot.top + dot.height / 2 <= lastWord.bottom,
				labelInside: label.left >= 0 && label.right <= innerWidth && label.top >= rect('nav-pill').bottom,
				headlineClearsNav: rect('hero-line1').top >= rect('nav-pill').bottom,
				labelHits: obstacles.filter(overlaps).length,
				arrowHits,
				letteringHits,
				wrappedValues,
				arrow: path.getAttribute('d'),
				obstacles: obstacles.map(r => r.toJSON()),
				tipDistance: Math.hypot(tip.x - (dot.left + dot.width / 2), tip.y - (dot.top + dot.height / 2)),
				dotWidth: dot.width,
				textBottom: document.querySelector('.hero-viewport-text')!.getBoundingClientRect().bottom,
				transitTop: rect('hero-transit-card').top,
			};
		});
		expect(geometry.overflow).toBeLessThanOrEqual(1);
		expect(geometry.dotOnWordLine).toBe(true);
		expect(geometry.headlineClearsNav).toBe(true);
		expect(geometry.labelInside).toBe(true);
		expect(geometry.labelHits, JSON.stringify(geometry)).toBe(0);
		expect(geometry.arrowHits, JSON.stringify(geometry)).toBe(0);
		expect(geometry.letteringHits, 'the arrow must not strike through the annotation lettering').toBe(0);
		expect(geometry.wrappedValues, JSON.stringify(geometry)).toBe(0);
		expect(geometry.tipDistance, 'the arrow must point to the punctuation dot').toBeLessThan(Math.max(24, geometry.dotWidth * 2));
		// Phones and tablets stack: the offer, then Transit.
		if (page.viewportSize()!.width < 1024) expect(geometry.transitTop).toBeGreaterThanOrEqual(geometry.textBottom);
		for (const id of ['hero-cta-project', 'hero-cta-contact']) {
			await page.getByTestId(id).scrollIntoViewIfNeeded();
			await expect(page.getByTestId(id)).toBeInViewport();
		}
	});
}

test('the Transit card links its case study here and its site and code in a new tab', async ({ page, context }) => {
	await context.route('https://transit.yesid.dev/**', route => route.fulfill({ body: '<title>Transit</title>' }));
	await context.route('https://github.com/**', route => route.fulfill({ body: '<title>Repo</title>' }));
	await page.goto('/');
	const links = page.getByTestId('hero-transit-card').getByTestId('home-project-links');
	await expect(links.getByRole('link', { name: 'Transit case study' })).toHaveAttribute('href', '/projects/transit-data-pipeline');
	for (const [name, url] of [['Transit website (opens in a new tab)', 'https://transit.yesid.dev/'], ['Transit repo (opens in a new tab)', /github\.com/]] as const) {
		const link = links.getByRole('link', { name });
		await expect(link).toHaveAttribute('rel', /noopener/);
		const box = await link.boundingBox();
		expect(box!.height).toBeGreaterThanOrEqual(44);
		const popup = page.waitForEvent('popup');
		await link.click();
		const opened = await popup;
		await expect(opened).toHaveURL(url);
		await opened.close();
	}
});

for (const locale of ['en', 'fr', 'es']) {
	test(`${locale}: punctuation stays with the final word when layout changes`, async ({ page }) => {
	test.skip(page.viewportSize()!.width < 1024, 'Desktop only.');
		await page.goto(locale === 'en' ? '/' : `/${locale}`);
		await page.evaluate(() => document.fonts.ready);
		for (const width of [390, 767, 768, 1023, 1024, 1440, 360]) {
			await page.setViewportSize({ width, height: 900 });
			await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
			const together = await page.evaluate(() => {
				const word = document.querySelector('[data-testid="hero-dot-replay"]')!.closest('.hero-title-tail')!.getBoundingClientRect();
				const dot = document.querySelector('[data-testid="hero-dot"]')!.getBoundingClientRect();
				return dot.top + dot.height / 2 >= word.top && dot.top + dot.height / 2 <= word.bottom;
			});
			expect(together, `${width}px punctuation must share the final word's line`).toBe(true);
		}
	});
}

test('short phones keep the English subtitle and both CTAs in the first screen', async ({ page }) => {
	test.skip(page.viewportSize()!.width < 1024, 'Sets its own viewports.');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const viewport of [{ width: 375, height: 640 }, { width: 360, height: 600 }]) {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await expect(page.getByTestId('hero-cta-contact')).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByTestId('hero-subtitle')).toHaveCSS('font-size', '19px');
		const boxes = await page.evaluate(() => ['hero-subtitle', 'hero-cta-project', 'hero-cta-contact'].map((id) => {
			const box = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
			return { id, top: box.top, bottom: box.bottom };
		}));
		for (const box of boxes) expect(box.bottom, `${box.id} at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(viewport.height);
		expect(boxes[0].bottom, 'subtitle clears the CTA row').toBeLessThanOrEqual(boxes[1].top);
	}
});

// Owner live QA (DEV-43, updated 27 November 2026): on desktop the heading, lead and both actions
// read as one left-aligned block beside the Transit card. Both are placed from the viewport, so
// their starts hold while the CTA and Transit figures are still being parsed.
test('desktop: the offer and card keep their anchors without late hero content', async ({ page }) => {
	test.skip(page.viewportSize()!.width < 1024, 'The two-column opening only.');
	const measure = () =>
		page.evaluate(() => {
			const box = (element: Element) => element.getBoundingClientRect().toJSON();
			const grid = document.querySelector('[data-testid="hero-text-container"] .hero-grid')!;
			return {
				block: box(grid.firstElementChild!),
				card: box(document.querySelector('[data-testid="hero-transit-card"]')!),
				pill: box(document.querySelector('[data-testid="nav-pill"]')!),
				heading: box(document.querySelector('[data-testid="hero-heading"]')!),
				actions: box(document.querySelector('[data-testid="hero-cta-project"]')!),
				overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
			};
		});

	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const [width, height] of [[1024, 900], [1280, 760], [1440, 900], [1920, 1080]] as const) {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await expect(page.getByTestId('hero-transit-card')).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		const geometry = await measure();
		const withoutLateContent = await page.evaluate(() => {
			const heading = document.querySelector('[data-testid="hero-heading"]')!;
			const card = document.querySelector('[data-testid="hero-transit-card"]')!;
			const lateContent = [
				document.querySelector('[data-testid="hero-cta-project"]')!.parentElement!,
				document.querySelector('[data-testid="hero-transit-figures"]')!,
			].map(node => ({ node, parent: node.parentNode!, next: node.nextSibling }));
			try {
				for (const { node } of lateContent) node.remove();
				return {
					headingTop: heading.getBoundingClientRect().top,
					cardTop: card.getBoundingClientRect().top,
				};
			} finally {
				for (const { node, parent, next } of lateContent) parent.insertBefore(node, next);
			}
		});
		expect(withoutLateContent).toEqual({ headingTop: geometry.heading.top, cardTop: geometry.card.top });
		const labelMoves = await page.evaluate(() => {
			const figure = document.querySelector('[data-testid="hero-transit-figure"]')!;
			const label = figure.querySelector('dt')!;
			const value = figure.querySelector('dd')!;
			const before = label.getBoundingClientRect().top;
			value.remove();
			try {
				return label.getBoundingClientRect().top - before;
			} finally {
				figure.append(value);
			}
		});
		expect(labelMoves).toBe(0);
		// One left-aligned block: the heading and the actions start at the block's left edge.
		expect(Math.abs(geometry.heading.left - geometry.block.left)).toBeLessThanOrEqual(1);
		expect(Math.abs(geometry.actions.left - geometry.block.left)).toBeLessThanOrEqual(1);
		// Beside the card, never over it, and clear of the header pill.
		expect(geometry.block.right).toBeLessThanOrEqual(geometry.card.left + 1);
		expect(geometry.block.top).toBeGreaterThanOrEqual(geometry.pill.bottom - 1);
		expect(geometry.overflow).toBeLessThanOrEqual(1);
	}

	// 200% text in a short window: the block still starts clear of the pill.
	await page.setViewportSize({ width: 1280, height: 700 });
	await page.goto('/');
	await page.evaluate(() => {
		document.documentElement.style.fontSize = '200%';
	});
	await page.evaluate(() => document.fonts.ready);
	const enlarged = await measure();
	expect(enlarged.block.top, 'the enlarged offer clears the header pill').toBeGreaterThanOrEqual(enlarged.pill.bottom - 1);
	expect(enlarged.overflow, 'the enlarged offer does not scroll sideways').toBeLessThanOrEqual(1);
});

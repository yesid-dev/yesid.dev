import { test, expect, type Page } from '@playwright/test';
import contract from '../../../contracts/kpis-v1.examples.json' with { type: 'json' };

// DEV-38: the home rebuilt from the owner-reviewed preview D-M1 (15 November 2026).

const KPIS = 'https://transit.yesid.dev/api/v1/kpis';

test.beforeEach(async ({ page }) => {
	await page.route(/web3forms|plausible|cal\.com|\/api\/event/, route => route.abort());
});

test('service illustrations keep their own keyboard and touch action', async ({ page, isMobile }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const card = page.locator('.service-card').first();
	const panel = card.locator('[data-testid="service-svg-panel"]:visible');
	await panel.scrollIntoViewIfNeeded();
	await expect(panel).toHaveRole('button');
	await expect(panel).toHaveAccessibleName(/illustration/i);
	await expect(panel).toBeEnabled();
	const distinctShapes = () => panel.locator('svg').evaluate(svg =>
		new Set([...svg.querySelectorAll('path')].map(path => path.getAttribute('d'))).size
	);
	if (isMobile) await panel.tap();
	else {
		await panel.focus();
		await page.keyboard.press('Enter');
	}
	await expect.poll(distinctShapes).toBe(1);
	expect(new URL(page.url()).pathname).toBe('/');
	if (isMobile) await panel.tap();
	else await page.keyboard.press('Enter');
	await expect.poll(distinctShapes).toBeGreaterThan(1);
	const link = card.getByRole('link');
	const destination = await link.getAttribute('href');
	await link.click();
	await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
});

test('service illustration controls keep the still form under reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const panels = page.locator('[data-testid="service-svg-panel"]:visible');
	for (const panel of await panels.all()) {
		await expect(panel).toHaveRole('button');
		await expect(panel).toBeDisabled();
	}
});

test('home shared card body navigates while selected text remains reading', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const card = page.locator('.service-card').first();
	const description = card.locator('.service-description');
	await description.scrollIntoViewIfNeeded();
	await description.evaluate(el => {
		const range = document.createRange(); range.selectNodeContents(el);
		getSelection()!.removeAllRanges(); getSelection()!.addRange(range);
		el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
	});
	expect(new URL(page.url()).pathname).toBe('/');
	await page.evaluate(() => getSelection()!.removeAllRanges());
	const destination = await card.getByRole('link').getAttribute('href');
	await description.click();
	await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
});

/** Opt into the real polling path with a local, controllable Transit response. */
async function liveTransit(page: Page) {
	const control = { fail: false, hold: false, release: () => {} };
	await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
	await page.route(KPIS, async route => {
		if (control.hold) await new Promise<void>(resolve => { control.release = resolve; });
		if (control.fail) await route.fulfill({ status: 503, body: '' });
		else await route.fulfill({ json: contract.examples[0].body });
	});
	return control;
}

test.describe('the opening', () => {
	test('Refresh says it is working, keeps the focus, and announces each result politely', async ({ page, isMobile }) => {
		const transit = await liveTransit(page);
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		const proof = page.getByTestId('hero-transit-proof');
		const state = page.getByTestId('hero-transit-state');
		const announcement = page.getByTestId('hero-transit-announcement');
		const refresh = page.getByTestId('hero-refresh');
		await expect(proof).toHaveAttribute('data-state', 'live');
		await expect(refresh).toHaveAccessibleName('Refresh Transit data');
		await expect(announcement).toHaveAttribute('aria-live', 'polite');
		const box = await refresh.boundingBox();
		expect(box!.height, 'Refresh is a 44px target').toBeGreaterThanOrEqual(44);

		// A refresh that fails keeps the reading and says what to do.
		transit.fail = true;
		transit.hold = true;
		await refresh.scrollIntoViewIfNeeded();
		if (isMobile) await refresh.tap();
		else {
			await refresh.focus();
			await page.keyboard.press('Enter');
		}
		await expect(refresh).toHaveAttribute('aria-disabled', 'true');
		await expect(refresh).toHaveAccessibleName('Refreshing Transit data');
		await expect(refresh).toContainText('Refreshing');
		await expect(proof).toHaveAttribute('aria-busy', 'true');
		if (!isMobile) await expect(refresh).toBeFocused();
		transit.release();
		await expect(proof).toHaveAttribute('aria-busy', 'false');
		await expect(state).toContainText('Could not refresh. Still showing the reading from');
		await expect(state).toContainText('Try again.');
		await expect(announcement).toContainText('Could not refresh.');
		await expect(proof).toHaveAttribute('data-state', 'held');
		if (!isMobile) await expect(refresh).toBeFocused();

		// The next one succeeds.
		transit.fail = false;
		transit.hold = false;
		if (isMobile) await refresh.tap();
		else await page.keyboard.press('Enter');
		await expect(proof).toHaveAttribute('data-state', 'live');
		await expect(state).toHaveText('Live · updated just now');
		await expect(announcement).toHaveText('Transit data refreshed, updated just now.');
		await expect(refresh).not.toHaveAttribute('aria-disabled', 'true');
	});

	test('every part of the settled opening takes the pointer, Refresh included, on touch too', async ({ page, isMobile }) => {
		await liveTransit(page);
		await page.goto('/');
		await expect(page.getByTestId('hero-transit-proof')).toHaveAttribute('data-state', 'live');
		await expect(page.getByTestId('hero-text-container')).toHaveCSS('pointer-events', 'auto');
		for (const id of ['hero-refresh', 'hero-cta-project', 'home-project-case-study']) {
			const target = page.getByTestId('hero-banner').getByTestId(id).first();
			await target.scrollIntoViewIfNeeded();
			const point = await target.evaluate(el => {
				const r = el.getBoundingClientRect();
				const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
				return { hit: hit === el || el.contains(hit) };
			});
			expect(point.hit, `${id} receives the ${isMobile ? 'tap' : 'click'} at its centre`).toBe(true);
		}
	});

	test('desktop: the opening fills the window as a minimum and never clips', async ({ page }) => {
		test.skip(page.viewportSize()!.width < 1024, 'Sets its own desktop viewports.');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 640 }]) {
			await page.setViewportSize(viewport);
			await page.goto('/');
			await page.evaluate(() => document.fonts.ready);
			for (const scale of ['100%', '200%']) {
				await page.evaluate(size => { document.documentElement.style.fontSize = size; }, scale);
				await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
				const geometry = await page.evaluate(() => {
					const hero = document.querySelector('[data-testid="hero-banner"]')!.getBoundingClientRect();
					const card = document.querySelector('[data-testid="hero-transit-card"]')!.getBoundingClientRect();
					const heading = document.querySelector('[data-testid="hero-heading"]')!.getBoundingClientRect();
					return { hero: hero.height, top: hero.top + scrollY, bottom: hero.bottom + scrollY, cardBottom: card.bottom + scrollY, cardRight: card.right, heading: heading.toJSON(), width: innerWidth, height: innerHeight,
						overflow: document.documentElement.scrollWidth - innerWidth };
				});
				expect(geometry.hero, `${viewport.width}x${viewport.height} at ${scale}: at least the window`).toBeGreaterThanOrEqual(viewport.height - 1);
				expect(geometry.cardBottom, 'Transit is never cut').toBeLessThanOrEqual(geometry.bottom + 1);
				expect(geometry.cardRight).toBeLessThanOrEqual(geometry.width);
				expect(geometry.overflow).toBeLessThanOrEqual(1);
			}
			await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
		}
		// The heading takes as few lines as fit: three in English at 1440.
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);
		const lines = await page.getByTestId('hero-heading').evaluate(el => {
			const range = document.createRange();
			range.selectNodeContents(el);
			return new Set([...range.getClientRects()].filter(r => r.width > 1).map(r => Math.round(r.top))).size;
		});
		expect(lines).toBeLessThanOrEqual(3);
	});

	for (const locale of ['en', 'fr', 'es']) {
		test(`${locale} phones: the opening stacks in two screens or less`, async ({ page }) => {
			test.skip(page.viewportSize()!.width >= 768, 'Phones only.');
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto(locale === 'en' ? '/' : `/${locale}`);
			await page.evaluate(() => document.fonts.ready);
			const geometry = await page.evaluate(() => {
				const hero = document.querySelector('[data-testid="hero-banner"]')!.getBoundingClientRect();
				const text = document.querySelector('.hero-viewport-text')!.getBoundingClientRect();
				const card = document.querySelector('[data-testid="hero-transit-card"]')!.getBoundingClientRect();
				return { hero: hero.height, textBottom: text.bottom, cardTop: card.top, height: innerHeight };
			});
			expect(geometry.cardTop, 'the offer, then Transit').toBeGreaterThanOrEqual(geometry.textBottom);
			expect(geometry.hero / geometry.height).toBeLessThanOrEqual(2);
		});
	}

	test('no SQL demo and no "See the data example" remain on the home', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('sql-panel')).toHaveCount(0);
		await expect(page.getByTestId('hero-mobile-sql')).toHaveCount(0);
		await expect(page.locator('main')).not.toContainText(/SELECT|See the data example/);
	});
});

test.describe('projects carousel', () => {
	test('shows the featured projects but Transit, client work first', async ({ page }) => {
		await page.goto('/');
		const titles = await page.getByTestId('proof-reel-section').getByTestId('proof-card-title').allTextContents();
		expect(titles.map(title => title.trim())).toEqual(['Café Arona', 'Vitreva', 'yesid.dev']);
		await expect(page.getByTestId('proof-reel-section')).not.toContainText('Transit');
		await expect(page.getByTestId('hero-transit-card')).toHaveCount(1);
	});

	test('two cards a view on desktop and one on phones, with controls only on overflow', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const reel = page.getByTestId('proof-reel-section');
		await reel.scrollIntoViewIfNeeded();
		const perView = await reel.getByTestId('proof-track').evaluate(track => {
			const frame = track.getBoundingClientRect();
			return [...track.querySelectorAll('[data-testid="proof-card"]')].filter(card => {
				const box = card.getBoundingClientRect();
				return box.left >= frame.left - 1 && box.right <= frame.right + 1;
			}).length;
		});
		expect(perView).toBe(page.viewportSize()!.width >= 1024 ? 2 : 1);
		await expect(reel.getByTestId('proof-controls')).toBeVisible();
		await expect(reel.getByTestId('proof-position')).toHaveText(perView === 2 ? '1 to 2 of 3' : '1 of 3');
		// The reel loops: from the first view both controls are live, neither a dead end.
		await expect(reel.getByTestId('proof-prev')).toBeEnabled();
		await expect(reel.getByTestId('proof-next')).toBeEnabled();

		// Without overflow, no controls.
		await reel.getByTestId('proof-slide').nth(2).evaluate(slide => slide.remove());
		if (perView === 2) {
			await page.setViewportSize({ width: page.viewportSize()!.width - 10, height: page.viewportSize()!.height });
			await expect(reel.getByTestId('proof-controls')).toBeHidden();
		}
	});

	test('the buttons and the keyboard move it, the loop wraps both ways and the position is announced', async ({ page, isMobile }) => {
		test.skip(isMobile, 'Keyboard journey on pointer projects.');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const reel = page.getByTestId('proof-reel-section');
		await reel.scrollIntoViewIfNeeded();
		const next = reel.getByTestId('proof-next');
		const previous = reel.getByTestId('proof-prev');
		const position = reel.getByTestId('proof-position');
		const announcement = reel.getByTestId('proof-announcement');
		await expect(announcement).toHaveText('');
		const firstPosition = (await position.textContent())!;
		await next.focus();
		await page.keyboard.press('Enter');
		await expect(position).toHaveText(/^2 (to 3 )?of 3$/);
		await expect(announcement).toHaveText(await position.textContent() as string);
		await page.keyboard.press('Enter');
		await expect(position).toHaveText(/^3 (to 1 )?of 3$/);
		// At the last view next wraps to the first one, so it is never a dead end: the focus stays.
		await expect(next).toBeEnabled();
		await page.keyboard.press('Enter');
		await expect(position).toHaveText(firstPosition);
		await expect(announcement).toHaveText(firstPosition);
		await expect(next).toBeFocused();
		// Previous wraps the other way, from the first view to the last.
		await previous.focus();
		await page.keyboard.press('Enter');
		await expect(position).toHaveText(/^3 (to 1 )?of 3$/);
		await expect(previous).toBeEnabled();

		// Arrow keys move the reel from a card's own link, without leaving the reel.
		await page.goto('/');
		await reel.scrollIntoViewIfNeeded();
		const firstLink = reel.getByTestId('proof-card').first().getByRole('link').first();
		await firstLink.focus();
		await expect(position).toHaveText(firstPosition);
		const before = (await position.textContent())!;
		await page.keyboard.press('ArrowRight');
		await expect(position).not.toHaveText(before);
		expect(await reel.getByTestId('proof-track').evaluate(track => {
			const active = document.activeElement;
			if (!(active instanceof HTMLElement) || !track.contains(active)) return false;
			const frame = track.getBoundingClientRect();
			const action = active.getBoundingClientRect();
			return action.left >= frame.left - 1 && action.right <= frame.right + 1;
		}), 'card-originated arrows keep the focused action inside the carousel view').toBe(true);
		await page.keyboard.press('ArrowLeft');
		await expect(position).toHaveText(before);

		// Tab through a card's own links: the next card scrolls into view.
		const lastCard = reel.getByTestId('proof-card').nth(2);
		for (let i = 0; i < 12; i++) {
			if (await lastCard.evaluate(card => card.contains(document.activeElement))) break;
			await page.keyboard.press('Tab');
		}
		await expect.poll(() => lastCard.evaluate(card => {
			const frame = card.closest('[data-testid="proof-track"]')!.getBoundingClientRect();
			const box = card.getBoundingClientRect();
			return box.left >= frame.left - 1 && box.right <= frame.right + 1;
		})).toBe(true);
		await expect(lastCard).toHaveCSS('transform', 'none');
	});

	test('the first card in view survives a reload', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const reel = page.getByTestId('proof-reel-section');
		await reel.scrollIntoViewIfNeeded();
		await reel.getByTestId('proof-next').click();
		await expect(reel.getByTestId('proof-position')).not.toHaveText(/^1 (to 2 )?of 3$/);
		const position = (await reel.getByTestId('proof-position').textContent())!;
		await expect.poll(() => page.evaluate(() => Number(sessionStorage.getItem('persisted:featured-card')))).toBeGreaterThan(0);
		await page.reload();
		await reel.scrollIntoViewIfNeeded();
		await expect(reel.getByTestId('proof-position')).toHaveText(position);
	});

	test('a touch drag past either end wraps the reel', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'Touch swipe runs on the touch projects.');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const reel = page.getByTestId('proof-reel-section');
		await reel.scrollIntoViewIfNeeded();
		const track = reel.getByTestId('proof-track');
		const position = reel.getByTestId('proof-position');
		const start = (await position.textContent())!;
		const touch = await page.context().newCDPSession(page);
		const swipe = async (dx: number, dy = 0) => {
			await track.scrollIntoViewIfNeeded();
			const box = (await track.boundingBox())!;
			if (dy === 0) dx = Math.sign(dx) * box.width * 0.65;
			const x = box.x + box.width * (dx > 0 ? 0.15 : 0.85);
			const y = Math.max(220, box.y + Math.min(box.height / 2, 160));
			await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
			for (let step = 1; step <= 6; step++) {
				await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 6, y: y + dy * step / 6 }] });
			}
			await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		};
		// Normal page scrolling can drift sideways. It must not change the project.
		await swipe(30, 180);
		await expect(position).toHaveText(start);
		// Dragging right at the first card wraps to the last one; dragging left there wraps forward.
		await swipe(60);
		await expect(position).not.toHaveText(start);
		const last = (await position.textContent())!;
		await swipe(-60);
		await expect(position).toHaveText(start);
		expect(last).not.toBe(start);
		await touch.detach();
	});

	test('under reduced motion the buttons jump without gliding', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const reel = page.getByTestId('proof-reel-section');
		await reel.scrollIntoViewIfNeeded();
		const track = reel.getByTestId('proof-track');
		const card = reel.getByTestId('proof-slide').first();
		const before = (await card.boundingBox())!.x;
		await reel.getByTestId('proof-next').click();
		// The very next frame already shows the target: no smooth scroll in between.
		const moved = await card.evaluate(el => new Promise<number>(resolve => requestAnimationFrame(() => resolve(el.getBoundingClientRect().left))));
		expect(Math.abs(moved - before)).toBeGreaterThan(20);
		const nextFrame = await card.evaluate(el => new Promise<number>(resolve => requestAnimationFrame(() => resolve(el.getBoundingClientRect().left))));
		expect(nextFrame).toBeCloseTo(moved, 1);
	});

	test('cards are interactive: they lift 1px and light their edge, with no shadow, in both themes', async ({ page, isMobile }) => {
		test.skip(isMobile, 'Hover on pointer projects.');
		for (const theme of ['dark', 'light']) {
			await page.addInitScript(t => localStorage.setItem('theme', t), theme);
			await page.goto('/');
			await page.locator('html').evaluate((el, t) => el.setAttribute('data-theme', t), theme);
			for (const card of [page.getByTestId('proof-card').first(), page.getByTestId('hero-transit-card'), page.locator('.service-card').first()]) {
				await card.scrollIntoViewIfNeeded();
				await page.mouse.move(0, 0);
				const read = () => card.evaluate(el => {
					const s = getComputedStyle(el);
					return { transform: s.transform, border: s.borderTopColor, shadow: s.boxShadow };
				});
				await expect.poll(async () => (await read()).transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
				const before = await read();
				await card.hover({ position: { x: 20, y: 20 } });
				await expect.poll(async () => (await read()).transform).toBe('matrix(1, 0, 0, 1, 0, -1)');
				const after = await read();
				expect(after.border).not.toBe(before.border);
				expect(after.shadow).toBe(before.shadow);
				expect(after.shadow === 'none' || after.shadow.includes('inset')).toBe(true);
			}
		}
	});
});

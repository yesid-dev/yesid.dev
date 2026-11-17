import { expect, test, type Locator } from '@playwright/test';

/** Follow a real card, not a cyclic counter, across both sides of the seam. */
async function boundaryMotion(reel: Locator, direction: 'prev' | 'next') {
	return reel.evaluate(async (section, direction) => {
		const cards = [...section.querySelectorAll('[data-testid="proof-slide"]')];
		const viewport = section.querySelector('[data-testid="proof-track"]')!.getBoundingClientRect();
		const control = section.querySelector<HTMLButtonElement>(`[data-testid="proof-${direction}"]`)!;
		const width = cards[0]!.getBoundingClientRect().width;
		const read = () => cards.map(card => {
			const box = card.getBoundingClientRect();
			return { x: box.left, visible: Math.min(viewport.right, box.right) - Math.max(viewport.left, box.left) > 2 };
		});
		const samples = [read()];
		control.click();
		const until = performance.now() + 1600;
		while (performance.now() < until) {
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
			samples.push(read());
		}
		return { width, samples };
	}, direction);
}

test('last and first projects move continuously in the chosen direction', async ({ page }, testInfo) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	const reel = page.getByTestId('proof-reel-section');
	await reel.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	await expect(reel.getByTestId('proof-position')).toHaveText(/^1 (to 2 )?of 3$/);
	for (const [direction, sign] of [['prev', 1], ['next', -1]] as const) {
		const { samples, width } = await boundaryMotion(reel, direction);
		// Ignore repositioning outside the clipped viewport. Any card visible in both frames
		// must keep moving continuously in the requested direction.
		const deltas = samples.slice(1).flatMap((frame, i) => frame.flatMap((card, j) =>
			card.visible && samples[i]![j]!.visible ? [(card.x - samples[i]![j]!.x) * sign] : []));
		await testInfo.attach(`${direction}-motion`, { body: JSON.stringify({ width, samples }), contentType: 'application/json' });
		expect(samples.every(frame => frame.some(card => card.visible)), 'the track never goes blank').toBe(true);
		expect(deltas.filter(x => x > 1).length, 'the seam has visible intermediate motion').toBeGreaterThan(3);
		expect(Math.min(...deltas), 'visible cards never reverse or restart at the boundary').toBeGreaterThanOrEqual(-1);
		expect(Math.max(...deltas), 'no visible frame teleports across the track').toBeLessThan(width * 0.65);
		await expect(reel.getByTestId('proof-position')).toHaveText(direction === 'prev' ? /^3 (to 1 )?of 3$/ : /^1 (to 2 )?of 3$/);
	}
	await expect(reel.getByTestId('proof-position')).toHaveText(/^1 (to 2 )?of 3$/);
	await expect(reel.getByTestId('proof-card')).toHaveCount(3);
});

test('horizontal trackpad gestures browse projects and vertical wheel keeps page scrolling', async ({ page, isMobile }) => {
	test.skip(isMobile, 'Pointer input on desktop.');
	await page.goto('/');
	const reel = page.getByTestId('proof-reel-section');
	await reel.scrollIntoViewIfNeeded();
	const position = reel.getByTestId('proof-position');
	const initial = await position.textContent();
	await reel.getByTestId('proof-track').hover({ position: { x: 200, y: 150 } });
	await page.mouse.wheel(500, 0);
	await expect(position).not.toHaveText(initial!);
	await expect.poll(async () => {
		const card = (await reel.getByTestId('proof-slide').nth(1).boundingBox())!;
		const frame = (await reel.getByTestId('proof-track').boundingBox())!;
		return Math.abs(card.x - frame.x - 4);
	}).toBeLessThan(1);
	const beforeShift = await position.textContent();
	await page.keyboard.down('Shift');
	await page.mouse.wheel(0, 500);
	await page.keyboard.up('Shift');
	await expect(position).not.toHaveText(beforeShift!);
	const beforeY = await page.evaluate(() => scrollY);
	await page.mouse.wheel(0, 160);
	await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeY);
});

test('without JavaScript a phone can still swipe to later projects', async ({ browser, baseURL }, info) => {
	test.skip(info.project.name !== 'phone', 'One native phone fallback journey.');
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
	try {
		const page = await context.newPage();
		await page.goto(baseURL + '/');
		const track = page.getByTestId('proof-track');
		await track.scrollIntoViewIfNeeded();
		const box = (await track.boundingBox())!;
		const y = Math.max(220, box.y + 160);
		const touch = await context.newCDPSession(page);
		await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y }] });
		for (let step = 1; step <= 6; step++) {
			await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 320 - step * 40, y }] });
		}
		await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
		await touch.detach();
	} finally { await context.close(); }
});

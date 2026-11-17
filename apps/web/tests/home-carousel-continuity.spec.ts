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

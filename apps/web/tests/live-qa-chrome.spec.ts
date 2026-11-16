import { expect, test, type Page } from '@playwright/test';
import { fixturePostPath } from './_support/content-fixtures';
import { tokenColor } from './_support/token-color';

const routes = ['/', '/about', '/contact', '/services', '/services/data-pipeline',
	'/projects', '/blog', '/blog/personal', '/projects/transit-data-pipeline',
	'/projects/cafe-arona', fixturePostPath('en')];

async function open(page: Page, path: string) {
	await page.goto(path);
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(() => document.fonts.ready);
}

test('drawn page rules, yellow terminals and actual footer hazard tape @theme', async ({ page }) => {
	for (const path of routes) {
		await open(page, path);
		const footer = page.getByRole('contentinfo');
		await expect(footer.locator('[data-slot="footer-hazard-edge"]')).toHaveCount(1);
		await expect(footer.locator('[data-slot="footer-street-edge"]')).toHaveCount(0);
		await expect(footer.locator('[data-slot="footer-hazard-edge"]')).toHaveCSS('height', '3px');
		await expect(footer.locator('[data-slot="footer-hazard-edge"]')).toHaveCSS('background-image', /repeating-linear-gradient/);
		const boundaries = page.locator('main [data-slot="page-section-boundary"]');
		const sections = await page.locator('main [data-slot="page-section"]').count();
		await expect(boundaries).toHaveCount(Math.max(0, sections - 1));
		for (const boundary of await boundaries.all()) {
			await expect(boundary).toHaveClass(/hand-drawn-line/);
			await expect(boundary.locator('svg path')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
			await expect(boundary.locator('svg path')).toHaveCSS('stroke', await tokenColor(page, 'var(--primary)'));
		}
		const rulers = await page.locator('main .dimension-line').evaluateAll(nodes =>
			nodes.filter(node => node.getClientRects().length > 0).length);
		expect(rulers, `${path} has no visible measurement divider`).toBe(0);
		const yellow = await tokenColor(page, 'var(--accent)');
		for (const terminal of await page.locator('main [data-slot="terminal-panel"]').all()) {
			await expect(terminal).toHaveClass(/terminal-rule-line/);
			await expect(terminal.locator(':scope > .terminal-rule')).toHaveCount(0);
			await expect(terminal.locator(':scope > .terminal-titlebar')).toHaveCSS('border-bottom-color', yellow);
			await expect(terminal.locator(':scope > .terminal-titlebar')).toHaveCSS('border-bottom-style', 'solid');
		}
	}
});

test('rail text has no scroll mask and retains the supported layout', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const path of ['/', '/services', '/contact', '/projects', '/blog', '/blog/personal']) {
		await open(page, path);
		const rails = page.locator('main [data-slot="rail-title"]');
		expect(await rails.count(), path).toBeGreaterThan(0);
		for (const rail of await rails.all()) {
			await rail.evaluate(element => {
				const section = element.closest('[data-slot="page-section"]');
				const end = section ? section.getBoundingClientRect().bottom + scrollY : document.documentElement.scrollHeight;
				const top = parseFloat(getComputedStyle(element).top) || 0;
				window.scrollTo({ top: Math.max(0, end - element.getBoundingClientRect().height / 2 - top), behavior: 'instant' });
			});
			await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
			await expect(rail).toHaveCSS('clip-path', 'none');
		}
		if (page.viewportSize()!.width >= 1024 && path === '/') {
			for (const rail of (await rails.all()).slice(0, 3)) await expect(rail).toHaveCSS('position', 'sticky');
		}
	}
});

for (const [path, testId] of [['/', 'proof-card'], ['/projects', 'project-card']] as const) {
	test(`${path}: a product-owned project link keeps its ring and raises its enclosing card @theme`, async ({ page }) => {
		await open(page, path);
		const wrapper = page.getByTestId(testId).first();
		const card = path === '/projects' ? wrapper.locator('[data-slot="card"]') : wrapper;
		const link = card.getByRole('link').first();
		await card.scrollIntoViewIfNeeded();
		const shadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
		for (const motion of ['no-preference', 'reduce'] as const) {
			await page.emulateMedia({ reducedMotion: motion });
			await page.keyboard.press('Tab');
			await link.focus();
			await expect(link).toBeFocused();
			await expect(link).toHaveCSS('outline-width', '2px');
			await expect(card).toHaveCSS('transform', motion === 'reduce' ? 'none' : 'matrix(1, 0, 0, 1, 0, -1)');
			await expect(card).toHaveCSS('box-shadow', shadow);
		}
	});
}

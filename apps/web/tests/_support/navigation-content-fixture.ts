import { expect, type Page } from '@playwright/test';

/** Change only intercepted navigation data, never the CMS or build fixture. */
export async function installNavigationContentFixture(page: Page, mutate: (data: unknown[]) => number) {
	let replacements = 0;
	await page.route('**/__data.json*', async route => {
		const response = await route.fetch();
		const payload = await response.json();
		for (const node of payload.nodes ?? []) {
			if (Array.isArray(node?.data)) replacements += mutate(node.data);
		}
		await route.fulfill({ response, json: payload });
	});
	return () => expect(replacements, 'the page received the test-owned content case').toBeGreaterThan(0);
}

export async function navigateWithContentFixture(page: Page, path: string) {
	await page.goto('/contact');
	await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
	await page.evaluate(path => {
		const link = document.createElement('a');
		link.href = path;
		link.textContent = 'Content test destination';
		link.dataset.testid = 'content-test-destination';
		link.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647';
		document.body.append(link);
	}, path);
	await page.getByTestId('content-test-destination').click();
	await page.waitForURL(url => url.pathname.replace(/\/$/, '') === path.replace(/\/$/, ''));
	await expect(page.getByTestId('page-contact')).toHaveCount(0);
	await page.getByTestId('content-test-destination').evaluate(el => el.remove());
}

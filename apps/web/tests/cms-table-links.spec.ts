import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ProjectSectionSchema, type BlockEditorDoc } from '@repo/shared';

// Set the returning-visitor choice on the tested page, avoiding a home-page
// navigation while Playwright creates each context's storage state.
test.use({ storageState: { cookies: [], origins: [] } });

const require = createRequire(import.meta.url);
const kitRequire = createRequire(require.resolve('@sveltejs/kit/package.json'));
const { stringify, unflatten } = await import(pathToFileURL(kitRequire.resolve('devalue')).href);
const doc: BlockEditorDoc = { time: 0, version: '2', blocks: [{ id: 'targets', type: 'table', data: {
	withHeadings: true, content: [
		['Case', 'Action'],
		['Standalone', ' <a href="/blog/four-projects-four-stacks"><strong>Read the stack comparison</strong></a> '],
		['Sentence', 'Read <a href="/blog/four-projects-four-stacks">this comparison</a> for details.'],
		['Two links', '<a href="/blog">Blog</a> and <a href="/projects">projects</a>'],
		['Wrapped', '<strong> <a href="/blog">Go</a> </strong>'],
		['Plain', 'No linked content'],
	],
} }] };

for (const locale of ['en', 'fr', 'es'])
for (const theme of ['dark', 'light'])
for (const width of [320, 390, 768, 1024, 1440]) {
	test(`${locale} ${theme} ${width}: CMS table links preserve inline prose and size standalone actions`, async ({ page }, testInfo) => {
		await page.addInitScript(() => localStorage.setItem('sections-choice', 'expanded'));
		await page.setViewportSize({ width, height: 1000 });
		await page.route(/plausible|web3forms|cal\.com/, route => route.abort());
		await page.route('**/projects/cafe-arona/__data.json*', async route => {
			const response = await route.fetch();
			const payload = await response.json();
			for (const node of payload.nodes ?? []) {
				if (node?.type !== 'data' || !node.data) continue;
				const data = unflatten(node.data);
				if (!data.project) continue;
				// Routed content must keep the required English fallback in every locale.
				data.project.sections = [ProjectSectionSchema.parse({
					title: { en: 'Table targets', [locale]: 'Table targets' },
					content: { en: doc, [locale]: doc },
				})];
				node.data = JSON.parse(stringify(data));
			}
			await route.fulfill({ response, json: payload });
		});
		const prefix = locale === 'en' ? '' : `/${locale}`;
		await page.goto(`${prefix}/projects`);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.locator(`a[href="${prefix}/projects/cafe-arona"]`).first().click();
		const table = page.getByRole('table').filter({ hasText: 'Standalone' }).filter({ visible: true });
		await expect(table).toBeVisible();
		await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
		const standalone = table.getByRole('link', { name: 'Read the stack comparison' });
		const inline = table.getByRole('link', { name: 'this comparison' });
		expect((await standalone.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		expect((await inline.boundingBox())!.height).toBeGreaterThanOrEqual(24);
		await expect(inline).toHaveCSS('display', 'inline');
		const wrapped = await table.getByRole('link', { name: 'Go', exact: true }).boundingBox();
		expect(wrapped!.height).toBeGreaterThanOrEqual(44);
		expect(wrapped!.width).toBeGreaterThanOrEqual(44);
		await expect(table.getByRole('link', { name: 'Blog', exact: true })).toHaveCSS('display', 'inline');
		await expect(standalone).toHaveCSS('text-decoration-line', 'underline');
		expect(await standalone.evaluate(node => {
			const probe = document.createElement('span');
			probe.style.color = 'var(--primary)';
			node.append(probe);
			const primary = getComputedStyle(probe).color;
			probe.remove();
			return getComputedStyle(node).color === primary;
		})).toBe(true);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		if (width === 390 || width === 1440) await table.screenshot({ path: testInfo.outputPath(`${locale}-${theme}-${width}.png`) });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await standalone.focus();
		await page.keyboard.press('Tab');
		await page.keyboard.press('Shift+Tab');
		expect((await standalone.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		await expect(standalone).toBeFocused();
		expect(await standalone.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
	});
}

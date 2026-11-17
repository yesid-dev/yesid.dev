import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ProjectSectionSchema, type BlockEditorDoc } from '@repo/shared';

const require = createRequire(import.meta.url);
const kitRequire = createRequire(require.resolve('@sveltejs/kit/package.json'));
const { stringify, unflatten } = await import(pathToFileURL(kitRequire.resolve('devalue')).href);
const doc: BlockEditorDoc = { time: 0, version: '2.31.2', blocks: [{ id: 'comparison', type: 'table', data: {
	withHeadings: true, withRowHeadings: true, content: [
		['Project', 'Stack', 'Reason'],
		['<b>Site</b>', 'Static', '<a href="/projects">Read the projects</a>'],
		['Store', 'Commerce', 'A catalog and checkout'],
	],
} }] };

test.use({ storageState: { cookies: [], origins: [] } });
for (const locale of ['en', 'fr', 'es']) for (const theme of ['light', 'dark']) {
	test(`${locale} ${theme}: authored row headings keep native table and keyboard scroll`, async ({ page }, info) => {
		if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 900 });
		await page.addInitScript(() => localStorage.setItem('sections-choice', 'expanded'));
		await page.route(/plausible|web3forms|cal\.com|\/api\/event|\/relay\/e|cloudflareinsights|cdn-cgi\/rum|vitals\.vercel|\/_vercel\/(?:insights|speed-insights)/, route => route.abort());
		await page.route('**/projects/cafe-arona/__data.json*', async route => {
			const response = await route.fetch();
			const payload = await response.json();
			for (const node of payload.nodes ?? []) {
				if (node?.type !== 'data' || !node.data) continue;
				const data = unflatten(node.data);
				if (!data.project) continue;
				data.project.sections = [ProjectSectionSchema.parse({ title: { en: 'Comparison', [locale]: 'Comparison' },
					content: { en: doc, [locale]: doc } })];
				node.data = JSON.parse(stringify(data));
			}
			await route.fulfill({ response, json: payload });
		});
		const prefix = locale === 'en' ? '' : `/${locale}`;
		await page.goto(`${prefix}/projects`);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		await page.locator(`a[href="${prefix}/projects/cafe-arona"]`).first().click();
		await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
		const table = page.getByRole('table').filter({ hasText: 'A catalog and checkout' }).filter({ visible: true });
		await expect(table.getByRole('rowheader', { name: 'Site', exact: true })).toHaveAttribute('scope', 'row');
		await expect(table.getByRole('columnheader')).toHaveCount(3);
		await expect(table.getByRole('cell', { name: 'Static', exact: true })).toBeVisible();
		const region = table.locator('..');
		await expect(region).toHaveAttribute('role', 'region');
		await region.focus();
		await expect(region).toBeFocused();
		if (info.project.name === 'phone') {
			expect(await region.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
			await page.keyboard.press('ArrowRight');
			await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		const axe = await new AxeBuilder({ page }).include('.table-scroll').withRules(['scope-attr-valid', 'td-headers-attr', 'scrollable-region-focusable']).analyze();
		expect(axe.violations).toEqual([]);
		await info.attach('table-accessibility', { body: await table.ariaSnapshot(), contentType: 'text/plain' });
		if (locale === 'en' && info.project.name !== 'tablet') await table.screenshot({ path: info.outputPath(`row-headings-${info.project.name}-${theme}.png`) });
	});
}

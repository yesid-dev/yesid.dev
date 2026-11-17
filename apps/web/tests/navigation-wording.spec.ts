import { expect, test } from '@playwright/test';
import { localeCopy } from '../src/lib/locales';

const copy = {
	en: { path: '/', social: 'Elsewhere', contact: 'Contact', stamp: 'NAVIGATION · ALL ROUTES' },
	fr: { path: '/fr', social: 'Ailleurs', contact: 'Contact', stamp: 'NAVIGATION · TOUTES LES ROUTES' },
	es: { path: '/es', social: 'En otros lugares', contact: 'Contacto', stamp: 'NAVEGACIÓN · TODAS LAS RUTAS' },
} as const;

for (const locale of ['en', 'fr', 'es'] as const) for (const theme of ['light', 'dark']) {
	const words = copy[locale];
	test(`${locale} ${theme}: social wording stays separate from menu destinations`, async ({ page }, info) => {
		if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 900 });
		await page.route(/plausible|web3forms|cal\.com|\/api\/event|\/relay\/e|cloudflareinsights|cdn-cgi\/rum|vitals\.vercel|\/_vercel\/(?:insights|speed-insights)/, route => route.abort());
		await page.addInitScript(value => localStorage.setItem('theme', value), theme);
		await page.goto(words.path);
		await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
		const social = page.getByRole('contentinfo').getByRole('navigation', { name: words.social, exact: true });
		await expect(social).toBeVisible();
		for (const name of ['GitHub', 'LinkedIn', 'Upwork']) await expect(social.getByRole('link', { name, exact: true })).toBeVisible();
		const menuButton = page.getByRole('button', { name: localeCopy[locale].navChrome.shared.openMenuAria, exact: true });
		await menuButton.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText(words.stamp, { exact: true })).toHaveCount(0);
		const groups = dialog.locator('[data-slot="menu-group"]');
		await expect(groups).toHaveCount(3);
		await expect.poll(() => groups.getByRole('link').evaluateAll(links => links.length > 0 && links.every(link => {
			for (let node: Element | null = link; node; node = node.parentElement) {
				if (Number(getComputedStyle(node).opacity) < 0.999) return false;
			}
			return true;
		}))).toBe(true);
		await expect(groups.getByRole('heading', { name: words.social, exact: true })).toHaveCount(0);
		await expect(groups.getByRole('heading', { name: words.contact, exact: true })).toBeVisible();
		const destinations = await groups.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
		expect(destinations).toHaveLength(6);
		expect(new Set(destinations).size).toBe(destinations.length);
		const prefix = locale === 'en' ? '' : `/${locale}`;
		expect(destinations).toEqual([`${prefix}/services`, `${prefix}/projects`, `${prefix}/blog`, `${prefix}/about`,
			`https://login.yesid.dev/?lang=${locale}`, `${prefix}/contact`]);
		if (theme === 'light' && locale === 'fr' && info.project.name === 'phone') {
			await dialog.screenshot({ path: info.outputPath('menu-fr-phone.png') });
		}
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(menuButton).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
		if (theme === 'light' && ((locale === 'fr' && info.project.name === 'phone') || (locale === 'es' && info.project.name === 'desktop'))) {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await social.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
			await expect.poll(() => social.evaluate(el => {
				const box = el.getBoundingClientRect();
				return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
			})).toBe(true);
			await social.screenshot({ path: info.outputPath(`footer-${locale}-${info.project.name}.png`) });
		}
	});
}

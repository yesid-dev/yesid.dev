import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import LegalPage from './+page.svelte';
import { load } from './+page.server';
import { legalPages } from '#lib/content/legal-pages.ts';
import { PUBLISHED_LOCALES } from '#lib/utils/published-locales.ts';
import { resolveLocale } from '#lib/utils/locale.ts';
import { catalog } from '#lib/catalog/index.ts';
import { resolvePageSeo } from '#lib/adapters/page-seo.ts';
import { siteNavigationLabels } from '#lib/content/site-navigation-labels.ts';
import { kebabSlug, stripHtml } from '@repo/shared';

for (const locale of PUBLISHED_LOCALES) {
	describe(`${locale} legal loader and renderer`, () => {
		it.each(legalPages)('loads and renders the complete $slug document', async (expected) => {
			const loaded = await load({ params: { slug: expected.slug } });
			expect(loaded.legalPage).toEqual(expected);
			const data = {
				locale, themeColor: '#000000', headerLinks: [], footerLinks: [], menuItems: [], morphShapes: [],
				errorPage: catalog.content.errorPage(),
				seo: await resolvePageSeo('/legal/[slug]', locale, { slug: expected.slug }),
				...loaded,
			};
			render(LegalPage, {
				props: { data },
				context: new Map([[Symbol.for('@yesid/ui/locale'), () => locale]]),
			});
			expect(screen.getByRole('heading', { level: 1, name: resolveLocale(expected.title, locale) })).toBeInTheDocument();
			const paragraphs = resolveLocale(expected.body, locale).blocks
				.filter(block => block.type === 'paragraph')
				.map(block => {
					const template = document.createElement('template');
					template.innerHTML = String(block.data.text);
					return template.content.textContent ?? '';
				});
			const body = screen.getByTestId('legal-body');
			const contents = screen.getByRole('navigation', { name: resolveLocale(siteNavigationLabels.navChrome.shared.tocHeading, locale) });
			const links = within(contents).getAllByRole('link');
			expect(links.length).toBeGreaterThan(0);
			for (const link of links) {
				expect(link.getAttribute('href')).toMatch(/^#[a-z0-9]+(?:-[a-z0-9]+)*$/);
				const id = link.getAttribute('href')!.slice(1);
				const target = [...body.querySelectorAll('[id]')].find(element => element.id === id);
				expect(target, `contents target ${id}`).toBeDefined();
				expect(target).toHaveAttribute('tabindex', '-1');
			}
			const elementsWithIds = [...body.querySelectorAll('[id]')];
			const ids = new Set(elementsWithIds.map(element => element.id));
			expect(ids.size).toBe(elementsWithIds.length);
			for (const block of resolveLocale(expected.body, locale).blocks) {
				if (block.type !== 'header') continue;
				const legacy = kebabSlug(stripHtml(block.data.text));
				if (legacy) expect(ids.has(legacy), `existing fragment ${legacy}`).toBe(true);
			}
			expect(screen.getByTestId('page-legal').querySelector('header time')).toBeNull();
			expect(within(body).getAllByRole('paragraph').map(p => p.textContent)).toEqual(paragraphs);
			expect(body).toHaveTextContent('contact@yesid.dev');
			expect(body).not.toHaveTextContent('admin@yesid.dev');
		});
	});
}

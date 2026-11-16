import { describe, expect, it } from 'vitest';
import { menuItems } from '#lib/content/nav.ts';
import { visibleMenuItems } from './menu.ts';
import { groupMenuItems, menuGroupLabels } from './menu-groups.ts';
import type { NavLink } from './types.ts';

const all = visibleMenuItems(menuItems, 'en');

describe('menu groups', () => {
	it('keeps every visible destination exactly once, in the menu order inside each group', () => {
		const groups = groupMenuItems(all, 'en');
		expect(groups.map((group) => group.key)).toEqual(['work', 'explore', 'connect']);
		expect(groups.map((group) => group.items.map((item) => item.href))).toEqual([
			['/services', '/projects'],
			['/blog', '/about'],
			['https://login.yesid.dev', '/contact'],
		]);
		const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
		expect(hrefs).toHaveLength(all.length);
		expect(new Set(hrefs).size).toBe(all.length);
	});

	it('heads the groups with the existing localized names, and Work’s fallback in all three', () => {
		expect(menuGroupLabels('en')).toEqual({ work: 'WORK', explore: 'EXPLORE', connect: 'CONNECT' });
		expect(menuGroupLabels('fr')).toEqual({ work: 'TRAVAIL', explore: 'EXPLORER', connect: 'CONNEXION' });
		expect(menuGroupLabels('es')).toEqual({ work: 'TRABAJO', explore: 'EXPLORA', connect: 'CONECTA' });
		for (const locale of ['en', 'fr', 'es'] as const) {
			for (const label of Object.values(menuGroupLabels(locale))) expect(label.trim()).not.toBe('');
		}
	});

	it('labels every group in the requested locale', () => {
		for (const locale of ['fr', 'es'] as const) {
			const labels = groupMenuItems(all, locale).map((group) => group.label);
			expect(labels).toEqual([
				menuGroupLabels(locale).work,
				menuGroupLabels(locale).explore,
				menuGroupLabels(locale).connect,
			]);
		}
	});

	it('keeps a destination it does not know yet in the general group instead of dropping it', () => {
		const future: NavLink = { href: '/talks', label: { en: 'Talks' }, priority: 1 };
		const groups = groupMenuItems([...all, future], 'en');
		expect(groups.flatMap((group) => group.items.map((item) => item.href))).toContain('/talks');
		expect(groups.find((group) => group.key === 'explore')!.items.map((item) => item.href)).toContain('/talks');
	});

	it('matches destinations with a trailing slash, as the menu links normalise it', () => {
		const slashed: NavLink = { href: '/services/', label: { en: 'Services' }, priority: 1 };
		expect(groupMenuItems([slashed], 'en')[0]).toMatchObject({ key: 'work' });
	});

	it('leaves out an empty group rather than showing a heading with nothing under it', () => {
		const contactOnly = all.filter((item) => item.href === '/contact');
		expect(groupMenuItems(contactOnly, 'en').map((group) => group.key)).toEqual(['connect']);
	});

	it('only groups what the locale shows, so a missing CMS label never becomes an empty row', () => {
		const items: readonly NavLink[] = [
			{ href: '/services', label: { en: 'Services', fr: 'Services' }, priority: 1 },
			{ href: '/blog', label: { en: 'Blog' }, priority: 1 },
		];
		expect(groupMenuItems(visibleMenuItems(items, 'fr'), 'fr').map((group) => group.items.length)).toEqual([1]);
		// The headings stay localized even when an item is not published in that language.
		expect(groupMenuItems(visibleMenuItems(items, 'fr'), 'fr')[0]!.label).toBe('TRAVAIL');
	});
});

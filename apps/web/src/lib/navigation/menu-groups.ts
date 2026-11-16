/**
 * The menu's groups (DEV-43): the same destinations the flat menu listed, organised by what they
 * are for, so the kit's SiteHeader can draw one organised menu on every product. The data API is
 * the one already published (SiteHeader `menuGroups`); this module only decides the groups and
 * their labels. The responsive columns belong to the kit.
 *
 * Every visible item lands in exactly one group: the routes and actions are never lost, reordered
 * inside a group, or duplicated. A destination this module does not know yet goes to the general
 * group rather than disappear.
 */

import type { Locale } from '#lib/types.ts';
import { resolveLocale } from '#lib/utils/locale.ts';
import { siteLabels } from '#lib/content/index.ts';
import type { NavLink } from './types.ts';
import { CLIENT_LOGIN_URL } from './destinations.ts';

export const MENU_GROUP_KEYS = ['work', 'explore', 'connect'] as const;
export type MenuGroupKey = (typeof MENU_GROUP_KEYS)[number];

export interface MenuGroup {
	key: MenuGroupKey;
	label: string;
	items: readonly NavLink[];
}

/** What I build: the offer and the proof. */
const WORK_HREFS: readonly string[] = ['/services', '/projects'];
/** Opening a channel, including the client workspace. */
const CONNECT_HREFS: readonly string[] = [CLIENT_LOGIN_URL, '/contact'];

/**
 * Only the Work group has no copy in the CMS yet: this code fallback carries it, in the existing
 * label pattern, until a menu group label field exists (CMS follow-up, no invented facts).
 */
const WORK_LABEL = { en: 'WORK', fr: 'TRAVAIL', es: 'TRABAJO' } as const;

const hrefKey = (href: string): string => href.trim().replace(/\/+$/, '').toLowerCase();

/** The group headings: the footer's own localized group names where they exist, plus Work. */
export function menuGroupLabels(locale: Locale): Record<MenuGroupKey, string> {
	const footer = siteLabels.footerChrome.footer;
	return {
		work: resolveLocale(WORK_LABEL, locale),
		explore: resolveLocale(footer.exploreLabel, locale),
		connect: resolveLocale(footer.connectLabel, locale),
	};
}

/**
 * Groups the visible menu items, in the menu's own order inside each group. Empty groups are left
 * out, so a product without a login item never shows a heading with nothing under it.
 */
export function groupMenuItems(items: readonly NavLink[], locale: Locale): MenuGroup[] {
	const work: NavLink[] = [];
	const explore: NavLink[] = [];
	const connect: NavLink[] = [];
	for (const item of items) {
		const href = hrefKey(item.href);
		if (WORK_HREFS.includes(href)) work.push(item);
		else if (CONNECT_HREFS.includes(href)) connect.push(item);
		// Reading and everything not named above: the general group, never dropped.
		else explore.push(item);
	}
	const labels = menuGroupLabels(locale);
	return [
		{ key: 'work' as const, label: labels.work, items: work },
		{ key: 'explore' as const, label: labels.explore, items: explore },
		{ key: 'connect' as const, label: labels.connect, items: connect },
	].filter((group) => group.items.length > 0);
}

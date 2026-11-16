import type { NavLink } from './types';
import type { Locale } from '#lib/types.ts';
import { localizeHref } from '#lib/utils/locale-routing.ts';
import { CLIENT_LOGIN_URL } from './destinations.ts';

export { CLIENT_LOGIN_URL } from './destinations.ts';

export function menuHref(href: string, locale: Locale): string {
	if (href.replace(/\/$/, '') === CLIENT_LOGIN_URL) return `${CLIENT_LOGIN_URL}/?lang=${locale}`;
	return localizeHref(href, locale);
}

/** Missing localized CMS labels stay absent instead of borrowing another language. */
export function visibleMenuItems(items: readonly NavLink[], locale: Locale): readonly NavLink[] {
	return items.filter((item) => item.href.trim() && item.label[locale]?.trim());
}

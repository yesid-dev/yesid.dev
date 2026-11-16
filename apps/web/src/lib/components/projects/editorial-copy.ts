/*
 * The optional "For developers" section that starts closed on a first visit (Y-12, answer 5A).
 * Its one-line summary is CMS-owned per section (DEV-28 G24); this module only identifies the
 * section by its English CMS title.
 */

import type { LocalizedString } from '#lib/types.ts';

/** The English title of the optional section that starts closed on a first visit (Y-12, answer 5A). */
const FOR_DEVELOPERS_TITLE = 'for developers';

/** True for a case study's "For developers" section, matched on its CMS title in English. */
export function isForDevelopersSection(title: LocalizedString): boolean {
	return title.en.trim().toLowerCase() === FOR_DEVELOPERS_TITLE;
}

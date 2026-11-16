import type { LocalizedString } from '#lib/types.ts';

/**
 * Words the services pages need that have no CMS field yet (D-M5, DEV-39). Code fallbacks
 * until site_labels gains them; listed as CMS follow-ups in the PR.
 */
export const servicesLabels = {
	/** Accessible name of the station strip on Services, where the stations jump within the page. */
	stationsOnPageAria: { en: 'Services on this page', fr: 'Services sur cette page', es: 'Servicios en esta página' },
	/** Accessible name of the previous and next links at the end of a service page. */
	otherServicesAria: { en: 'Other services', fr: 'Autres services', es: 'Otros servicios' },
} satisfies Record<string, LocalizedString>;

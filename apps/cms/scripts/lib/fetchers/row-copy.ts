import type { LocalizedString } from '@repo/shared';

/**
 * Approved fallback for the home Transit card line (DEV-28 G11.1). Keyed by
 * project slug: the sentence belongs to Transit's own translation rows and must
 * never be applied to another project.
 */
export const projectCardLineFallback: Readonly<Record<string, LocalizedString>> = {
	'transit-data-pipeline': {
		"en": "My public dashboard · Montréal and Ottawa",
		"fr": "Mon tableau de bord public · Montréal et Ottawa",
		"es": "Mi panel público · Montreal y Ottawa"
	},
};

/**
 * Approved fallback for a closed section's one-line summary (DEV-28 G24),
 * keyed by projects_sections id. Only the two reviewed sections have an
 * approved summary; every other section stays without one.
 */
export const projectSectionSummaryFallback: Readonly<Record<string, LocalizedString>> = {
	'280': {
		"en": "The tools behind each part of Transit, then the tests and the size of the code, dated.",
		"fr": "Les outils derrière chaque partie de Transit, puis les tests et la taille du code, datés.",
		"es": "Las herramientas detrás de cada parte de Transit, y luego las pruebas y el tamaño del código, con fecha."
	},
	'240': {
		"en": "How the theme, content, languages, analytics and delivery are built, with the rule that decides whether a product can be bought.",
		"fr": "Comment le thème, le contenu, les langues, l’analytique et la mise en ligne sont construits, avec la règle qui décide si un produit peut être acheté.",
		"es": "Cómo están hechos el tema, el contenido, los idiomas, la analítica y la publicación, con la regla que decide si un producto se puede comprar."
	},
};

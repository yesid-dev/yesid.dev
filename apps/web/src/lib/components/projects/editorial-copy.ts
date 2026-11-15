import type { LocalizedString } from '#lib/types.ts';

/*
 * Words from the owner-reviewed case-study preview D-M2 (DEV-41). They are code-owned until the CMS
 * carries them (CMS follow-up listed in the PR); every other word on the page is the CMS's.
 */

/** The English title of the optional section that starts closed on a first visit (Y-12, answer 5A). */
const FOR_DEVELOPERS_TITLE = 'for developers';

/** True for a case study's "For developers" section, matched on its CMS title in English. */
export function isForDevelopersSection(title: LocalizedString): boolean {
	return title.en.trim().toLowerCase() === FOR_DEVELOPERS_TITLE;
}

/**
 * The one line a closed "For developers" section shows under its heading, per case study. A case
 * study without one shows its heading only, which names its topic.
 */
export const forDevelopersSummaries: Readonly<Record<string, LocalizedString>> = {
	'transit-data-pipeline': {
		en: 'The tools behind each part of Transit, then the tests and the size of the code, dated.',
		fr: 'Les outils derrière chaque partie de Transit, puis les tests et la taille du code, datés.',
		es: 'Las herramientas detrás de cada parte de Transit, y luego las pruebas y el tamaño del código, con fecha.',
	},
	'cafe-arona': {
		en: 'How the theme, content, languages, analytics and delivery are built, with the rule that decides whether a product can be bought.',
		fr: 'Comment le thème, le contenu, les langues, l’analytique et la mise en ligne sont construits, avec la règle qui décide si un produit peut être acheté.',
		es: 'Cómo están hechos el tema, el contenido, los idiomas, la analítica y la publicación, con la regla que decide si un producto se puede comprar.',
	},
};

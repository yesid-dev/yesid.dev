/**
 * Home words proposed in the owner-reviewed preview D-M1 (DEV-38). Proposed copy until site_labels
 * or the hero singleton owns each field; every entry names the CMS field it waits for, so the
 * PR's "CMS follow-up" list and this file stay one list. Placeholders use `{name}` (fillTemplate).
 */
type Words = { en: string; fr: string; es: string };

export const homeLabels = {
	hero: {
		/** hero.headline (one sentence; the dot is drawn by the page). */
		heading: {
			en: 'Websites and data tools for your business',
			fr: 'Des sites web et des outils de données pour votre entreprise',
			es: 'Sitios web y herramientas de datos para empresas',
		},
		/** hero.lead */
		lead: {
			en: 'I build websites, automate repetitive work and make data easier to use.',
			fr: "Je crée des sites web, j'automatise les tâches répétitives et je rends les données plus faciles à utiliser.",
			es: 'Creo sitios web, automatizo tareas repetitivas y hago que los datos sean más fáciles de usar.',
		},
		/** hero.cta_project: the one yellow button, to Contact. */
		ctaProject: {
			en: 'Tell me about your project',
			fr: 'Parlez-moi de votre projet',
			es: 'Hablar de un proyecto',
		},
		/** Accessible suffix for links that open a new tab (site_labels.a11y.opens_new_tab). */
		newTab: { en: ' (opens in a new tab)', fr: " (s'ouvre dans un nouvel onglet)", es: ' (se abre en una pestaña nueva)' },
	},
	transit: {
		/** projects.card_line for Transit. */
		line: {
			en: 'My public dashboard · Montréal and Ottawa',
			fr: 'Mon tableau de bord public · Montréal et Ottawa',
			es: 'Mi panel público · Montreal y Ottawa',
		},
		/** site_labels.hero_dashboard.*: sentence case figure names. */
		vehicles: { en: 'Vehicles tracked', fr: 'Véhicules suivis', es: 'Vehículos registrados' },
		delay: { en: 'Average delay', fr: 'Retard moyen', es: 'Retraso medio' },
		routes: { en: 'Routes reporting', fr: 'Lignes avec des données', es: 'Rutas con datos' },
		routesOf: { en: '{value} of {total}', fr: '{value} sur {total}', es: '{value} de {total}' },
		/** hero.state_live, with the reading's age. */
		live: { en: 'Live', fr: 'En direct', es: 'En vivo' },
		updatedJustNow: { en: 'updated just now', fr: "mis à jour à l'instant", es: 'actualizado hace un momento' },
		updatedAgo: { en: 'updated {age} ago', fr: 'mis à jour il y a {age}', es: 'actualizado hace {age}' },
		/** hero.state_held (replaces "Refresh unavailable", which the Refresh button would contradict). */
		held: {
			en: 'Last received {age} ago. New readings are not arriving.',
			fr: "Dernières données reçues il y a {age}. Les nouvelles lectures n'arrivent pas.",
			es: 'Últimos datos recibidos hace {age}. No llegan lecturas nuevas.',
		},
		/** hero.refresh_* */
		refresh: { en: 'Refresh', fr: 'Actualiser', es: 'Actualizar' },
		refreshName: { en: 'Refresh Transit data', fr: 'Actualiser les données de Transit', es: 'Actualizar los datos de Transit' },
		refreshing: { en: 'Refreshing', fr: 'Actualisation', es: 'Actualizando' },
		refreshingName: {
			en: 'Refreshing Transit data',
			fr: 'Actualisation des données de Transit',
			es: 'Actualizando los datos de Transit',
		},
		refreshed: {
			en: 'Transit data refreshed, updated just now.',
			fr: "Données de Transit actualisées à l'instant.",
			es: 'Datos de Transit actualizados hace un momento.',
		},
		refreshFailedKept: {
			en: 'Could not refresh. Still showing the reading from {age} ago. Try again.',
			fr: "Actualisation impossible. La lecture d'il y a {age} reste affichée. Réessayez.",
			es: 'No se pudo actualizar. Sigue la lectura de hace {age}. Inténtalo de nuevo.',
		},
		refreshFailedDemo: {
			en: 'Could not refresh. Live data is still unavailable; the demonstration stays. Try again.',
			fr: 'Actualisation impossible. Les données en direct sont toujours indisponibles; la démonstration reste affichée. Réessayez.',
			es: 'No se pudo actualizar. Los datos en vivo siguen sin estar disponibles; se mantiene la demostración. Inténtalo de nuevo.',
		},
		seconds: { en: '{n} seconds', fr: '{n} secondes', es: '{n} segundos' },
		second: { en: '1 second', fr: '1 seconde', es: '1 segundo' },
		minutes: { en: '{n} minutes', fr: '{n} minutes', es: '{n} minutos' },
		minute: { en: '1 minute', fr: '1 minute', es: '1 minuto' },
		/** Accessible names of the Transit screenshots. */
		shotAlt: {
			en: "Transit's live map of Montréal",
			fr: 'La carte en direct de Transit pour Montréal',
			es: 'El mapa en vivo de Transit para Montreal',
		},
	},
	projects: {
		/** site_labels.projects_card.case_study / website / repo */
		caseStudy: { en: 'Case study', fr: 'Étude de cas', es: 'Caso de estudio' },
		website: { en: 'Website', fr: 'Site web', es: 'Sitio web' },
		repo: { en: 'Repo', fr: 'Dépôt', es: 'Repositorio' },
		/** Accessible link names, the project first (English) or last (French, Spanish). */
		caseStudyName: { en: '{project} case study', fr: 'Étude de cas de {project}', es: 'Caso de estudio de {project}' },
		websiteName: { en: '{project} website', fr: 'Site web de {project}', es: 'Sitio web de {project}' },
		repoName: { en: '{project} repo', fr: 'Dépôt de {project}', es: 'Repositorio de {project}' },
		/** site_labels.a11y.carousel_position */
		positionRange: { en: '{from} to {to} of {total}', fr: '{from} à {to} sur {total}', es: '{from} a {to} de {total}' },
		positionOne: { en: '{from} of {total}', fr: '{from} sur {total}', es: '{from} de {total}' },
	},
} satisfies Record<string, Record<string, Words>>;

/**
 * The three key facts each home project card shows, by the English label of its case study's
 * "At a glance" row (the rows keep one order in every language). Proposed until the CMS marks key
 * rows (projects.glance_key_rows).
 */
export const HOME_CARD_KEY_FACTS: Readonly<Record<string, readonly string[]>> = {
	'cafe-arona': ['Business', 'Who runs it', 'I built'],
	vitreva: ['Business', 'Who edits it', 'Yearly cost'],
	'yesid-dev': ['Languages', 'From publish to live', 'What the editor costs'],
};

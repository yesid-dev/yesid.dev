import { describe, expect, it } from 'bun:test';
import { toSiteLabels } from './site-labels';
import { toHeroContent } from './page-blocks-home';
import { toAboutContent } from './page-blocks-about';
import { toContactContent } from './page-blocks-medium';
import { toBlogPageContent, toProjectsPageContent } from './page-blocks-simple';
import { toProject, type DirectusProject } from './projects';
import { SiteLabelsSchema } from '@repo/shared';
import type { BlockEditorDoc } from '@repo/shared';
import seeds from '../../../fixtures/content/site-labels.json';

const DOC: BlockEditorDoc = { time: 0, version: '2.31.2', blocks: [] };

const rows = (en: Record<string, unknown>, fr: Record<string, unknown> = {}) => [
	{ languages_code: 'en', ...en },
	{ languages_code: 'fr', ...fr },
];

describe('site labels: new copy is CMS-primary with approved fallback', () => {
	it('emits the approved words when the new columns are absent', () => {
		const out = toSiteLabels({ id: 'legacy', translations: [{ languages_code: 'en', ...seeds }] });
		expect(out.mediaChrome.dark).toEqual({ en: 'Dark', fr: 'Sombre', es: 'Oscuro' });
		expect(out.mediaChrome.youtubeTitle).toEqual({ en: 'YouTube video', fr: 'Vidéo YouTube', es: 'Video de YouTube' });
		expect(out.a11y.trainRocket.en).toBe('Rocket · tap to land it back into a train');
		expect(out.a11y.opensNewTab.en).toBe('(opens in a new tab)');
		expect(out.a11y.phoneView.fr).toBe('vue sur téléphone');
		expect(out.a11y.quoteDot.es).toBe('Cita {index} de {total}');
		expect(out.a11y.carouselPosition.en).toBe('{from} to {to} of {total}');
		expect(out.a11y.projectLinkRepo.fr).toBe('Dépôt de {project}');
		expect(out.ui.tableRegionFallback.es).toBe('Tabla');
		expect(out.ui.diagramFailure.en).toBe('The diagram could not be displayed. The explanation is available in the text.');
		expect(out.annotation.clickMe.fr).toBe('clique ici');
		expect(out.transit.refreshFailedKept.en).toContain('Could not refresh');
		expect(out.projectsCard.caseStudy).toEqual({ en: 'Case study', fr: 'Étude de cas', es: 'Caso de estudio' });
		expect(out.navChrome.menuGroupWork).toEqual({ en: 'WORK', fr: 'TRAVAIL', es: 'TRABAJO' });
		expect(out.servicesChrome.listing.stationsAria.en).toBe('Services on this page');
		expect(out.servicesChrome.detail.otherServicesAria.es).toBe('Otros servicios');
		expect(() => SiteLabelsSchema.parse(out)).not.toThrow();
	});

	it('lets a nonblank CMS value win per locale, blank cells keep the approved fallback', () => {
		const out = toSiteLabels({
			id: 'u1',
			translations: rows(
				{ ...seeds, media_chrome_dark: 'Night', a11y_phone_view: 'phone' },
				{ media_chrome_dark: 'Nuit', a11y_phone_view: '   ', nav_chrome_menu_group_work: 'BESOIN' },
			),
		});
		expect(out.mediaChrome.dark).toEqual({ en: 'Night', fr: 'Nuit', es: 'Oscuro' });
		expect(out.a11y.phoneView).toEqual({ en: 'phone', fr: 'vue sur téléphone', es: 'vista en el teléfono' });
		expect(out.navChrome.menuGroupWork).toEqual({ en: 'WORK', fr: 'BESOIN', es: 'TRABAJO' });
	});

	it('maps only the captured all-capitals dashboard labels to the approved sentence case', () => {
		const legacy = toSiteLabels({
			id: 'u1',
			translations: [
				{ languages_code: 'en', hero_dashboard_vehicles_label: 'VEHICLES TRACKED', hero_dashboard_delay_label: 'AVG DELAY' },
				{ languages_code: 'fr', hero_dashboard_vehicles_label: 'VÉHICULES SUIVIS', hero_dashboard_delay_label: 'RETARD MOYEN' },
				{ languages_code: 'es', hero_dashboard_vehicles_label: 'VEHÍCULOS RASTREADOS', hero_dashboard_delay_label: 'DEMORA MEDIA' },
			],
		});
		expect(legacy.heroDashboard.vehiclesLabel).toEqual({
			en: 'Vehicles tracked',
			fr: 'Véhicules suivis',
			es: 'Vehículos registrados',
		});
		expect(legacy.heroDashboard.delayLabel).toEqual({
			en: 'Average delay',
			fr: 'Retard moyen',
			es: 'Retraso medio',
		});

		const custom = toSiteLabels({
			id: 'u1',
			translations: rows({ hero_dashboard_routes_label: 'Live lines' }),
		});
		expect(custom.heroDashboard.routesLabel.en).toBe('Live lines');
	});
});

describe('hero opening words', () => {
	it('falls back to the approved home words and accepts a CMS override', () => {
		const base = toHeroContent({ id: 1, translations: rows({}), cta_work_href: null });
		expect(base.opening.sentence.en).toBe('Websites and data tools for your business');
		expect(base.opening.lead.fr).toBe(
			"Je crée des sites web, j'automatise les tâches répétitives et je rends les données plus faciles à utiliser.",
		);
		expect(base.opening.ctaProject.es).toBe('Hablar de un proyecto');

		const custom = toHeroContent({
			id: 1,
			translations: rows({ headline_sentence: 'Custom sentence', lead: '  ' }, { lead: 'Phrase sur mesure' }),
			cta_work_href: null,
		});
		expect(custom.opening.sentence).toEqual({
			en: 'Custom sentence',
			fr: 'Des sites web et des outils de données pour votre entreprise',
			es: 'Sitios web y herramientas de datos para empresas',
		});
		expect(custom.opening.lead).toEqual({
			en: 'I build websites, automate repetitive work and make data easier to use.',
			fr: 'Phrase sur mesure',
			es: 'Creo sitios web, automatizo tareas repetitivas y hago que los datos sean más fáciles de usar.',
		});
	});
});

describe('about headings and French intro bridge', () => {
	const aboutRow = (identityFr: string) => ({
		id: 1,
		weather_enabled: false,
		translations: [
			{
				languages_code: 'en',
				identity_name: 'Yesid', identity_title: 'Builder', identity_value_prop: 'Hello',
				stop_identity: 'IDENTITY', stop_metrics: 'FUN FACTS', stop_testimonials: 'QUOTES', stop_process: 'PROCESS',
				stop_stack: 'EDUCATION', stop_clients: 'LANGUAGES', stop_interests: 'INTERESTS', stop_snapshots: 'SNAPSHOTS',
				stop_location: 'LOCATION', stop_next: 'NEXT',
				weather_city: 'Montréal', cta_button_label: 'Contact',
				label_polaroid_prev_aria: 'p', label_polaroid_next_aria: 'n',
				label_testimonials_carousel_aria: 'c', label_testimonials_tab_nav_aria: 't',
				label_testimonial_slide_aria: 's {index}', label_show_testimonial_aria: 'g {index}',
				label_testimonials_prev_aria: 'pv', label_testimonials_next_aria: 'nx',
			},
			{
				languages_code: 'fr',
				identity_name: 'Yesid', identity_title: 'Bâtisseur',
				identity_value_prop: identityFr,
				weather_city: 'Montréal', cta_button_label: 'Contact',
			},
		],
	});

	it('adds the weather and closing headings with approved fallbacks', () => {
		const out = toAboutContent(aboutRow('Bonjour'), []);
		expect(out.cardHeadings.weather).toEqual({ en: 'Weather', fr: 'Météo', es: 'Clima' });
		expect(out.cardHeadings.cta).toEqual({ en: 'Get in touch', fr: 'Me joindre', es: 'Ponte en contacto' });
	});

	it('maps only the captured legacy French phrase and keeps custom CMS words', () => {
		const legacy =
			"Moi, c'est Yesid : un gars de Montréal qui aime les systèmes clairs et les explications simples. Cette page reflète un peu qui je suis, explore à ta guise :)";
		const mapped = toAboutContent(aboutRow(legacy), []);
		expect(mapped.identity.valueProp.fr).toBe(
			"Moi, c'est Yesid : un gars de Montréal qui aime les systèmes clairs et les explications simples. Cette page reflète un peu qui je suis, explorez à votre guise :)",
		);

		const custom = toAboutContent(aboutRow('Une autre phrase, explore à ta guise autrement'), []);
		expect(custom.identity.valueProp.fr).toBe('Une autre phrase, explore à ta guise autrement');

		const published = toAboutContent(
			aboutRow('Cette page reflète un peu qui je suis, explorez à votre guise :)'),
			[],
		);
		expect(published.identity.valueProp.fr).toBe('Cette page reflète un peu qui je suis, explorez à votre guise :)');
	});
});

describe('contact copy ownership', () => {
	const contactRow = (values: Record<string, unknown>) => ({
		id: 1,
		web3forms_key: 'k',
		info_terminal_title: 'info', info_terminal_command: 'cat',
		form_terminal_title: 'form', form_terminal_command: 'send',
		translations: [
			{
				languages_code: 'en',
				page_title: 'Contact', station_label: '04', send_error_message: 'failed',
				info_location: 'MTL', info_response_time: '~24h response time', info_languages: 'EN',
				info_section_label_location: 'LOCATION', info_section_label_connect: 'CONNECT',
				info_section_label_languages: 'LANGUAGES',
				form_command_output: 'out', form_submit_label: 'Send',
				form_field_name_placeholder: 'Name', form_field_email_placeholder: 'Email', form_field_message_placeholder: 'Message',
				validation_required: 'r', validation_invalid_email: 'i', validation_error_summary: 's',
				success_validating: 'v', success_sending: 'sd', success_sent: 'st',
				success_response_time: "I'll get back to you within 24h",
				success_meanwhile: 'Meanwhile, check out my {work} or {blog}',
				success_reset_label: 'r', success_field_ok: 'ok',
				success_work_link_label: 'work', success_blog_link_label: 'blog',
				form_required_guidance: 'all', form_no_script: 'js',
				...values,
			},
			{
				languages_code: 'fr',
				page_title: 'Contact', station_label: '04', send_error_message: 'échec',
				info_location: 'MTL', info_response_time: 'réponse en ~24h', info_languages: 'FR',
				info_section_label_location: 'LOCALISATION', info_section_label_connect: 'CONNEXION',
				info_section_label_languages: 'LANGUES',
				form_command_output: 'sortie', form_submit_label: 'Envoyer',
				form_field_name_placeholder: 'Nom', form_field_email_placeholder: 'Courriel', form_field_message_placeholder: 'Message',
				validation_required: 'r', validation_invalid_email: 'i', validation_error_summary: 's',
				success_validating: 'v', success_sending: 'sd', success_sent: 'st',
				success_response_time: "Je te reviens d'ici 24h",
				success_meanwhile: 'En attendant, jette un œil à mes {work} ou mon {blog}',
				success_reset_label: 'r', success_field_ok: 'ok',
				success_work_link_label: 'work', success_blog_link_label: 'blog',
				form_required_guidance: 'tous', form_no_script: 'js',
			},
			{
				languages_code: 'es',
				page_title: 'Contacto', station_label: '04', send_error_message: 'falló',
				info_location: 'MTL', info_response_time: 'respuesta en ~24h', info_languages: 'ES',
				info_section_label_location: 'UBICACIÓN', info_section_label_connect: 'CONECTA',
				info_section_label_languages: 'IDIOMAS',
				form_command_output: 'salida', form_submit_label: 'Enviar',
				form_field_name_placeholder: 'Nombre', form_field_email_placeholder: 'Correo', form_field_message_placeholder: 'Mensaje',
				validation_required: 'r', validation_invalid_email: 'i', validation_error_summary: 's',
				success_validating: 'v', success_sending: 'sd', success_sent: 'st',
				success_response_time: 'Te respondo en menos de 24h',
				success_meanwhile: 'Mientras tanto, échale un ojo a mis {work} o a mi {blog}',
				success_reset_label: 'r', success_field_ok: 'ok',
				success_work_link_label: 'work', success_blog_link_label: 'blog',
				form_required_guidance: 'todos', form_no_script: 'js',
			},
		],
	});

	it('carries the form heading from CMS with the approved fallback', () => {
		const out = toContactContent(contactRow({}), []);
		expect(out.formTerminal.heading).toEqual({ en: 'Send a message', fr: 'Envoyer un message', es: 'Enviar un mensaje' });

		const custom = toContactContent(contactRow({ form_heading: 'Message me' }), []);
		expect(custom.formTerminal.heading.en).toBe('Message me');
	});

	it('replaces only the captured legacy reply-time, connect and meanwhile values', () => {
		const out = toContactContent(contactRow({}), []);
		const reply = {
			en: 'I usually reply within one business day.',
			fr: 'Je réponds habituellement dans un délai d’un jour ouvrable.',
			es: 'Normalmente respondo en un día hábil.',
		};
		expect(out.infoTerminal.responseTime).toEqual(reply);
		expect(out.success.responseTime).toEqual(reply);
		expect(out.infoTerminal.sectionLabels.connect.fr).toBe('ME JOINDRE');
		expect(out.success.meanwhile.fr).toBe('En attendant, jetez un œil à mes {work} ou à mon {blog}');

		const custom = toContactContent(
			contactRow({
				info_response_time: 'Within a week',
				success_response_time: 'Soon',
				info_section_label_connect: 'ÉCRIVEZ-MOI',
				success_meanwhile: 'En attendant, explorez le site',
			}),
			[],
		);
		expect(custom.infoTerminal.responseTime.en).toBe('Within a week');
		expect(custom.success.responseTime.en).toBe('Soon');
		expect(custom.infoTerminal.sectionLabels.connect.en).toBe('ÉCRIVEZ-MOI');
		expect(custom.success.meanwhile.en).toBe('En attendant, explorez le site');
	});
});

describe('listing empty states', () => {
	it('migrates only the captured French blog sentence and adds the projects no-posts label', () => {
		const legacy = toBlogPageContent({
			id: 1,
			translations: rows(
				{ heading: 'Blog', empty_state: 'No posts found.', empty_state_no_posts: 'Nothing here yet.' },
				{ empty_state: "Aucun article trouvé. Essaie d'ajuster tes filtres." },
			),
		});
		expect(legacy.emptyState.fr).toBe('Aucun article trouvé. Essayez d’ajuster vos filtres.');

		const custom = toBlogPageContent({
			id: 1,
			translations: rows({ heading: 'Blog', empty_state: 'None.' }, { empty_state: 'Aucun article. Essaie autre chose.' }),
		});
		expect(custom.emptyState.fr).toBe('Aucun article. Essaie autre chose.');

		const projects = toProjectsPageContent({ id: 1, translations: rows({ heading: 'Projects', empty_state: 'None match.' }) });
		expect(projects.emptyStateNoPosts).toEqual({
			en: 'No projects are published yet.',
			fr: "Aucun projet n'est encore publié.",
			es: 'Todavía no hay proyectos publicados.',
		});
	});
});

describe('row-scoped project copy', () => {
	const project = (id: string, cardLine?: string, sections: DirectusProject['sections'] = []): DirectusProject => ({
		id, status: 'published', sort: 1, featured: false,
		hero_image: null, hero_image_light: null, hero_image_secondary: null, hero_image_secondary_light: null,
		repo_url: null, repo_private: null, docs_url: null, live_url: null, readme_url: null,
		location: null, environment: null, version: null,
		translations: [{ languages_code: 'en', title: id, one_liner: 'one line', description: DOC, ...(cardLine ? { card_line: cardLine } : {}) }],
		sections,
	});

	for (const locale of ['fr', 'es'] as const) {
		for (const [slug, sectionId] of [['transit-data-pipeline', 280], ['cafe-arona', 240]] as const) {
			it(`keeps disabled ${locale} on ${slug} falling back to English for migrated copy`, () => {
				const row = project(slug, 'Editor card line', [{
					id: sectionId, sort: 1,
					translations: [
						{ languages_code: 'en', title: 'For developers', content: DOC, summary: 'Editor summary' },
						{ languages_code: locale, title: 'Hidden title', content: DOC, summary: 'Hidden summary' },
					],
				}]);
				row.translations!.push({ languages_code: locale, show_on_site: false, card_line: 'Hidden card' });
				const out = toProject(row);
				expect(out.cardLine).not.toHaveProperty(locale);
				expect(out.cardLine?.en).toBe('Editor card line');
				expect(out.sections[0]?.summary).not.toHaveProperty(locale);
				expect(out.sections[0]?.summary?.en).toBe('Editor summary');
				const otherLocale = locale === 'fr' ? 'es' : 'fr';
				expect(out.sections[0]?.summary?.[otherLocale]?.trim()).toBeTruthy();
				if (slug === 'transit-data-pipeline') expect(out.cardLine?.[otherLocale]?.trim()).toBeTruthy();
			});
		}
	}

	it('gives card_line to Transit only and keeps other projects untouched', () => {
		const transit = toProject(project('transit-data-pipeline'));
		expect(transit.cardLine).toEqual({
			en: 'My public dashboard · Montréal and Ottawa',
			fr: 'Mon tableau de bord public · Montréal et Ottawa',
			es: 'Mi panel público · Montreal y Ottawa',
		});
		const other = toProject(project('cafe-arona'));
		expect(other.cardLine).toBeUndefined();
		const custom = toProject(project('transit-data-pipeline', 'Ma ligne'));
		expect(custom.cardLine).toEqual({
			en: 'Ma ligne',
			fr: 'Mon tableau de bord public · Montréal et Ottawa',
			es: 'Mi panel público · Montreal y Ottawa',
		});
	});

	it('scopes the For developers summary to its own section and leaves other sections alone', () => {
		const transit = toProject(project('transit-data-pipeline', undefined, [
			{ id: 280, sort: 1, translations: [{ languages_code: 'en', title: 'For developers', content: DOC }] },
			{ id: 300, sort: 2, translations: [{ languages_code: 'en', title: 'Tests', content: DOC }] },
		]));
		expect(transit.sections[0]?.summary?.en).toBe(
			'The tools behind each part of Transit, then the tests and the size of the code, dated.',
		);
		expect(transit.sections[1]?.summary).toBeUndefined();

		const cafe = toProject(project('cafe-arona', undefined, [
			{ id: 240, sort: 1, translations: [{ languages_code: 'en', title: 'For developers', content: DOC }] },
		]));
		expect(cafe.sections[0]?.summary?.en).toBe(
			'How the theme, content, languages, analytics and delivery are built, with the rule that decides whether a product can be bought.',
		);

		const other = toProject(project('yesid-dev', undefined, [
			{ id: 257, sort: 1, translations: [{ languages_code: 'en', title: 'For developers', content: DOC }] },
		]));
		expect(other.sections[0]?.summary).toBeUndefined();

		const custom = toProject(project('transit-data-pipeline', undefined, [
			{
				id: 280, sort: 1,
				translations: [{ languages_code: 'en', title: 'For developers', content: DOC, summary: 'Our own summary.' }],
			},
		]));
		expect(custom.sections[0]?.summary?.en).toBe('Our own summary.');
	});
});

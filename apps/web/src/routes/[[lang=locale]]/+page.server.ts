import { localeFromParams } from '#lib/utils/locale-routing.ts';
import { catalog } from '#lib/catalog/index.ts';
import { bookingHref } from '#lib/utils/high-intent-links.ts';
import { fetchServiceSvgContents } from '#lib/utils/service-svg.ts';
import { localeEntries } from '#lib/server/prerender-entries.ts';
import { keyGlanceFacts } from '#lib/utils/glance-facts.ts';
import { HOME_CARD_KEY_FACTS } from '#lib/components/home/home-labels.ts';

export const entries = localeEntries;

// Home page content resolves concurrently through the catalog.
export async function load({ fetch, params = {} }: { fetch: typeof globalThis.fetch; params?: { lang?: string } }) {
	const locale = localeFromParams(params);
	const [
		metroSvg,
		hero,
		heroAnim,
		manifesto,
		proofReel,
		servicesGrid,
		about,
		closer,
		initialHeroData,
		services,
		siteMeta,
		contactPage,
	] = await Promise.all([
		catalog.content.metroSvg(),
		catalog.content.hero(),
		catalog.content.heroAnim(),
		catalog.content.manifesto(),
		catalog.content.proofReel(),
		catalog.content.servicesGrid(),
		catalog.content.about(),
		catalog.content.closer(),
		catalog.content.initialHeroData(),
		catalog.services.available(locale),
		catalog.meta.site(),
		catalog.content.contactPage(),
	]);

	const [featuredProjects, serviceSvgContents] = await Promise.all([
		catalog.projects.featured(locale),
		fetchServiceSvgContents(fetch, services),
	]);

	// The home cards show three key "At a glance" facts; the summaries omit the case study body.
	const featuredFacts = Object.fromEntries(
		featuredProjects.map((project) => {
			const description = catalog.projects.bySlug(project.slug)?.description;
			return [project.slug, description ? keyGlanceFacts(description, locale, HOME_CARD_KEY_FACTS[project.slug]) : []];
		}),
	);

	return {
		featuredFacts,
		metroSvg,
		hero,
		heroAnim,
		manifesto,
		proofReel,
		servicesGrid,
		about,
		closer,
		initialHeroData,
		services,
		siteMeta,
		bookingHref: bookingHref(contactPage.socials),
		featuredProjects,
		serviceSvgContents,
	};
};

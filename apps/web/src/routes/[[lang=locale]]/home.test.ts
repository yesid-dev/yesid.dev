import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
import type { PageData } from './$types';

import {
	heroContent,
	heroAnimContent,
	manifestoContent,
	proofReelContent,
	servicesGridContent,
	aboutContent,
	closerContent,
} from '#lib/content/site-content.ts';
import { INITIAL_HERO_DATA } from '#lib/live/index.ts';
import { getFeaturedProjects } from '#lib/catalog/index.ts';
import { getVisibleServices } from '#lib/catalog/index.ts';
import { siteMeta } from '#lib/content/site-meta.ts';

vi.mock('#lib/directus/assets.ts', () => ({
	asset: (id: string, preset?: string) => `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	buildSrcSet: () => '',
	assetImage: (id: string, preset?: string) => ({
		src: `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	}),
}));

// Derive featured membership from CMS data and mirror the server load's resolved collection props.
const featuredProjects = getFeaturedProjects();
// Transit is the opening's showcase; the carousel shows the other featured projects (D-M1).
const expectedProofCards = featuredProjects.filter((project) => project.slug !== 'transit-data-pipeline').length;

// PageData merges +page.server.ts return + +layout.server.ts return + +layout.ts
// return (per SvelteKit's typed load chain). The home component only consumes
// the page-level fields; layout fields (nav slots, errorPage, seo, themeColor)
// come from layout-server stubs that are out of this unit test's scope. Cast
// through unknown — the home component never reads layout fields, so the unit
// stub is safe.
const stubData = {
	metroSvg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
	hero: heroContent,
	heroAnim: heroAnimContent,
	manifesto: manifestoContent,
	proofReel: proofReelContent,
	servicesGrid: servicesGridContent,
	about: aboutContent,
	closer: closerContent,
	initialHeroData: INITIAL_HERO_DATA,
	services: getVisibleServices(),
	featuredProjects,
	siteMeta,
} as unknown as PageData;

const renderPage = () => render(Page, { props: { data: stubData } });

describe('Home page', () => {

	it('renders the app root', () => {
		renderPage();
		expect(screen.getByTestId('app-root')).toBeInTheDocument();
	});

	it('renders the hero banner', () => {
		renderPage();
		expect(screen.getByTestId('hero-banner')).toBeInTheDocument();
	});

	it('renders the metro network container in the hero', () => {
		renderPage();
		expect(screen.getByTestId('metro-network-container')).toBeInTheDocument();
	});

	it('renders the hero scroll prompt without a blinking cursor', () => {
		const { container } = renderPage();
		const scrollPrompt = container.querySelector('.scroll-prompt');
		const scrollText = scrollPrompt?.querySelector('span:first-child');
		const cursor = scrollPrompt?.querySelector('.scroll-block-cursor');

		expect(scrollPrompt).toBeInTheDocument();
		expect(scrollText?.textContent).toBe('');
		expect(cursor).toBeNull();
	});

	it('renders the hero heading', () => {
		renderPage();
		const heading = screen.getByRole('heading', { level: 1 });
		expect(heading).toBe(screen.getByTestId('hero-heading'));
		expect(heading.textContent?.trim()).toBeTruthy();
	});

	it('renders the hero orange dot', () => {
		renderPage();
		const dot = screen.getByTestId('hero-dot');
		expect(dot).toBeInTheDocument();
		expect(dot.tagName.toLowerCase()).toBe('svg');
	});

	it('renders the hero lead', () => {
		renderPage();
		expect(screen.getByTestId('hero-subtitle').textContent?.trim()).toBeTruthy();
	});

	it('renders hero CTAs', () => {
		renderPage();
		expect(screen.getByTestId('hero-cta-project')).toBeInTheDocument();
		expect(screen.getByTestId('hero-cta-contact')).toBeInTheDocument();
	});

	it('renders Transit in the opening with its three figures', () => {
		renderPage();
		const card = screen.getByTestId('hero-transit-card');
		expect(card).toHaveAttribute('data-interactive', 'true');
		expect(screen.getAllByTestId('hero-transit-figure')).toHaveLength(stubData.initialHeroData.metrics.length);
	});

	it('shows no SQL demo and no "See the data example" anywhere on the home (owner, 15 November)', () => {
		renderPage();
		expect(screen.queryByTestId('sql-panel')).toBeNull();
		expect(screen.queryByTestId('hero-mobile-sql')).toBeNull();
		expect(screen.getByTestId('app-root').textContent).not.toMatch(/SELECT|avg_delay_s/);
	});

	it('ends every section but the last with the kit dimension line, none before the footer', () => {
		renderPage();
		const sections = screen.getByTestId('home-sections');
		const registered = sections.querySelectorAll('[data-slot="page-section"]');
		const boundaries = sections.querySelectorAll('[data-slot="page-section-boundary"]');
		expect(registered).toHaveLength(7);
		expect(boundaries).toHaveLength(registered.length - 1);
		expect(sections.lastElementChild).toBe(screen.getByTestId('home-section-terminus'));
		// Every boundary is the dimension line, and nothing else sits between two sections.
		for (const boundary of boundaries) expect(boundary).toHaveAttribute('data-variant', 'dimension');
		for (const child of sections.children) {
			expect(child.matches('[data-slot="page-section"], [data-slot="page-section-boundary"]')).toBe(true);
		}
	});

	it('titles Projects, Services, About and Terminus with the kit rail title, the real h2', () => {
		renderPage();
		const titles = screen.getByTestId('home-sections').querySelectorAll('[data-slot="rail-title"]');
		expect(titles).toHaveLength(4);
		for (const title of titles) expect(title.querySelector('h2')).not.toBeNull();
	});

	it('renders the manifesto section', () => {
		renderPage();
		expect(screen.getByTestId('manifesto-section')).toBeInTheDocument();
	});

	it('renders manifesto capability pills', () => {
		renderPage();
		const pills = screen.getAllByTestId('manifesto-pill');
		expect(pills).toHaveLength(stubData.manifesto.pills.length);
	});

	it('renders the proof reel section', () => {
		renderPage();
		expect(screen.getByTestId('proof-reel-section')).toBeInTheDocument();
	});

	it('renders one proof reel card per resolvable featured slug', () => {
		renderPage();
		const cards = screen.getAllByTestId('proof-card');
		expect(cards).toHaveLength(expectedProofCards);
	});

	it('renders the services section', () => {
		renderPage();
		expect(screen.getByTestId('services-section')).toBeInTheDocument();
	});

	it('renders one card per service', () => {
		renderPage();
		const cards = screen.getAllByTestId('services-card');
		expect(cards).toHaveLength(stubData.services.length);
	});

	it('renders service benefit headlines', () => {
		renderPage();
		const benefits = screen.getAllByTestId('services-benefit');
		expect(benefits).toHaveLength(stubData.services.filter((service) => service.benefitHeadline).length);
	});

	it('renders the closer section', () => {
		renderPage();
		expect(screen.getByTestId('closer-section')).toBeInTheDocument();
	});

	it('renders closer departure board with 4 rows', () => {
		renderPage();
		const rows = screen.getAllByTestId('closer-row');
		expect(rows).toHaveLength(4);
	});

});

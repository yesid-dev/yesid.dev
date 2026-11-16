import { siteLabels } from '#lib/content/site-labels.ts';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import FeaturedProjects from './FeaturedProjects.svelte';
import { proofReelContent } from '#lib/content/site-content.ts';
import { getFeaturedProjects } from '#lib/catalog/index.ts';
import { resolveLocale } from '#lib/utils/locale.ts';
import type { Project } from '#lib/types.ts';
import { projectFactory } from '../../../tests/factories';

vi.mock('#lib/directus/assets.ts', () => ({
	asset: (id: string, preset?: string) => `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	buildSrcSet: () => '',
	assetImage: (id: string, preset?: string) => ({
		src: `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	}),
}));

const resolvedProjects: readonly Project[] = getFeaturedProjects().filter((project) => project.slug !== 'transit-data-pipeline');
const expectedCount = resolvedProjects.length;
const renderProps = { proofReel: proofReelContent, projects: resolvedProjects };

describe('FeaturedProjects', () => {
	it('renders one interactive card per project, with no hidden loop copies', () => {
		render(FeaturedProjects, { props: renderProps });
		expect(screen.getByTestId('proof-reel-section')).toBeInTheDocument();
		const cards = screen.getAllByTestId('proof-card');
		expect(cards).toHaveLength(expectedCount);
		for (const card of cards) expect(card).toHaveAttribute('data-interactive', 'true');
		expect(document.querySelectorAll('[data-loop-copy]')).toHaveLength(0);
	});

	it('renders each title as a heading and its one-line result', () => {
		render(FeaturedProjects, { props: renderProps });
		const cards = screen.getAllByTestId('proof-card');
		resolvedProjects.forEach((project, i) => {
			const card = within(cards[i]!);
			expect(card.getByRole('heading', { level: 3 })).toHaveTextContent(resolveLocale(project.title, 'en'));
			expect(card.getByTestId('proof-excerpt')).toHaveTextContent(resolveLocale(project.oneLiner, 'en'));
		});
	});

	it('gives each card its own links, named with its project, and no whole-card link', () => {
		render(FeaturedProjects, { props: renderProps });
		const cards = screen.getAllByTestId('proof-card');
		resolvedProjects.forEach((project, i) => {
			const card = cards[i]!;
			const title = resolveLocale(project.title, 'en');
			expect(within(card).getByRole('link', { name: `${title} case study` })).toHaveAttribute('href', `/projects/${project.slug}`);
			expect(card.closest('a')).toBeNull();
			for (const link of within(card).getAllByRole('link')) expect(link.querySelector('a, button')).toBeNull();
		});
	});

	it('links a client site and a public repository, and never this site from its own card', () => {
		const client = projectFactory.build({ slug: 'client', liveUrl: 'https://client.example', repoUrl: 'https://github.com/x/client', repoPrivate: true } as Partial<Project>);
		const open = projectFactory.build({ slug: 'open', liveUrl: 'https://yesid.dev', repoUrl: 'https://github.com/x/open' } as Partial<Project>);
		render(FeaturedProjects, { props: { proofReel: proofReelContent, projects: [client, open] } });
		const [clientCard, openCard] = screen.getAllByTestId('proof-card');
		expect(within(clientCard!).getByTestId('home-project-website')).toHaveAttribute('href', 'https://client.example');
		expect(within(clientCard!).getByTestId('home-project-website')).toHaveAttribute('target', '_blank');
		expect(within(clientCard!).queryByTestId('home-project-repo')).toBeNull();
		expect(within(openCard!).queryByTestId('home-project-website')).toBeNull();
		expect(within(openCard!).getByTestId('home-project-repo')).toHaveAccessibleName(/repo \(opens in a new tab\)$/);
	});

	it('shows at most three key facts on a card', () => {
		const project = resolvedProjects[0]!;
		const facts = Array.from({ length: 5 }, (_, i) => ({ label: `Label ${i}`, value: `Value ${i}` }));
		render(FeaturedProjects, { props: { ...renderProps, projects: [project], facts: { [project.slug]: facts } } });
		const list = screen.getByTestId('proof-card-facts');
		expect(within(list).getAllByRole('term').map((term) => term.textContent)).toEqual(['Label 0', 'Label 1', 'Label 2']);
	});

	it('draws no image caption', () => {
		render(FeaturedProjects, { props: renderProps });
		expect(screen.getByTestId('proof-reel-section').querySelector('figcaption, .caption')).toBeNull();
	});

	it('renders the view-all link to /projects', () => {
		render(FeaturedProjects, { props: renderProps });
		const link = screen.getByTestId('proof-view-all');
		expect(link.getAttribute('href')).toBe('/projects');
		expect(link.textContent).toContain(resolveLocale(proofReelContent.viewAllLabel, 'en'));
	});

	it('keeps the previous and next controls icon-only, named and controlling the track', () => {
		render(FeaturedProjects, { props: renderProps });
		const track = screen.getByTestId('proof-track');
		for (const [id, direction, label] of [
			['proof-prev', 'previous', siteLabels.a11y.carouselPrev.en],
			['proof-next', 'next', siteLabels.a11y.carouselNext.en],
		] as const) {
			const control = screen.getByTestId(id);
			expect(control).toHaveTextContent(/^$/);
			expect(control).toHaveAttribute('data-direction', direction);
			expect(control).toHaveAttribute('aria-label', label);
			expect(control).toHaveAttribute('aria-controls', track.id);
		}
		expect(screen.getByTestId('proof-prev')).toBeDisabled();
	});

	it('hides the controls when the cards fit (no overflow)', () => {
		render(FeaturedProjects, { props: renderProps });
		// happy-dom lays nothing out, so nothing overflows.
		expect(screen.getByTestId('proof-controls')).not.toBeVisible();
	});

	it('announces nothing on load', () => {
		render(FeaturedProjects, { props: renderProps });
		const region = screen.getByTestId('proof-announcement');
		expect(region).toHaveAttribute('aria-live', 'polite');
		expect(region).toHaveTextContent(/^$/);
	});
});

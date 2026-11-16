import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { ProjectSummary, ProjectsPageContent } from '#lib/types.ts';
import { persisted } from '@yesid/ui/state';
import { projectFactory } from '../../../tests/factories';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/projects') },
}));
vi.mock('@yesid/motion/utils/blueprintScrub', () => ({ blueprintScrub: () => undefined }));
vi.mock('#lib/motion/utils/flip.ts', () => ({
	captureFlipState: () => null,
	animateFlipTransition: () => undefined,
}));

import ProjectListingPage from './ProjectListingPage.svelte';

const projectsPage: ProjectsPageContent = {
	heading: { en: 'Projects', fr: 'Projets', es: 'Proyectos' },
	intro: { en: 'Selected work', fr: 'Travaux choisis', es: 'Trabajo elegido' },
	emptyState: { en: 'No projects.', fr: 'Aucun projet.', es: 'Sin proyectos.' },
	emptyStateNoPosts: { en: 'No projects are published yet.', fr: "Aucun projet n'est encore publié.", es: 'Todavía no hay proyectos publicados.' },
};

const renderListing = (projects: readonly ProjectSummary[]) =>
	render(ProjectListingPage, {
		props: {
			projects,
			serviceIds: [],
			services: [],
			serviceSvgContents: {},
			projectsPage,
		},
	});

afterEach(() => {
	cleanup();
	persisted('projects-q', '').value = '';
});

describe('ProjectListingPage cards', () => {
	it('shows each project card without a station number, pulsing dot or vertical line', () => {
		const projects = [
			projectFactory.build({ slug: 'first-project' }),
			projectFactory.build({ slug: 'second-project' }),
		];

		const { container } = renderListing(projects);

		expect(screen.getAllByTestId('project-card')).toHaveLength(2);
		expect(container.querySelector('[data-slot="metro-station"]')).toBeNull();
		expect(container.querySelector('[data-slot="metro-station-pulse"]')).toBeNull();
		expect(container.querySelector('[data-metro-line]')).toBeNull();
		expect(screen.queryByText('01')).toBeNull();
		expect(screen.queryByText('02')).toBeNull();
	});

	it('keeps the global click ripple off the project cards', () => {
		renderListing([projectFactory.build({ slug: 'first-project' })]);

		expect(screen.getByTestId('project-card').closest('[data-ripple-exempt]')).not.toBeNull();
	});

	it('shows no whole-card link: Case study, Website and Repo are separate, named links', () => {
		const project = projectFactory.build({
			slug: 'transit-data-pipeline',
			liveUrl: 'https://client.example',
			repoUrl: 'https://github.com/yesid-dev/transit',
		});
		renderListing([project]);

		const card = screen.getByTestId('project-card');
		expect(card.closest('a')).toBeNull();
		expect(card.querySelector('[data-testid="project-card-link"]')).toBeNull();

		const title = screen.getByTestId('project-card-title').textContent!.trim();
		const caseStudy = within(card).getByTestId('project-card-case-study');
		const website = within(card).getByTestId('project-card-website');
		const repo = within(card).getByTestId('project-card-repo');

		expect(caseStudy).toHaveAttribute('href', '/projects/transit-data-pipeline');
		expect(caseStudy).toHaveAccessibleName(`${title} case study`);
		expect(website).toHaveAttribute('href', 'https://client.example');
		expect(website).toHaveAttribute('target', '_blank');
		expect(website).toHaveAccessibleName(`${title} website (opens in a new tab)`);
		expect(repo).toHaveAttribute('href', 'https://github.com/yesid-dev/transit');
		expect(repo).toHaveAccessibleName(`${title} repo (opens in a new tab)`);
		expect(caseStudy.compareDocumentPosition(website) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(website.compareDocumentPosition(repo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('keeps the service list named for assistive technology without a SERVICES eyebrow', () => {
		const project = projectFactory.build({ relatedServices: ['service-a'] });
		const service = { id: 'service-a', title: { en: 'Automation', fr: 'Automatisation', es: 'Automatización' } } as never;
		render(ProjectListingPage, {
			props: {
				projects: [project],
				serviceIds: ['service-a'],
				services: [service],
				serviceSvgContents: {},
				projectsPage,
			},
		});

		const list = screen.getByTestId('project-card-services');
		expect(list.tagName).toBe('UL');
		expect(list).toHaveAttribute('aria-label', 'Services');
		expect(screen.queryByText('SERVICES')).toBeNull();
	});

	it('uses the kit consistent style for a chosen filter', () => {
		const { container } = renderListing([projectFactory.build()]);
		expect(container.querySelectorAll('[data-selected-style="consistent"]').length).toBeGreaterThan(0);
	});
});

describe('ProjectListingPage empty states and focus', () => {
	it('says nothing is published when there are no projects', () => {
		renderListing([]);
		expect(screen.getByText('No projects are published yet.')).toBeInTheDocument();
		expect(screen.queryByText('No projects.')).toBeNull();
	});

	it('says the filters matched nothing when projects exist', async () => {
		renderListing([projectFactory.build({ title: { en: 'Transit', fr: 'Transit', es: 'Transit' } })]);
		await fireEvent.input(screen.getByTestId('project-search-sidebar'), {
			target: { value: 'zzzz-no-match' },
		});
		await tick();

		expect(screen.getByText('No projects.')).toBeInTheDocument();
		expect(screen.queryByText('No projects are published yet.')).toBeNull();
	});

	it('announces the result count in a polite status', async () => {
		const { container } = renderListing([projectFactory.build()]);
		const status = container.querySelector('[data-slot="listing-result-status"]');
		expect(status).toHaveAttribute('role', 'status');
		expect(status?.textContent).toMatch(/1 result$/);
	});

	it('returns focus to the search field after clear filters', async () => {
		renderListing([projectFactory.build({ title: { en: 'Transit', fr: 'Transit', es: 'Transit' } })]);
		const search = screen.getByTestId('project-search-sidebar');
		await fireEvent.input(search, { target: { value: 'zzzz-no-match' } });
		await tick();

		await fireEvent.click(screen.getByRole('button', { name: 'clear filters' }));
		await tick();

		expect(search).toHaveFocus();
	});
});

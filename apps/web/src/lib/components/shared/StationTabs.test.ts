import { siteLabels } from '#lib/content/site-labels.ts';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import StationTabs from './StationTabs.svelte';
import { serviceFactory } from '../../../tests/factories';

// GO-2: fixtures mirror the 4 post-consolidation stations.
// Station numbers intentionally out of order to verify the component sorts.
const mockServices = [
	serviceFactory.build({ id: 'analytics-reporting',  title: { en: 'Dashboards & Analytics' },  description: { en: '' }, station: 3, visible: true }),
	serviceFactory.build({ id: 'database-engineering', title: { en: 'Databases & SQL' },         description: { en: '' }, station: 1, visible: true }),
	serviceFactory.build({ id: 'data-pipeline',        title: { en: 'Pipelines & Automation' },  description: { en: '' }, station: 2, visible: true }),
	serviceFactory.build({ id: 'web-development',      title: { en: 'Websites & E-commerce' },   description: { en: '' }, station: 4, visible: true }),
];

describe('StationTabs', () => {
	it('renders the 4 station short labels', () => {
		render(StationTabs, { props: { services: mockServices, activeId: 'database-engineering' } });
		for (const service of mockServices) {
			const label = siteLabels.servicesChrome.listing.stationShortLabels[service.id as keyof typeof siteLabels.servicesChrome.listing.stationShortLabels].en;
			expect(screen.getByTestId('station-tab-' + service.id)).toHaveTextContent(label);
		}
	});

	it('draws no station numbers and no hazard tape (owner, D-M5)', () => {
		const { container } = render(StationTabs, { props: { services: mockServices, activeId: 'database-engineering' } });
		expect(container.textContent).not.toMatch(/0[1-4]/);
		expect(container.querySelector('[data-slot="separator"]')).toBeNull();
	});

	it('orders stations by the CMS order value', () => {
		render(StationTabs, { props: { services: mockServices, activeId: 'data-pipeline' } });
		expect(screen.getAllByRole('link').map((link) => link.dataset.testid)).toEqual([
			'station-tab-database-engineering',
			'station-tab-data-pipeline',
			'station-tab-analytics-reporting',
			'station-tab-web-development',
		]);
	});

	it('falls back to the full service title for an id missing from the CMS short-labels', () => {
		const unknown = [
			serviceFactory.build({ id: 'mystery-service', title: { en: 'Mystery Offering' }, description: { en: '' }, station: 1, visible: true }),
		];
		render(StationTabs, { props: { services: unknown, activeId: 'mystery-service' } });
		expect(screen.getByText('Mystery Offering')).toBeTruthy();
	});

	it('on Services, is a named list of in-page links with the station in view marked current', () => {
		render(StationTabs, { props: { services: mockServices, activeId: 'data-pipeline' } });
		const nav = screen.getByRole('navigation', { name: 'Services on this page' });
		expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
		expect(screen.queryAllByRole('tab')).toEqual([]);
		const active = screen.getByTestId('station-tab-data-pipeline');
		expect(active).toHaveAttribute('href', '#service-data-pipeline');
		expect(active).toHaveAttribute('aria-current', 'true');
		expect(active).toHaveAttribute('data-state', 'active');
		for (const id of ['database-engineering', 'analytics-reporting', 'web-development']) {
			expect(screen.getByTestId(`station-tab-${id}`)).not.toHaveAttribute('aria-current');
			expect(screen.getByTestId(`station-tab-${id}`)).not.toHaveAttribute('data-state');
		}
	});

	it('on Services, a station click selects it without following the fragment', async () => {
		const selected: string[] = [];
		render(StationTabs, { props: { services: mockServices, activeId: 'database-engineering', onSelect: (id: string) => selected.push(id) } });
		const link = screen.getByTestId('station-tab-web-development');
		const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
		link.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(selected).toEqual(['web-development']);
	});

	it('renders links in navigate mode', () => {
		render(StationTabs, { props: { services: mockServices, activeId: 'database-engineering', mode: 'navigate' } });
		const link = screen.getByTestId('station-tab-data-pipeline');
		expect(link.closest('a')?.getAttribute('href')).toBe('/services/data-pipeline');
		expect(screen.getByTestId('station-tab-database-engineering')).toHaveAttribute('aria-current', 'page');
		expect(link).not.toHaveAttribute('aria-current');
		expect(screen.getByRole('navigation', { name: siteLabels.servicesChrome.detail.serviceNavAria.en })).toBeInTheDocument();
	});

	it('draws its orange band up behind the header pill in signage colours', () => {
		render(StationTabs, { props: { services: mockServices, activeId: 'data-pipeline', mode: 'navigate' } });
		const strip = screen.getByTestId('station-strip');
		expect(strip.querySelector('.station-tabs')).toBeTruthy();
		expect(strip.dataset.mode).toBe('navigate');
	});
});

describe('StationTabs — locale-resolved fallback label (slice-28.6)', () => {
	it('falls back to the locale-resolved full title when an id has no CMS short-label (no provider → en)', () => {
		const service = serviceFactory.build({
			id: 'new-service',
			title: { en: 'Brand Engineering Stuff', fr: 'Ingénierie de marque' },
			description: { en: '' },
			station: 1,
			visible: true,
		});
		render(StationTabs, { props: { services: [service], activeId: 'new-service', mode: 'navigate' } });
		// no provider → locale 'en' → full EN title (CMS short-labels only cover the 4 real services)
		expect(screen.getByText('Brand Engineering Stuff')).toBeInTheDocument();
		expect(screen.queryByText('Ingénierie de marque')).toBeNull();
	});
});

import { siteLabels } from '#lib/content/site-labels.ts';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ServiceCard from './ServiceCard.svelte';
import { serviceFactory } from '../../../tests/factories';

// L1 factory + overrides for the optional detail-page fields the component renders.
const mockService = serviceFactory.build({
	id: 'sql-development',
	title: { en: 'SQL Development & Optimization' },
	subtitle: { en: '& Optimization' },
	description: { en: 'Write, refactor, and tune SQL queries across PostgreSQL and SQL Server.' },
	station: 1,
	relatedProjects: [],
	stack: ['PostgreSQL', 'SQL Server', 'T-SQL'],
	svg: 'service-sql.svg',
	visible: true,
	benefitHeadline: { en: 'Queries that run in seconds, not minutes' },
	impactMetric: { value: { en: '3x' }, label: { en: 'faster avg query' } },
});

describe('ServiceCard', () => {
	it('shows only the metric value and label even when proof is supplied', () => {
		render(ServiceCard, { service: { ...mockService, impactMetric: { ...mockService.impactMetric!, sourceUrl: 'https://example.org/evidence', asOf: '2026-11-04' } }, svgContent: '' });
		expect(screen.getByText('3x')).toBeTruthy();
		expect(screen.getByText('faster avg query')).toBeTruthy();
		expect(screen.queryByTestId('metric-proof')).toBeNull();
		expect(screen.queryByRole('link', { name: 'Source: faster avg query' })).toBeNull();
		expect(screen.queryByText('As of November 4, 2026')).toBeNull();
	});
	it('renders the service title with dot', () => {
		render(ServiceCard, {
			props: { service: mockService, svgContent: '' }
		});
		expect(screen.getByText('SQL Development & Optimization')).toBeTruthy();
	});

	it('renders the benefit headline', () => {
		render(ServiceCard, {
			props: { service: mockService, svgContent: '' }
		});
		expect(screen.getByText('Queries that run in seconds, not minutes')).toBeTruthy();
	});

	it('renders the impact metric value', () => {
		render(ServiceCard, {
			props: { service: mockService, svgContent: '' }
		});
		expect(screen.getByText('3x')).toBeTruthy();
	});

	it('draws no station counter above the title (owner, D-M5)', () => {
		const { container } = render(ServiceCard, { props: { service: mockService, svgContent: '' } });
		expect(container.textContent).not.toMatch(/Service\s*\d+\s*\/\s*\d+/i);
		expect(container.querySelector('.label-station')).toBeNull();
	});

	it('renders one "Deep dive" link to the service, named with the service', () => {
		render(ServiceCard, { props: { service: mockService, svgContent: '' } });
		const label = siteLabels.servicesChrome.listing.deepDiveLabel.en;
		const links = screen.getAllByRole('link');
		expect(links).toHaveLength(1);
		expect(links[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(`${label}: SQL Development & Optimization`);
		expect(links[0].getAttribute('href')).toBe('/services/sql-development');
	});

	it('is an interactive card whose body follows "Deep dive", while the drawing keeps its own tap', async () => {
		render(ServiceCard, { props: { service: mockService, svgContent: '<svg><circle r="10"/></svg>' } });
		const card = screen.getByTestId('service-card-sql-development').querySelector('[data-slot="card"]')!;
		expect(card).toHaveAttribute('data-interactive', 'true');
		const link = screen.getByRole('link');
		const followed: string[] = [];
		link.addEventListener('click', (event) => {
			event.preventDefault();
			followed.push('deep-dive');
		});
		await fireEvent.click(screen.getByText('Queries that run in seconds, not minutes'));
		expect(followed).toEqual(['deep-dive']);
		// The card's own padding and edge: the target is the card itself, outside its inner layout.
		await fireEvent.click(card);
		expect(followed, 'a click on the outer card padding follows "Deep dive" too').toEqual(['deep-dive', 'deep-dive']);
		for (const panel of screen.getAllByTestId('service-svg-panel')) await fireEvent.click(panel);
		expect(followed, 'a tap on the drawing morphs it and never navigates').toEqual(['deep-dive', 'deep-dive']);
	});

	it('shows the metric value unchanged and its label in sentence case', () => {
		render(ServiceCard, { props: { service: mockService, svgContent: '' } });
		const metric = screen.getByTestId('service-metric');
		expect(metric).toHaveTextContent('3x');
		expect(metric.querySelector('.metric-label')).toHaveTextContent('faster avg query');
	});

	it('renders ServiceSvgPanel when svgContent is provided', () => {
		render(ServiceCard, {
			props: {
				service: mockService,
				svgContent: '<svg><circle r="10"/></svg>'
			}
		});
		const panels = screen.getAllByTestId('service-svg-panel');
		expect(panels.length).toBeGreaterThanOrEqual(1);
	});

	it('renders with data-testid', () => {
		render(ServiceCard, {
			props: { service: mockService, svgContent: '' }
		});
		expect(screen.getByTestId('service-card-sql-development')).toBeTruthy();
	});
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import HomeServices from './HomeServices.svelte';

import { servicesGridContent } from '#lib/content/site-content.ts';
import { getVisibleServices } from '#lib/catalog/index.ts';
import { serviceFactory } from '../../../tests/factories';

const services = getVisibleServices();

describe('HomeServices', () => {
	it('renders the section with correct testid', () => {
		render(HomeServices, { props: { servicesGrid: servicesGridContent, services } });
		expect(screen.getByTestId('services-section')).toBeInTheDocument();
	});

	it('renders view-all link to /services', () => {
		render(HomeServices, { props: { servicesGrid: servicesGridContent, services } });
		const container = screen.getByTestId('services-viewall');
		expect(container).toBeInTheDocument();
		const anchor = container.querySelector('a');
		expect(anchor?.getAttribute('href')).toBe('/services');
		expect(anchor?.textContent).toContain('View all services');
	});

	it('renders shared cards with descriptions, h3 headings and server-supplied drawings without fetching', () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const service = serviceFactory.build({ id: 'shared', title: { en: 'Shared service' }, description: { en: 'Full description' }, station: 1, visible: true });
		render(HomeServices, { servicesGrid: servicesGridContent, services: [service], serviceSvgContents: { shared: '<svg><circle r="10"/></svg>' } });
		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Shared service');
		expect(screen.getByText('Full description')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Deep dive/ })).toHaveAttribute('href', '/services/shared');
		expect(screen.getAllByTestId('service-svg-panel')).toHaveLength(2);
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('go2/w4: hover glow unwired — pointermove writes NO --glow vars on the section', () => {

		const realMatchMedia = window.matchMedia;
		window.matchMedia = vi.fn().mockImplementation((q: string) => ({
			matches: true,
			media: q,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})) as unknown as typeof window.matchMedia;

		render(HomeServices, { props: { servicesGrid: servicesGridContent, services } });
		const section = screen.getByTestId('services-section');
		Object.defineProperty(section, 'getBoundingClientRect', {
			value: () => ({
				left: 0, top: 0, width: 200, height: 100,
				right: 200, bottom: 100, x: 0, y: 0, toJSON: () => '',
			}),
		});
		section.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 50 }));
		expect(section.style.getPropertyValue('--glow-x')).toBe('');
		expect(section.style.getPropertyValue('--glow-opacity')).toBe('');

		window.matchMedia = realMatchMedia;
	});
});

describe('HomeServices station ordering (GO-2)', () => {
	it('renders cards in station order even when the services prop arrives shuffled', () => {
		const shuffled = [
			serviceFactory.build({ id: 'svc-c', title: { en: 'C' }, station: 3, visible: true }),
			serviceFactory.build({ id: 'svc-a', title: { en: 'A' }, station: 1, visible: true }),
			serviceFactory.build({ id: 'svc-b', title: { en: 'B' }, station: 2, visible: true }),
		];
		render(HomeServices, { props: { servicesGrid: servicesGridContent, services: shuffled } });
		const cards = screen.getAllByRole('link', { name: /Deep dive/ });
		expect(cards.map((c) => c.getAttribute('href'))).toEqual([
			'/services/svc-a',
			'/services/svc-b',
			'/services/svc-c',
		]);
	});
});

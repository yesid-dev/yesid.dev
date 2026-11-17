import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import ServiceDetailPage from './ServiceDetailPage.svelte';
import { projectFactory, serviceFactory } from '../../../tests/factories';

const text = (en: string) => ({ en });

const service = serviceFactory.build({
	id: 'data-pipeline',
	station: 2,
	title: text('Automation & AI'),
	description: text('Business processes that run themselves.'),
	valueProposition: text('Next stop: your work moves on its own. Right now someone copies data by hand.'),
	deliverables: [text('Data moved automatically')],
	sections: [
		{ title: text('Is this you?'), content: text('- Approvals get lost\nIf that sounds familiar, this is the work I do.') },
		{ title: text('My approach'), content: text('Boring and reliable on purpose.') },
	],
	stack: ['Python'],
	relatedProjects: ['transit'],
	impactMetric: { value: text('118'), label: text('checks/day') },
});
const other = serviceFactory.build({ id: 'web-development', station: 1, title: text('Websites & E-commerce') });

function renderPage() {
	return render(ServiceDetailPage, {
		props: {
			service,
			services: [other, service],
			prev: other,
			relatedProjects: [projectFactory.build({ slug: 'transit', title: text('Transit') })],
			serviceSvgContents: { 'data-pipeline': '<svg><circle r="10"/></svg>' },
		},
	});
}

describe('ServiceDetailPage composition (D-M5)', () => {
	it('opens the story with "Is this you?" in a card that never folds', () => {
		const { container } = renderPage();
		const anchors = [...container.querySelectorAll('.sections.article-body [data-toc]')].map((el) => el.getAttribute('data-toc'));
		expect(anchors).toEqual(['svc-section-0', 'svc-valueprop', 'svc-deliverables', 'svc-section-1']);
		const fit = container.querySelector('[data-toc="svc-section-0"]')!;
		expect(fit.querySelector('[aria-expanded]')).toBeNull();
		expect(fit).toHaveTextContent('Is this you?');
	});

	it('keeps the first sentence of "How this helps you" outside its folding body', () => {
		const { container } = renderPage();
		const card = container.querySelector('[data-toc="svc-valueprop"]')!;
		const lead = card.querySelector('.section-lead')!;
		expect(lead).toHaveTextContent('Next stop: your work moves on its own.');
		expect(lead.closest('[data-slot="collapsible-content"]')).toBeNull();
		expect(card.querySelector('[data-slot="collapsible-content"]')).toHaveTextContent('Right now someone copies data by hand.');
	});

	it('draws no service counter, no number badges and no contents counter or floating pill', () => {
		const { container } = renderPage();
		expect(container.textContent).not.toMatch(/Service\s*\d+\s*\/\s*\d+/i);
		expect(container.textContent).not.toMatch(/SEC\s*\d+\s*\/\s*\d+/);
		expect(container.querySelector('[data-slot="badge"]')).toBeNull();
		expect(screen.queryByTestId('toc-pill')).toBeNull();
	});

	it('titles the page at reading size with the current station marked', () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Automation & AI.');
		expect(screen.getByTestId('station-tab-data-pipeline')).toHaveAttribute('aria-current', 'page');
		expect(screen.getByTestId('station-strip').dataset.mode).toBe('navigate');
	});

	it('keeps "click me" beside the drawing and the metric in reading ink', () => {
		const { container } = renderPage();
		expect(container.querySelector('.svg-desktop [data-testid="hero-dot-annotation"]')).toBeTruthy();
		expect(container.querySelector('.svg-mobile [data-testid="hero-dot-annotation"]')).toBeTruthy();
		expect(container.querySelector('.impact-value')).toHaveTextContent('118');
		expect(container.querySelector('.impact-label')).toHaveTextContent('checks/day');
	});

	it('keeps the adjacent-service navigation separate from the station strip, without a divider', () => {
		renderPage();
		const nav = screen.getByRole('navigation', { name: 'Other services' });
		expect(nav).toContainElement(screen.getByTestId('service-nav-prev'));
		expect(within(nav).queryByTestId('content-divider')).toBeNull();
	});

	it('ends every section with the divider except the closing band, so none sits before the footer', () => {
		renderPage();
		const sections = [...document.querySelectorAll('[data-slot="page-section"]')];
		expect(sections).toHaveLength(3);
		const band = screen.getByTestId('service-cta');
		expect(sections.at(-1)).toBe(band);
		expect(band).toHaveAttribute('data-register', 'expressive');
		const dividers = [...document.querySelectorAll('[data-slot="page-section-boundary"]')];
		expect(dividers).toHaveLength(2);
		expect(dividers.map((divider) => divider.nextElementSibling)).toEqual(sections.slice(1));
		expect(band.nextElementSibling).toBeNull();
		expect(screen.getByTestId('service-detail-page')).toHaveAttribute('data-register', 'reading');
	});
});

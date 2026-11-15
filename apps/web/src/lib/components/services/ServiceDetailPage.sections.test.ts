import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import ServiceDetailPage from './ServiceDetailPage.svelte';
import { serviceFactory } from '../../../tests/factories';

const text = (en: string) => ({ en });

describe('ServiceDetailPage sections', () => {
	it('renders dash lines as a bulleted list and other lines as paragraphs', () => {
		const service = serviceFactory.build({
			id: 'web-work',
			station: 1,
			title: text('Web Work'),
			description: text('Sites.'),
			sections: [
				{
					title: text('Is this you?'),
					content: text('- Your site loads slowly\n- Customers cannot find you\nThat is the gap I close.'),
				},
			],
		});

		const { container } = render(ServiceDetailPage, {
			props: { service, services: [service], relatedProjects: [], serviceSvgContents: {} },
		});

		// The station strip is a list too; read the section's own list.
		const section = container.querySelector<HTMLElement>('[data-toc="svc-section-0"]')!;
		const items = within(section).getAllByRole('listitem');
		expect(items.map((li) => li.textContent?.trim())).toEqual([
			'Your site loads slowly',
			'Customers cannot find you',
		]);
		expect(screen.getByText('That is the gap I close.').tagName).toBe('P');
	});
});

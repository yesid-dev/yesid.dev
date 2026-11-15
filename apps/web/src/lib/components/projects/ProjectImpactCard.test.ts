import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { projectFactory } from '../../../tests/factories';
import ProjectImpactCard from './ProjectImpactCard.svelte';

describe('ProjectImpactCard', () => {
	it('preserves metric values while omitting supplied source and date proof', () => {
		const project = projectFactory.build({ impactMetrics: [
			{ value: { en: '30 s' }, label: { en: 'synthetic cited claim' }, sourceUrl: 'https://example.org/evidence', asOf: '2026-11-04' },
			{ value: { en: '0' }, label: { en: 'synthetic uncited claim' } },
		] });
		render(ProjectImpactCard, { project });
		expect(screen.getByText('30 s')).toBeTruthy();
		expect(screen.getByText('0')).toBeTruthy();
		expect(screen.queryByTestId('metric-proof')).toBeNull();
		expect(screen.queryByRole('link', { name: 'Source: synthetic cited claim' })).toBeNull();
		expect(screen.queryByText('As of November 4, 2026')).toBeNull();
	});

	it('preserves the figure and label with the kit reading tone (D-M2 answer 4A)', () => {
		const project = projectFactory.build({ impactMetrics: [{ value: { en: '20 s' }, label: { en: 'live refresh' } }] });
		render(ProjectImpactCard, { project });
		const value = screen.getByText('20 s');
		expect(value).toHaveClass('metric-value', 'text-foreground');
		expect(value).not.toHaveClass('text-accent-text');
		const label = screen.getByText('live refresh');
		expect(label).toBeVisible();

	});
});

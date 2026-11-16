import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BlogFilterSidebar from './BlogFilterSidebar.svelte';

describe('blog date disclosure', () => {
	it('exposes its state and makes closed date fields inert without losing their values', async () => {
		render(BlogFilterSidebar, { props: {
			tags: [], activeTag: null,
			onTagSelect: vi.fn(), dateFrom: '2026-01-01',
		} });
		const toggle = screen.getByRole('button', { name: /date range/i });
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		const panel = document.getElementById(toggle.getAttribute('aria-controls')!);
		expect(panel).not.toBeNull();
		expect(panel).not.toHaveAttribute('inert');
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(panel).toHaveAttribute('inert');
		await fireEvent.click(toggle);
		expect(panel).not.toHaveAttribute('inert');
		expect(screen.getByLabelText(/^from$/i)).toHaveValue('2026-01-01');
	});

	it('keeps the date fields at 16px with the visible input border and no suppressed focus outline', () => {
		render(BlogFilterSidebar, { props: {
			tags: [], activeTag: null, onTagSelect: vi.fn(),
		} });
		for (const label of [/^from$/i, /^to$/i]) {
			const field = screen.getByLabelText(label);
			expect(field.className).toContain('text-base');
			expect(field.className).toContain('border-[var(--input)]');
			expect(field.className).not.toContain('outline-none');
		}
	});

	it('has no one-choice Language filter', () => {
		render(BlogFilterSidebar, { props: {
			tags: ['sql'], activeTag: null, onTagSelect: vi.fn(),
		} });
		expect(screen.queryByText(/^(Language|Langue|Idioma)$/i)).toBeNull();
	});

	it('fills a chosen tag orange through the kit consistent selection style', () => {
		const { container } = render(BlogFilterSidebar, { props: {
			tags: ['sql'], activeTag: 'sql', onTagSelect: vi.fn(),
		} });
		const chosen = container.querySelector('[data-selected-style="consistent"][aria-checked="true"]');
		expect(chosen).not.toBeNull();
		expect(chosen?.textContent?.trim()).toBe('sql');
	});
});

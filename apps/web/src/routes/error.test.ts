import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ErrorPage from './+error.svelte';

// The route reads its status from SvelteKit's page state; each test sets the status it renders.
const state = vi.hoisted(() => ({ page: { status: 404 } as { status: number } }));
vi.mock('$app/state', () => state);

beforeEach(() => {
	state.page.status = 404;
});

describe('404 Error Page', () => {
	it('renders the construction scene', () => {
		render(ErrorPage);
		expect(screen.getByTestId('construction-scene')).toBeInTheDocument();
	});

	it('renders an error-page label', () => {

		render(ErrorPage);
		// Look for the structural element rather than specific copy.
		expect(screen.getByTestId('error-label')).toBeInTheDocument();
	});

	it('renders a heading', () => {

		render(ErrorPage);
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});

	it('renders route suggestion links with non-empty hrefs', () => {

		render(ErrorPage);
		const suggestionLinks = screen.getAllByTestId('error-suggestion-link');
		expect(suggestionLinks.length).toBeGreaterThanOrEqual(1);
		for (const link of suggestionLinks) {
			const href = link.getAttribute('href');
			expect(href).toBeTruthy();
			expect(href).toMatch(/^\//);
		}
	});

	it('renders the terminal status line', () => {
		render(ErrorPage);
		expect(screen.getByTestId('terminal-line')).toBeInTheDocument();
	});

	it('leaves the route note off a server error, which shows its number on the sign instead', () => {
		state.page.status = 500;
		render(ErrorPage);
		expect(screen.queryByTestId('terminal-line')).toBeNull();
		expect(screen.getByTestId('construction-scene').textContent).toContain('500');
	});

	it('renders exactly ONE hazard tape (top) — the footer platform edge owns the bottom seam', () => {

		render(ErrorPage);
		const tapes = screen.getAllByTestId('hazard-tape');
		expect(tapes.length).toBe(1);
	});
});

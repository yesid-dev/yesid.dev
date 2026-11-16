import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { BlogPost } from '#lib/types.ts';
import { persisted } from '@yesid/ui/state';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/blog') },
}));
vi.mock('@yesid/motion/utils/blueprintScrub', () => ({ blueprintScrub: () => undefined }));
vi.mock('#lib/motion/utils/flip.ts', () => ({
	captureFlipState: () => null,
	animateFlipTransition: () => undefined,
}));

import BlogListingPage from './BlogListingPage.svelte';

const englishPost: BlogPost = {
	translationKey: 'article',
	slug: 'article-en',
	title: 'English article',
	excerpt: 'English excerpt',
	date: '2026-07-11',
	lang: 'en',
	category: 'professional',
	tags: ['test'],
	animation: 'draw',
	svg: '/images/blog/article.svg',
	url: '/blog/article-en',
	external: false,
};

const baseProps = {
	allTags: ['test'],
	heading: 'Blog',
	subtitle: 'Notes',
	emptyState: 'No posts match.',
	emptyStateNoPosts: 'No posts yet.',
};

beforeEach(() => {
	persisted('blog-q', '').value = '';
	persisted('blog-from', '').value = '';
	persisted('blog-to', '').value = '';
});

afterEach(() => cleanup());

describe('BlogListingPage rows', () => {
	it('shows each post card without a station number, pulsing dot or vertical line', () => {
		const { container } = render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});

		expect(screen.getByText('English article')).toBeInTheDocument();
		expect(container.querySelector('[data-slot="metro-station"]')).toBeNull();
		expect(container.querySelector('[data-slot="metro-station-pulse"]')).toBeNull();
		expect(container.querySelector('[data-metro-line]')).toBeNull();
		expect(screen.queryByText('01')).toBeNull();
	});

	it('keeps the global click ripple off the post rows', () => {
		render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});

		expect(screen.getByText('English article').closest('[data-ripple-exempt]')).not.toBeNull();
	});

	it('has no one-choice language filter and no language chip', () => {
		render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});

		const sidebar = screen.getByTestId('blog-filter-sidebar');
		expect(sidebar.textContent).not.toMatch(/Language|Langue|Idioma/i);
		expect(screen.queryByTestId('blog-lang-chip')).toBeNull();
	});
});

describe('BlogListingPage empty states and announcements', () => {
	it('says nothing is published when the list has no posts, even with a filter set', async () => {
		render(BlogListingPage, {
			props: { ...baseProps, posts: [] },
		});

		expect(screen.getByText('No posts yet.')).toBeInTheDocument();
		expect(screen.queryByText('No posts match.')).toBeNull();
	});

	it('says the filters matched nothing when posts exist', async () => {
		render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});
		await fireEvent.input(screen.getByTestId('blog-search-sidebar'), {
			target: { value: 'zzzz-no-match' },
		});
		await tick();

		expect(screen.getByText('No posts match.')).toBeInTheDocument();
		expect(screen.queryByText('No posts yet.')).toBeNull();
	});

	it('uses the approved French "vous" wording for the match message', async () => {
		render(BlogListingPage, {
			props: {
				...baseProps,
				posts: [englishPost],
				emptyState: "Aucun article trouvé. Essaie d'ajuster tes filtres.",
			},
			context: new Map([[Symbol.for('@yesid/ui/locale'), () => 'fr']]),
		});
		await fireEvent.input(screen.getByTestId('blog-search-sidebar'), {
			target: { value: 'zzzz-no-match' },
		});
		await tick();

		const notice = screen.getByTestId('blog-empty-state');
		expect(notice).toHaveTextContent(/Essayez d.ajuster vos filtres/);
		expect(notice).not.toHaveTextContent(/Essaie d.ajuster tes filtres/);
	});

	it('announces the result count in a polite status', async () => {
		const { container } = render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});
		const status = container.querySelector('[data-slot="listing-result-status"]');
		expect(status).toHaveAttribute('role', 'status');
		expect(status?.textContent).toMatch(/1 result$/);

		await fireEvent.input(screen.getByTestId('blog-search-sidebar'), {
			target: { value: 'zzzz-no-match' },
		});
		await tick();

		await waitFor(() => {
			expect(container.querySelector('[data-slot="listing-result-status"]')?.textContent).toMatch(/0/);
		});
	});

	it('returns focus to the search field after clear filters', async () => {
		render(BlogListingPage, {
			props: { ...baseProps, posts: [englishPost] },
		});
		const search = screen.getByTestId('blog-search-sidebar');
		await fireEvent.input(search, { target: { value: 'zzzz-no-match' } });
		await tick();

		await fireEvent.click(screen.getByRole('button', { name: 'clear filters' }));
		await tick();

		expect(search).toHaveFocus();
	});
});

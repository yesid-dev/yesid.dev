import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import BlogRow from './BlogRow.svelte';
import type { BlogPost } from '#lib/types.ts';

// Minimal BlogPost fixture for testing: only required fields populated
const makePost = (overrides?: Partial<BlogPost>): BlogPost => ({
	translationKey: 'test-post',
	slug: 'test-post',
	title: 'Test Post Title',
	excerpt: 'A short excerpt for testing purposes.',
	date: '2025-01-15',
	lang: 'en',
	category: 'professional',
	tags: ['sql', 'postgres'],
	animation: 'draw',
	svg: '/images/blog/test.svg',
	url: '/blog/test-post',
	external: false,
	...overrides
});

describe('BlogRow', () => {
	it('renders the post title', () => {
		const { getByText } = render(BlogRow, {
			props: { post: makePost() }
		});
		expect(getByText('Test Post Title')).toBeTruthy();
	});

	it('renders without a station number, pulsing dot or vertical line', () => {
		const { container } = render(BlogRow, {
			props: { post: makePost() }
		});
		expect(container.querySelector('[data-slot="metro-station"]')).toBeNull();
		expect(container.querySelector('[data-slot="metro-station-pulse"]')).toBeNull();
		expect(container.querySelector('[data-metro-line]')).toBeNull();
	});

	it('renders tags', () => {
		const { getByText } = render(BlogRow, {
			props: { post: makePost({ tags: ['sql', 'postgres'] }) }
		});
		expect(getByText('sql')).toBeTruthy();
		expect(getByText('postgres')).toBeTruthy();
	});

	it('renders the post date', () => {
		const { getByText } = render(BlogRow, {
			props: { post: makePost({ date: '2025-01-15' }) }
		});
		expect(getByText('2025-01-15')).toBeTruthy();
	});

	it('shows no language chip and includes all visible row text in its accessible name', () => {
		const { getByRole, queryByTestId } = render(BlogRow, {
			props: { post: makePost({ lang: 'en' }) }
		});

		expect(queryByTestId('blog-lang-chip')).toBeNull();

		const row = getByRole('link');
		expect(row).toHaveAccessibleName(
			'Test Post Title 2025-01-15 A short excerpt for testing purposes. sql postgres',
		);
	});

	it('keeps long tags allowed to wrap on a narrow screen', () => {
		const { container } = render(BlogRow, {
			props: { post: makePost({ tags: ['donnees-de-transport-collectif'] }) }
		});
		const tag = container.querySelector('.blog-topic-tag');
		expect(tag?.className).toContain('whitespace-normal');
		expect(tag?.className).toContain('max-w-full');
	});

	it('localizes internal post urls from the post language, independent of the listing context', () => {
		const frContext = () => new Map([[Symbol.for('@yesid/ui/locale'), () => 'fr']]);
		const enPost = render(BlogRow, {
			props: { post: makePost() },
			context: frContext(),
		});
		expect(enPost.container.querySelector('a')?.getAttribute('href')).toBe('/blog/test-post');
		enPost.unmount();

		const frPost = render(BlogRow, {
			props: { post: makePost({ lang: 'fr' }) },
		});
		expect(frPost.container.querySelector('a')?.getAttribute('href')).toBe('/fr/blog/test-post');
		frPost.unmount();

		const esPost = render(BlogRow, {
			props: { post: makePost({ lang: 'es' }) },
		});
		expect(esPost.container.querySelector('a')?.getAttribute('href')).toBe('/es/blog/test-post');
		esPost.unmount();

		const external = render(BlogRow, {
			props: {
				post: makePost({ external: true, url: 'https://medium.com/@x/post' }),
			},
			context: frContext(),
		});
		const links = external.container.querySelectorAll('a[target="_blank"]');
		expect(links[0]?.getAttribute('href')).toBe('https://medium.com/@x/post');
	});
});

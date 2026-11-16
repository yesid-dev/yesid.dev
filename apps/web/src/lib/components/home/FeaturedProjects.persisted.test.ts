// FeaturedProjects: the first card in view is stored with persisted('featured-card'), so it
// survives a remount. The scroll itself needs layout (Playwright covers it); these tests cover
// the position reflecting the stored value.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen, cleanup } from '@testing-library/svelte';
import FeaturedProjects from './FeaturedProjects.svelte';
import { proofReelContent } from '#lib/content/site-content.ts';
import { getFeaturedProjects } from '#lib/catalog/index.ts';
import type { Project } from '#lib/types.ts';
import { persisted } from '@yesid/ui/state';

vi.mock('#lib/directus/assets.ts', () => ({
	asset: (id: string, preset?: string) => `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	buildSrcSet: () => '',
	assetImage: (id: string, preset?: string) => ({
		src: `/test-assets/${id}${preset ? `?key=${preset}` : ''}`,
	}),
}));

const resolvedProjects: readonly Project[] = getFeaturedProjects().filter((project) => project.slug !== 'transit-data-pipeline');
const renderProps = { proofReel: proofReelContent, projects: resolvedProjects };

afterEach(() => cleanup());

describe('FeaturedProjects (remount)', () => {
	it('starts on the first card on a cold mount', () => {
		persisted<number>('featured-card', 0).value = 0;
		render(FeaturedProjects, { props: renderProps });
		flushSync();
		expect(screen.getByTestId('proof-position')).toHaveTextContent(new RegExp(`^1( to 2)? of ${resolvedProjects.length}$`));
	});

	it('keeps the card in view across a remount', () => {
		const restoredIndex = Math.max(0, resolvedProjects.length - 1);
		persisted<number>('featured-card', 0).value = restoredIndex;

		render(FeaturedProjects, { props: renderProps });
		flushSync();
		expect(screen.getByTestId('proof-position')).toHaveTextContent(`${restoredIndex + 1} of ${resolvedProjects.length}`);
	});
});

/**
 * Simple page-block fetchers: blocks whose content is just flat LocalizedString
 * fields composed from translations (no per-locale JSON columns, no nested
 * arrays). Covers /blog (block_blog_page_content) and /projects
 * (block_projects_page_content) listing text.
 *
 * Queries each block_* singleton directly rather than projecting the parent
 * pages M2A tree. These fetchers own the build-time listing-text projections;
 * generated-content verification catches output drift.
 */

import { toLocalizedFields } from '../locale';
import { migrationCopy, migrateLegacyExact } from './copy-migration';
import { fetchBlockSingleton } from './singleton';
import {
	BlogPageContentSchema,
	ProjectsPageContentSchema,
	type BlogPageContent,
	type ProjectsPageContent,
} from '@repo/shared';
import type { FetcherContext } from './types';

interface BlogPageTranslation {
	languages_code: string;
	heading?: string | null;
	intro?: string | null;
	personal_heading?: string | null;
	personal_intro?: string | null;
	empty_state?: string | null;
	empty_state_no_posts?: string | null;
}

interface BlogPageRow {
	id: number;
	translations?: BlogPageTranslation[];
}

export function toBlogPageContent(row: BlogPageRow): BlogPageContent {
	const content: BlogPageContent = toLocalizedFields(row.translations ?? [], [
		'heading', 'intro', ['personalHeading', 'personal_heading'],
		['personalIntro', 'personal_intro'], ['emptyState', 'empty_state'],
		['emptyStateNoPosts', 'empty_state_no_posts'],
	]);
	// DEV-28 G26.1: the listing used to rewrite the French match message in the
	// component. Move the approved vous wording to the data boundary, matching
	// only the captured legacy sentence; any other CMS wording wins.
	content.emptyState = migrateLegacyExact(
		content.emptyState,
		{
			en: 'No posts found. Try adjusting your filters.',
			fr: "Aucun article trouvé. Essaie d'ajuster tes filtres.",
			es: 'No se encontraron artículos. Intenta ajustar tus filtros.',
		},
		{
			en: 'No posts found. Try adjusting your filters.',
			fr: 'Aucun article trouvé. Essayez d’ajuster vos filtres.',
			es: 'No se encontraron artículos. Intenta ajustar tus filtros.',
		},
	);
	return content;
}

export async function fetchBlogPageContent({ client }: FetcherContext): Promise<BlogPageContent> {
	const row = await fetchBlockSingleton<BlogPageRow>(
		client,
		'block_blog_page_content',
		'fetchBlogPageContent/block_blog_page_content',
		['id', { translations: ['*'] }],
	);
	return BlogPageContentSchema.parse(toBlogPageContent(row));
}

interface ProjectsPageTranslation {
	languages_code: string;
	intro?: string | null;
	heading?: string | null;
	empty_state?: string | null;
}

interface ProjectsPageRow {
	id: number;
	translations?: ProjectsPageTranslation[];
}

export function toProjectsPageContent(row: ProjectsPageRow): ProjectsPageContent {
	const translations = row.translations ?? [];
	return {
		...toLocalizedFields(translations, [
			'intro', 'heading', ['emptyState', 'empty_state'],
		]),
		emptyStateNoPosts: migrationCopy(
			translations,
			'block_projects_page_content_translations',
			'empty_state_no_posts',
		),
	};
}

export async function fetchProjectsPageContent({
	client,
}: FetcherContext): Promise<ProjectsPageContent> {
	const row = await fetchBlockSingleton<ProjectsPageRow>(
		client,
		'block_projects_page_content',
		'fetchProjectsPageContent/block_projects_page_content',
		['id', { translations: ['*'] }],
	);
	return ProjectsPageContentSchema.parse(toProjectsPageContent(row));
}

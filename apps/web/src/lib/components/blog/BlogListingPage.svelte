<script lang="ts">
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import { gotoPreservingScroll } from '#lib/utils/navigation-focus.ts';
	import type { BlogPost } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';

	const locale = getLocale();
	import { siteLabels } from '#lib/content/index.ts';
	import { captureFlipState, animateFlipTransition } from '#lib/motion/utils/flip.ts';
	import { blueprintScrub } from '@yesid/motion/utils/blueprintScrub';
	import { tick } from 'svelte';
	import BlogRow from './BlogRow.svelte';
	import BlogFilterSidebar from './BlogFilterSidebar.svelte';
	import BlogBlueprint from './BlogBlueprint.svelte';
	import { filterCountText, FilterSummary, SearchInput } from '@yesid/ui/brand';
	import { ListingFrame } from '@yesid/ui/layout';
	import { StateNotice } from '@yesid/ui/feedback';
	import { persisted } from '@yesid/ui/state';

	let {
		posts,
		allTags,
		heading,
		subtitle,
		emptyState,
		emptyStateNoPosts,
		accentColor = 'var(--primary)',
		cornerLink = null,
		svgContents = {}
	}: {
		posts: readonly BlogPost[];
		allTags: readonly string[];
		heading: string;
		subtitle: string;
		emptyState: string;
		emptyStateNoPosts: string;
		accentColor?: string;
		cornerLink?: { href: string; label: string; subtitle: string } | null;
		svgContents?: Record<string, string>;
	} = $props();

	const listingChrome = siteLabels.blogChrome.listing;
	const mobileFiltersLabel = resolveLocale(listingChrome.filters.filtersLabel, locale);
	const searchPlaceholder = resolveLocale(listingChrome.searchPlaceholder, locale);
	const countLabel = {
		singular: resolveLocale(siteLabels.ui.resultCount.singular, locale),
		plural: resolveLocale(siteLabels.ui.resultCount.plural, locale)
	};
	const clearLabel = resolveLocale(siteLabels.navChrome.shared.clearFiltersLabel, locale);

	// The CMS still carries the earlier "tu" form of the French match message; the owner approved
	// "vous". This bridge goes when blog_page_content.empty_state holds it (CMS follow-up).
	const FR_MATCH_VOUS = 'Aucun article trouvé. Essayez d’ajuster vos filtres.';
	const matchEmptyText = $derived(
		locale === 'fr' && emptyState.includes('Essaie') ? FR_MATCH_VOUS : emptyState
	);

	// Prerendering cannot read query parameters, so the tag filter applies after hydration.
	let activeTag = $derived(browser ? page.url.searchParams.get('tag') : null);
	const searchQuery = persisted('blog-q', '');
	const dateFrom = persisted('blog-from', '');
	const dateTo = persisted('blog-to', '');

	// Apply all filters. The route loader already hands the list only its own locale's posts.
	let filteredPosts = $derived.by(() => {
		let result = [...posts];

		// Tag filter
		if (activeTag) {
			result = result.filter((p) => p.tags.includes(activeTag!));
		}

		// Search filter (title, excerpt, tags)
		if (searchQuery.value.trim()) {
			const q = searchQuery.value.trim().toLowerCase();
			result = result.filter((p) => {
				const title = p.title.toLowerCase();
				const excerpt = p.excerpt.toLowerCase();
				const tags = p.tags.join(' ').toLowerCase();
				return title.includes(q) || excerpt.includes(q) || tags.includes(q);
			});
		}

		// Date range filter
		if (dateFrom.value) {
			result = result.filter((p) => p.date >= dateFrom.value);
		}
		if (dateTo.value) {
			result = result.filter((p) => p.date <= dateTo.value);
		}

		return result;
	});

	function handleTagSelect(tag: string | null) {
		flipState = captureFlipState();
		const url = new URL(page.url.href);
		if (tag) {
			url.searchParams.set('tag', tag);
		} else {
			url.searchParams.delete('tag');
		}
		return gotoPreservingScroll(url.toString(), { replaceState: true });
	}

	async function clearFilters() {
		flipState = captureFlipState();
		searchQuery.value = '';
		dateFrom.value = '';
		dateTo.value = '';
		await handleTagSelect(null);
		// The search field is where "clear filters" returns the visitor (DEV-15).
		await tick();
		searchRef?.focus();
	}

	let searchRef = $state<HTMLInputElement | null>(null);

	let hasActiveFilters = $derived(
		!!activeTag ||
			searchQuery.value.trim() !== '' ||
			dateFrom.value !== '' ||
			dateTo.value !== ''
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let flipState: any = null;

	$effect(() => {
		filteredPosts;
		animateFlipTransition('[data-batch="blog-item"]', flipState, () => {
			flipState = null;
		});
	});

</script>

<!--
  Shared blog listing layout used by BOTH /blog (professional) and /blog/personal.
  Parameterized by category: no category logic inside, just renders what it's given.
  ListingFrame owns the header, search, collapsible filter panel and results column.
-->

<div
	data-testid="blog-listing"
	class="w-full"
	style={accentColor !== 'var(--accent)' ? `--accent: ${accentColor};` : ''}
>
	<ListingFrame clipAtHeader={false} rule="hazard"
		resultCountText={filterCountText(filteredPosts.length, countLabel, locale)}
		{heading}
		edgeTitle={heading}
		{subtitle}
		onHeaderMount={blueprintScrub}
		filterLabel={mobileFiltersLabel}
		rule="hazard"
	>
		{#snippet blueprint()}
			<BlogBlueprint />
		{/snippet}

		{#snippet search()}
			<SearchInput
				label={searchPlaceholder}
				placeholder={searchPlaceholder}
				bind:value={searchQuery.value}
				bind:ref={searchRef}
				textSize="body"
				testId="blog-search-sidebar"
			/>
			{#if cornerLink}
				<!-- Phones show the corner link under the search, clear of the closed panel. -->
				<div class="blog-corner blog-corner--phone">
					<a
						href={localizeHref(cornerLink.href, locale)}
						class="blog-corner__link"
						style="border-color: {cornerLink.href.includes('personal') ? 'var(--accent)' : 'var(--primary)'}; color: {cornerLink.href.includes('personal') ? 'var(--accent)' : 'var(--primary)'};"
					>
						{cornerLink.label}
					</a>
					<p class="blog-corner__sub">{cornerLink.subtitle}</p>
				</div>
			{/if}
		{/snippet}

		{#snippet filters()}
			<BlogFilterSidebar
				tags={allTags}
				activeTag={activeTag}
				onTagSelect={handleTagSelect}
				bind:dateFrom={dateFrom.value}
				bind:dateTo={dateTo.value}
			/>
			{#if cornerLink}
				<!-- Desktop keeps the corner link at the foot of the filter column, as today. -->
				<div class="blog-corner blog-corner--sidebar mt-5 divider-dashed pt-3">
					<a
						href={localizeHref(cornerLink.href, locale)}
						class="blog-corner__link"
						style="border-color: {cornerLink.href.includes('personal') ? 'var(--accent)' : 'var(--primary)'}; color: {cornerLink.href.includes('personal') ? 'var(--accent)' : 'var(--primary)'};"
					>
						{cornerLink.label}
					</a>
					<p class="blog-corner__sub">{cornerLink.subtitle}</p>
				</div>
			{/if}
		{/snippet}

		{#if hasActiveFilters}
			<FilterSummary
				count={filteredPosts.length}
				{countLabel}
				{locale}
				{clearLabel}
				onClear={clearFilters}
			/>
		{/if}

		{#if filteredPosts.length === 0}
			<!-- Two empty states: "your filters matched nothing" vs "this section has
			     no posts at all" (blaming filters that don't exist reads as a bug). -->
			<StateNotice
				role="status"
				title={posts.length === 0 ? emptyStateNoPosts : matchEmptyText}
				data-testid="blog-empty-state"
			/>
		{:else}
			<div class="flex flex-col gap-4" data-ripple-exempt>
				{#each filteredPosts as post (post.slug)}
					<BlogRow
						post={post}
						svgContent={svgContents[post.slug] ?? ''}
						accentColor={accentColor}
						data-flip-id={post.slug}
					/>
				{/each}
			</div>
		{/if}
	</ListingFrame>
</div>

<style>
	.blog-corner--phone {
		display: none;
		margin-top: 0.75rem;
	}

	.blog-corner__link {
		display: flex;
		width: 100%;
		min-height: 44px;
		align-items: center;
		gap: 0.375rem;
		border: 1px solid;
		border-radius: var(--radius-sm);
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}

	.blog-corner__sub {
		margin-top: 0.25rem;
		padding-left: 0.5rem;
		font-size: 0.875rem;
		font-style: italic;
		color: var(--muted-foreground);
	}

	@media (max-width: 1023.98px) {
		.blog-corner--phone {
			display: block;
		}

		.blog-corner--sidebar {
			display: none;
		}
	}
</style>

<!--
  Listing filter panel: date range + tag filters.

  WHY: button groups are delegated to FilterGroup so the active/tag-active styles live in
  one place. Date range stays inline because it is not a button group pattern.
-->
<script lang="ts">
	import { topicLabel } from "#lib/utils/blog-topics.ts";
	import { onMount } from 'svelte';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { ChevronToggle, FilterGroup, FilterSection } from '@yesid/ui/brand';
	import { siteLabels } from '#lib/content/index.ts';

	const listingChrome = siteLabels.blogChrome.listing;
	const labels = listingChrome.filters;
	const allLabel = resolveLocale(labels.allLabel, locale);

	// Date filters toggle independently of content sections.
	let dateOpen = $state(true);
	let dateReady = $state(false);
	const datePanelId = $props.id();
	// SSR exposes the fields, but the JS disclosure cannot accept activation until mounted.
	onMount(() => { dateReady = true; });

	let {
		tags,
		activeTag = null,
		onTagSelect,
		dateFrom = $bindable(''),
		dateTo = $bindable('')
	}: {
		tags: readonly string[];
		activeTag: string | null;
		onTagSelect: (tag: string | null) => void;
		dateFrom?: string;
		dateTo?: string;
	} = $props();
</script>

<aside data-testid="blog-filter-sidebar">
	<!-- Date range: inline, not a FilterGroup, so collapse logic is inline -->
	<FilterSection>
	<button
		type="button"
		disabled={!dateReady}
		aria-expanded={dateOpen}
		aria-controls={datePanelId}
		class="flex min-h-11 w-full items-center justify-between label-section text-sm font-semibold transition-colors hover:text-[var(--foreground)]"
		onclick={() => (dateOpen = !dateOpen)}
	>
		{resolveLocale(labels.dateRange, locale)}
		<ChevronToggle open={dateOpen} size="sm" direction="down" />
	</button>
	<div id={datePanelId} class="date-collapse" class:date-open={dateOpen} inert={!dateOpen}>
		<div class="date-collapse-inner">
			<div class="mt-2 flex flex-col gap-1.5">
				<label class="text-sm text-[var(--muted-foreground)]">
					{resolveLocale(labels.from, locale)}
					<input
						type="date"
						bind:value={dateFrom}
						class="mt-0.5 min-h-11 w-full rounded border border-[var(--input)] bg-background px-2 py-1.5 font-mono text-base text-[var(--foreground)]"
					/>
				</label>
				<label class="text-sm text-[var(--muted-foreground)]">
					{resolveLocale(labels.to, locale)}
					<input
						type="date"
						bind:value={dateTo}
						class="mt-0.5 min-h-11 w-full rounded border border-[var(--input)] bg-background px-2 py-1.5 font-mono text-base text-[var(--foreground)]"
					/>
				</label>
			</div>
		</div>
	</div>
	</FilterSection>

	<!-- Tags filter: closed by default -->
	<FilterSection>
		<FilterGroup
			label={resolveLocale(labels.tags, locale)}
			items={tags.map((tag) => ({ key: tag, label: topicLabel(tag, locale) }))}
			activeKey={activeTag}
			{allLabel}
			allowDeselect={false}
			collapsible={true}
			startOpen={false}
			selectedStyle="consistent"
			onSelect={onTagSelect}
		/>
	</FilterSection>
</aside>

<style>
	/* Smooth collapse/expand for date range section */
	.date-collapse {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--duration-slow) var(--ease-default);
	}
	.date-collapse.date-open {
		grid-template-rows: 1fr;
	}
	.date-collapse-inner {
		overflow: hidden;
		min-height: 0;
	}
</style>

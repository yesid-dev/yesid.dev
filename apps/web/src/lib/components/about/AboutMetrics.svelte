<!--
  Fun facts (owner live QA, DEV-43): four short sentences in reading ink, each figure in bold
  (D-M6: no metric styling on jokes). Keep the original compact card footprint, with four
  quadrants gathering toward the central intersection. Content can grow when text is enlarged.
-->
<script lang="ts">
	import type { AboutMetric } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { Card } from '@yesid/ui/card';
	import AboutCardHeading from './AboutCardHeading.svelte';

	let { metrics, heading }: { metrics: readonly AboutMetric[]; heading: string } = $props();
</script>

<Card class="h-full p-3" data-testid="about-metrics" data-ripple-exempt>
	<div class="metrics-shell relative flex h-full flex-col">
		<AboutCardHeading text={heading} />

		<ul class="metrics-grid" data-testid="about-metrics-quadrants">
			{#each metrics as metric}
				<li class="fact"><b class="fact-figure">{metric.value}</b> {resolveLocale(metric.label, locale)}</li>
			{/each}
		</ul>
	</div>
</Card>

<style>
	.metrics-shell {
		container: about-facts / inline-size;
	}

	/* Retain the original card's spacing. A width-driven square would enlarge its bento row. */
	.metrics-grid {
		display: grid;
		position: relative;
		flex: 1;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: minmax(min-content, 1fr) 1.5rem minmax(min-content, 1fr);
		gap: 0.5rem 1rem;
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
	}

	/* The faint cross through the panel's centre, behind the words (decorative, outside reading order). */
	.metrics-grid::before,
	.metrics-grid::after {
		content: '';
		position: absolute;
		pointer-events: none;
	}

	.metrics-grid::before {
		inset-block: 0;
		inset-inline-start: 50%;
		width: 1px;
		background: linear-gradient(180deg, transparent, var(--border), transparent);
	}

	.metrics-grid::after {
		position: static;
		grid-column: 1 / -1;
		grid-row: 2;
		align-self: center;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--border), transparent);
	}

	.fact {
		min-width: 0;
		font-size: var(--text-body);
		line-height: 1.45;
		color: var(--secondary-foreground);
		overflow-wrap: anywhere;
		word-break: normal;
		hyphens: none;
	}

	/* Each cluster gathers to the corner nearest the intersection. */
	.fact:nth-child(1) { grid-area: 1 / 1; align-self: end; text-align: end; }
	.fact:nth-child(2) { grid-area: 1 / 2; align-self: end; text-align: start; }
	.fact:nth-child(3) { grid-area: 3 / 1; align-self: start; text-align: end; }
	.fact:nth-child(4) { grid-area: 3 / 2; align-self: start; text-align: start; }

	.fact-figure {
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}
</style>

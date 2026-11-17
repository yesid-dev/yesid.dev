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
	const crossStroke = 'M1.5 4.6C60 3.4 120 3.5 190 4.3S310 5.4 400 4.5S520 3 610 3.8S760 5.3 850 4.6S960 3.4 998.5 3.9';
</script>

<Card class="h-full p-3" data-testid="about-metrics" data-ripple-exempt>
	<div class="metrics-shell relative flex h-full flex-col">
		<AboutCardHeading text={heading} />

		<div class="metrics-field">
		<ul class="metrics-grid" data-testid="about-metrics-quadrants">
			{#each metrics as metric}
				<li class="fact"><b class="fact-figure">{metric.value}</b> {resolveLocale(metric.label, locale)}</li>
			{/each}
		</ul>
		<svg class="metrics-cross metrics-cross--horizontal" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
			<path d={crossStroke} fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" vector-effect="non-scaling-stroke" />
		</svg>
		<svg class="metrics-cross metrics-cross--vertical" viewBox="0 0 8 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
			<path d={crossStroke} transform="matrix(0 1 1 0 0 0)" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" vector-effect="non-scaling-stroke" />
		</svg>
		</div>
	</div>
</Card>

<style>
	.metrics-shell {
		container: about-facts / inline-size;
	}

	.metrics-field {
		position: relative;
		display: flex;
		flex: 1;
		margin-top: 0.75rem;
	}

	/* Retain the original card's spacing. A width-driven square would enlarge its bento row. */
	.metrics-grid {
		display: grid;
		position: relative;
		flex: 1;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: minmax(min-content, 1fr) 1.5rem minmax(min-content, 1fr);
		gap: 0.5rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Drawn orange cross stays outside layout and reading order, preserving the compact footprint. */
	.metrics-cross {
		position: absolute;
		pointer-events: none;
		color: var(--primary);
	}

	.metrics-cross--vertical {
		inset-block: 0;
		inset-inline-start: calc(50% - 4px);
		width: 8px;
		height: 100%;
	}

	.metrics-cross--horizontal {
		inset-inline: 0;
		inset-block-start: calc(50% - 4px);
		width: 100%;
		height: 8px;
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

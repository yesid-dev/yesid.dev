<!--
  Fun facts: four short sentences in reading ink, each figure in bold (D-M6: no metric styling
  on jokes). Narrow cards keep the two-by-two corners with their faint cross; roomy cards set
  the four facts in one row. A static card.
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

		<ul class="metrics-grid">
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

	.metrics-grid {
		display: grid;
		position: relative;
		flex: 1;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: 1fr 1.5rem 1fr;
		gap: 0.5rem 1rem;
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
		text-align: left;
	}

	/* The corner rules, as today (decorative, outside the reading order). */
	.metrics-grid::before {
		content: '';
		position: absolute;
		inset-block: 0;
		inset-inline-start: 50%;
		width: 1px;
		background: linear-gradient(180deg, transparent, var(--border), transparent);
	}

	.metrics-grid::after {
		content: '';
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
		overflow-wrap: normal;
		word-break: normal;
		hyphens: none;
	}

	.fact:nth-child(1) { grid-area: 1 / 1; align-self: end; }
	.fact:nth-child(2) { grid-area: 1 / 2; align-self: end; }
	.fact:nth-child(3) { grid-area: 3 / 1; align-self: start; }
	.fact:nth-child(4) { grid-area: 3 / 2; align-self: start; }

	.fact-figure {
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	/* Four facts in a row once the card has room; phones always keep the corners. */
	@media (min-width: 640px) {
		@container about-facts (min-width: 560px) {
			.metrics-grid {
				grid-template-columns: repeat(4, minmax(0, 1fr));
				grid-template-rows: 1fr;
			}

			.fact:nth-child(n) {
				grid-area: auto;
				align-self: center;
			}

			.metrics-grid::before,
			.metrics-grid::after {
				display: none;
			}
		}
	}
</style>

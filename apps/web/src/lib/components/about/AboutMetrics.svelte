<!--
  Fun facts (owner live QA, DEV-43): four short sentences in reading ink, each figure in bold
  (D-M6: no metric styling on jokes), inside a square two-by-two quadrant panel on phones and
  desktops alike. Each value and its words gather toward the panel's central intersection
  (top-left to its bottom-right, top-right to its bottom-left, and mirrored below), with the gap
  and the panel padding as breathing space. A static card.
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

		<div class="facts-frame">
			<div class="facts-square" data-testid="about-metrics-square">
				<ul class="metrics-grid">
					{#each metrics as metric}
						<li class="fact"><b class="fact-figure">{metric.value}</b> {resolveLocale(metric.label, locale)}</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</Card>

<style>
	.metrics-shell {
		container: about-facts / inline-size;
	}

	/* The square panel sits centred in whatever its bento cell gives the card. It takes the card's
	   full inner width and keeps a one-to-one ratio, so the panel itself is square on every width
	   (the cell may be wider or shorter than it). */
	.facts-frame {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		min-block-size: 0;
		margin-block-start: 0.75rem;
	}

	.facts-square {
		inline-size: 100%;
		max-inline-size: 100%;
		aspect-ratio: 1;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.metrics-grid {
		display: grid;
		position: relative;
		block-size: 100%;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: repeat(2, minmax(0, 1fr));
		gap: clamp(0.75rem, 6%, 1.75rem);
		margin: 0;
		padding: clamp(0.5rem, 3.5%, 1rem);
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
		inset-inline: 0;
		inset-block-start: 50%;
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

	/* Each cluster gathers to the corner nearest the intersection. */
	.fact:nth-child(1) { align-self: end; text-align: end; }
	.fact:nth-child(2) { align-self: end; text-align: start; }
	.fact:nth-child(3) { align-self: start; text-align: end; }
	.fact:nth-child(4) { align-self: start; text-align: start; }

	.fact-figure {
		font-weight: 700;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}
</style>

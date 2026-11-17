<!--
  Core beliefs: four ideas, not steps (D-M6): no number badges and no boxes inside the card, a
  thin line above each belief instead, titles in sentence case and reading ink. Two across only
  when the card itself is 400px or wider, so a title never breaks inside a word. A static card.
-->
<script lang="ts">
	import type { AboutMethodStep } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { Card } from '@yesid/ui/card';
	import { Separator } from '@yesid/ui/separator';
	import AboutCardHeading from './AboutCardHeading.svelte';
	import { sentenceCase } from './about-copy.ts';

	let { steps, heading }: { steps: readonly AboutMethodStep[]; heading: string } = $props();
</script>

<Card class="beliefs-card h-full p-3" data-testid="about-method">
	<div class="relative flex flex-col">
		<AboutCardHeading text={heading} />

		<div
			class="mt-3 pr-1"
			data-testid="about-method-scroll"
		>
		<ul class="beliefs">
			{#each steps as step}
				<li class="belief">
					<Separator variant="hand-drawn" class="absolute inset-x-0 -top-[4px]" data-testid="content-divider" />
					<p class="belief-title">{sentenceCase(resolveLocale(step.label, locale), locale)}</p>
					<p class="belief-text">{resolveLocale(step.description, locale)}</p>
				</li>
			{/each}
		</ul>
		</div>
	</div>
</Card>

<style>
	:global(.beliefs-card) {
		container: about-beliefs / inline-size;
	}

	.beliefs {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	@container about-beliefs (min-width: 400px) {
		.beliefs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.belief {
		position: relative;
		min-width: 0;
		padding-top: 0.75rem;
	}

	.belief-title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-body);
		font-weight: 600;
		line-height: 1.3;
		color: var(--foreground);
		overflow-wrap: normal;
		word-break: normal;
		hyphens: none;
	}

	.belief-text {
		margin-top: 0.375rem;
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--secondary-foreground);
	}
</style>

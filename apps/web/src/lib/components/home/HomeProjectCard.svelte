<!--
  A home project card (D-M1, DEV-38), the lighter card the owner chose: the screenshots, the title,
  its one-line result, up to three key facts from the case study's "At a glance", and its own links.
  The card is not a link: it contains them, so it is the kit's interactive card (D21).
-->
<script lang="ts">
	import { Card } from '@yesid/ui/card';
	import type { ProjectSummary } from '#lib/types.ts';
	import type { GlanceFact } from '#lib/utils/glance-facts.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import ProjectHeroPreview from '#lib/components/projects/ProjectHeroPreview.svelte';
	import ProjectCardLinks from '#lib/components/shared/ProjectCardLinks.svelte';

	let { project, facts = [] }: { project: ProjectSummary; facts?: readonly GlanceFact[] } = $props();

	const locale = getLocale();
	const titleId = $props.id();
	const title = $derived(resolveLocale(project.title, locale));
</script>

<Card interactive class="home-card w-full h-full gap-0 py-0" data-testid="proof-card" role="group" aria-labelledby={titleId}>
	<div class="home-card__zone" data-testid="proof-card-image">
		{#if project.image}
			<ProjectHeroPreview
				{project}
				preset="hero-1200"
				decorative
				sizes="(min-width: 1024px) 30vw, 80vw"
				secondarySizes="(min-width: 1024px) 10vw, 25vw"
			/>
		{/if}
	</div>

	<div class="home-card__head" data-testid="proof-card-head">
		<h3 id={titleId} class="home-card__title" data-testid="proof-card-title">{title}</h3>
		<p class="home-card__text" data-testid="proof-excerpt">{resolveLocale(project.oneLiner, locale)}</p>
	</div>

	{#if facts.length > 0}
		<dl class="home-card__facts" data-testid="proof-card-facts">
			{#each facts.slice(0, 3) as fact (fact.label)}
				<div>
					<dt>{fact.label}</dt>
					<dd>{fact.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	<div class="home-card__foot" data-testid="proof-card-links">
		<ProjectCardLinks {project} />
	</div>
</Card>

<style>
	/* The screenshots: a bounded frame from tablet width, natural on phones. */
	.home-card__zone {
		padding: 1rem 1rem 0.75rem;
	}

	.home-card__zone :global([data-testid='project-hero-preview']) {
		aspect-ratio: 2.2857;
		height: auto;
		border-radius: var(--radius-md);
	}

	.home-card__head {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1.25rem 1.5rem 0.25rem;
	}

	.home-card__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-card-title);
		font-weight: 800;
		line-height: 1.1;
		color: var(--foreground);
	}

	.home-card__text {
		font-size: var(--text-card-body);
		line-height: 1.5;
		color: var(--foreground);
	}

	/* The case study's facts: a labelled list, one fact a row. */
	.home-card__facts {
		display: grid;
		margin: 0.5rem 0 0;
		padding: 0 1.5rem 0.875rem;
	}

	.home-card__facts > div {
		display: grid;
		grid-template-columns: minmax(0, 9.5rem) minmax(0, 1fr);
		gap: 0.25rem 1rem;
		padding-block: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.home-card__facts dt {
		font-size: var(--text-small);
		line-height: 1.5;
		color: var(--muted-foreground);
	}

	.home-card__facts dd {
		margin: 0;
		font-size: var(--text-small);
		line-height: 1.5;
		color: var(--foreground);
	}

	.home-card__foot {
		margin-top: auto;
		padding: 0.25rem 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
	}

	@media (max-width: 479px) {
		.home-card__facts > div {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}
	}

	@media (--tablet-min) {
		.home-card__title {
			font-size: calc(var(--text-card-title) + 0.25rem);
		}
	}

	@media (--tablet-min) {
		.home-card__zone {
			height: 16rem;
			padding: 1.25rem 1.25rem 1rem;
			overflow: hidden;
		}
		.home-card__zone :global([data-testid='project-hero-preview']) {
			aspect-ratio: auto;
			height: 100%;
		}
		.home-card__head {
			padding: 1.5rem 1.75rem 0.25rem;
		}
		.home-card__facts {
			padding: 0 1.75rem 1rem;
		}
		.home-card__foot {
			padding: 0.25rem 1.75rem;
		}
	}
</style>

<!--
  Transit in the opening (D-M1, DEV-38): the home's showcase on the kit's interactive card, with
  Transit's live figures, the words of their state (live with its age, held, demonstration,
  failure) and Refresh. HeroBanner owns the reading and the requests; this card draws them.
-->
<script lang="ts">
	import { Separator } from '@yesid/ui/separator';
	import { Card } from '@yesid/ui/card';
	import { Button } from '@yesid/ui/button';
	import type { HeroData, HeroMetric } from '#lib/live/index.ts';
	import type { ProjectSummary } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale, intl } from '#lib/utils/locale-context.ts';
	import { fillTemplate } from '#lib/utils/labels.ts';
	import ProjectHeroPreview from '#lib/components/projects/ProjectHeroPreview.svelte';
	import ProjectCardLinks from '#lib/components/shared/ProjectCardLinks.svelte';
	import { siteLabels } from '#lib/content/index.ts';
	import { homeLabels } from './home-labels.ts';

	export type ReadingState = 'demo' | 'live' | 'held' | 'failure';

	let {
		project,
		heroData,
		readingState,
		stateLine,
		refreshing = false,
		announcement = '',
		regenerateLabel,
		onRefresh,
		onRegenerate,
	}: {
		project?: ProjectSummary;
		heroData: HeroData;
		readingState: ReadingState;
		/** The words beside the figures: what the reading is and how old, or why it is not live. */
		stateLine: { word?: string; text: string };
		refreshing?: boolean;
		/** Said politely once a refresh ends. */
		announcement?: string;
		regenerateLabel: string;
		onRefresh: () => void;
		onRegenerate: () => void;
	} = $props();

	const locale = getLocale();
	const t = siteLabels.transit;
	const dashboard = siteLabels.heroDashboard;
	const cardLine = $derived(
		project?.cardLine
			? resolveLocale(project.cardLine, locale)
			: project?.slug === 'transit-data-pipeline'
				? resolveLocale(homeLabels.transit.line, locale)
				: '',
	);
	const titleId = $props.id();
	const title = $derived(project ? resolveLocale(project.title, locale) : 'Transit');

	function figure(metric: HeroMetric): { label: string; value: string; unit?: string } {
		if (metric.key === 'vehicles') return { label: resolveLocale(dashboard.vehiclesLabel, locale), value: intl.number(locale).format(metric.value) };
		if (metric.key === 'delay') {
			const digits = metric.value % 1 ? 1 : 0;
			return {
				label: resolveLocale(dashboard.delayLabel, locale),
				value: intl.number(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(metric.value),
				unit: 's',
			};
		}
		return {
			label: resolveLocale(dashboard.routesLabel, locale),
			value: intl.number(locale).format(metric.value),
			unit: metric.total == null ? undefined : fillTemplate(resolveLocale(t.routesOf, locale), { value: '', total: intl.number(locale).format(metric.total) }).trim(),
		};
	}
	const figures = $derived(heroData.metrics.map(figure));
</script>

<Card interactive class="hero-transit gap-0 py-0" data-testid="hero-transit-card" aria-labelledby={titleId} role="group">
	{#if project?.image}
		<div class="hero-transit__zone" data-testid="hero-transit-shots">
			<div class="hero-transit__shots">
				<ProjectHeroPreview
					{project}
					preset="hero-1200"
					alt={resolveLocale(t.shotAlt, locale)}
					eager
					sizes="(min-width: 1024px) 34vw, 92vw"
					secondarySizes="(min-width: 1024px) 12vw, 30vw"
				/>
			</div>
		</div>
	{/if}

	<div class="hero-transit__body">
		<h2 id={titleId} class="hero-transit__title">{title}</h2>
		<p class="hero-transit__line">{cardLine}</p>
		{#if project}<p class="hero-transit__text">{resolveLocale(project.oneLiner, locale)}</p>{/if}

		<div class="hero-transit__proof" data-testid="hero-transit-proof" data-state={readingState} aria-busy={refreshing}>
			<Separator variant="hand-drawn" class="absolute inset-x-0 -top-[4px]" data-testid="content-divider" />
			<div class="hero-transit__top">
				<p class="hero-transit__state" data-testid="hero-transit-state" id="{titleId}-state">
					{#if stateLine.word}<span class="hero-transit__word">{stateLine.word}</span>{" · "}{/if}{stateLine.text}
				</p>
				{#if readingState !== 'demo'}
					<Button
						variant="outline"
						size="cta"
						class="hero-transit__refresh"
						data-testid="hero-refresh"
						aria-label={resolveLocale(refreshing ? t.refreshingName : t.refreshName, locale)}
						aria-disabled={refreshing ? 'true' : undefined}
						data-busy={refreshing ? 'true' : undefined}
						onclick={() => { if (!refreshing) onRefresh(); }}
					>
						<svg class="hero-transit__refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
						<span>{resolveLocale(refreshing ? t.refreshing : t.refresh, locale)}</span>
					</Button>
				{/if}
			</div>

			<dl class="hero-transit__figs" data-testid="hero-transit-figures" aria-describedby="{titleId}-state">
				{#each figures as fig (fig.label)}
					<div class="hero-transit__fig" data-testid="hero-transit-figure">
						<dt>{fig.label}</dt>
						<dd><Separator variant="hand-drawn" class="transit-figure-divider absolute inset-x-0 -top-[4px]" data-testid="content-divider" />{fig.value}{#if fig.unit}<small>&nbsp;{fig.unit}</small>{/if}</dd>
					</div>
				{/each}
			</dl>

			{#if readingState === 'demo' || readingState === 'failure'}
				<p class="hero-transit__regen">
					<Button variant="outline" size="cta" data-testid="hero-regenerate" onclick={onRegenerate}>{regenerateLabel}</Button>
				</p>
			{/if}
			<p class="sr-only" aria-live="polite" data-testid="hero-transit-announcement">{announcement}</p>
		</div>
	</div>

	{#if project}
		<div class="hero-transit__foot">
			<Separator variant="hand-drawn" class="absolute inset-x-0 -top-[4px]" data-testid="content-divider" />
			<ProjectCardLinks {project} />
		</div>
	{/if}
</Card>

<style>
	/* The card's words and figures follow its own width, not the window's. */
	:global(.hero-transit) {
		container: hero-transit / inline-size;
	}

	.hero-transit__zone {
		padding: 1rem 1rem 0.75rem;
		border-radius: calc(var(--radius-lg) - 2px) calc(var(--radius-lg) - 2px) 0 0;
	}

	.hero-transit__shots {
		aspect-ratio: 2.2857;
		min-width: 0;
		overflow: hidden;
		border-radius: var(--radius-md);
	}

	.hero-transit__body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1.25rem 1.5rem 0.875rem;
	}

	.hero-transit__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-card-title);
		font-weight: 800;
		line-height: 1.1;
		color: var(--foreground);
	}

	.hero-transit__line {
		font-size: var(--text-small);
		color: var(--muted-foreground);
	}

	.hero-transit__text {
		font-size: var(--text-card-body);
		line-height: 1.5;
		color: var(--foreground);
	}

	/* A ruled group inside the card, closed by the card's foot rule (never a second frame). */
	.hero-transit__proof {
		position: relative;
		display: grid;
		gap: 0.75rem;
		margin-top: 0.5rem;
		padding-top: 0.75rem;
	}

	.hero-transit__top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1rem;
	}

	.hero-transit__state {
		flex: 1 1 14rem;
		min-width: 0;
		font-size: var(--text-small);
		line-height: 1.45;
		color: var(--foreground);
	}

	.hero-transit__word {
		font-weight: 600;
	}

	.hero-transit__refresh-icon {
		width: 18px;
		height: 18px;
	}

	:global(.hero-transit__refresh[data-busy='true']) .hero-transit__refresh-icon {
		animation: hero-transit-turn 0.9s cubic-bezier(0.45, 0, 0.55, 1) 1;
	}

	@keyframes hero-transit-turn {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.hero-transit__refresh[data-busy='true']) .hero-transit__refresh-icon {
			animation: none;
		}
	}

	.hero-transit__figs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin: 0;
	}

	.hero-transit__proof[aria-busy='true'] .hero-transit__figs {
		opacity: 0.6;
	}

	.hero-transit__fig {
		position: relative;
		display: flex;
		flex-direction: column-reverse;
		justify-content: flex-end;
		gap: 2px;
		min-width: 0;
	}

	.hero-transit__fig dt {
		font-size: var(--text-small);
		line-height: 1.3;
		color: var(--muted-foreground);
	}

	.hero-transit__fig dd {
		margin: 0;
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 6vw, 2rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.01em;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.hero-transit__fig dd small {
		font-size: 0.55em;
		font-weight: 600;
		color: var(--secondary-foreground);
	}

	.hero-transit__foot {
		position: relative;
		margin-top: auto;
		padding: 0.25rem 1.5rem;
	}

	/* A narrow card: one row per figure, the name beside its value. */
	.hero-transit__fig :global(.transit-figure-divider) { display: none; }
	@container hero-transit (max-width: 459px) {
		.hero-transit__fig :global(.transit-figure-divider) { display: block; }
		.hero-transit__figs {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
		.hero-transit__fig {
			flex-direction: row;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.75rem;
			padding-block: 0.5rem;
		}
		.hero-transit__fig dt {
			font-size: var(--text-body);
		}
		.hero-transit__fig dd {
			font-size: 1.5rem;
		}
	}

	/* Desktop: the showcase a size up, to match the heading. */
	@media (--desktop-min) {
		.hero-transit__zone {
			padding: 1.25rem 1.25rem 1rem;
		}
		.hero-transit__body {
			padding: 1.5rem 1.75rem 1rem;
		}
		.hero-transit__foot {
			padding: 0.25rem 1.75rem;
		}
		.hero-transit__title {
			font-size: clamp(1.75rem, 2.2vw, 2.5rem);
		}
		.hero-transit__line,
		.hero-transit__state,
		.hero-transit__fig dt {
			font-size: var(--text-body);
		}
		.hero-transit__text {
			font-size: clamp(1.125rem, 1.3vw, 1.375rem);
			line-height: 1.45;
		}
		.hero-transit__fig dd {
			font-size: clamp(2rem, 2.9vw, 3rem);
		}
	}
</style>

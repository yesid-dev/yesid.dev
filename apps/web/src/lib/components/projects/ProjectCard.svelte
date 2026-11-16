<script module lang="ts">
	import type { Action } from 'svelte/action';
	import { equalizeRows } from '#lib/utils/equalize-rows.ts';

	/** Align a group of cards. Containers choose the group; the card owns its rows. */
	export const alignProjectCards: Action<HTMLElement> = (node) => {
		const alignment = equalizeRows(node, [
			'.project-card-title',
			'.project-card-excerpt',
			'.project-card-service',
			'.project-card-services',
			'.project-card-links',
		]);
		return { destroy: () => alignment?.destroy?.() };
	};
</script>

<!--
  A listing project card in the home project card's family (D-M1, DEV-15): the kit's interactive
  Card with its 2px edge, the screenshots framed in the image area, the home's title, the services
  below, and the card's own Case study / Website / Repo links, each named with its project. The card
  is not a link: it contains them (D21), so the edge lights up and the card lifts 1px on hover and
  while one of its links has the focus, with no halo, shadow or image zoom.
-->
<script lang="ts">
	import type { ProjectSummary, Service } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { pointerHover } from '#lib/motion/actions/pointerHover.ts';
	import SvgIcon from '#lib/components/brand/SvgIcon.svelte';
	import { Card } from '@yesid/ui/card';
	import { cn } from '@yesid/ui/cn';
	import { serviceLineColor } from '#lib/utils/service-colors.ts';
	import { siteLabels } from '#lib/content/index.ts';
	import { localeCopy } from '#lib/locales/index.ts';
	import ProjectHeroPreview from './ProjectHeroPreview.svelte';
	import ProjectCardLinks from '#lib/components/shared/ProjectCardLinks.svelte';
	import digitalDesktopBlueprint from '#lib/assets/project-fallbacks/digital-desktop.svg?raw';
	import digitalMobileBlueprint from '#lib/assets/project-fallbacks/digital-mobile.svg?raw';

	type ProjectCardPlacement = 'listing' | 'proof';

	export interface ProjectCardProps {

		project: ProjectSummary;

		services?: readonly Service[];

		serviceSvgContents?: Record<string, string>;
		/** Selects image sizes and test ids; both placements share one layout. */
		placement?: ProjectCardPlacement;
		/** Forward first-card loading priority to the media preview. */
		eager?: boolean;
		/** False keeps every link out of the tab order (decorative loop copies). */
		tabbable?: boolean;
		class?: string;
		[key: string]: unknown;
	}

	let {
		project,
		services = [],
		serviceSvgContents = {},
		placement = 'listing',
		eager = false,
		tabbable = true,
		class: className = '',
		...rest
	}: ProjectCardProps = $props();
	const titleId = $props.id();

	const PLACEMENT = {
		listing: { testId: 'project-card', mediaTestId: 'project-card-image', titleTestId: 'project-card-title', excerptTestId: 'project-card-excerpt', linksTestId: 'project-card-links', linkIdPrefix: 'project-card', mediaPreset: 'card-600' },
		proof: { testId: 'proof-card', mediaTestId: 'proof-card-image', titleTestId: 'proof-card-title', excerptTestId: 'proof-excerpt', linksTestId: 'proof-card-links', linkIdPrefix: 'proof-card', mediaPreset: 'hero-1200' },
	} as const;
	const v = $derived(PLACEMENT[placement]);

	// Rendered pane widths per breakpoint. Listing values are measured on /projects:
	// a split card gives the phone screenshot ~25vw on mobile, so asking for the
	// whole card width there downloads twice the pixels for the LCP image.
	const MEDIA_SIZES = {
		listing: {
			single: '(min-width: 1280px) 35vw, (min-width: 1024px) 63vw, (min-width: 768px) 90vw, 82vw',
			primary: '(min-width: 1280px) 26vw, (min-width: 1024px) 52vw, 72vw',
			secondary: '(min-width: 1280px) 12vw, (min-width: 1024px) 18vw, (min-width: 768px) 24vw, 30vw',
		},
		proof: {
			single: '(min-width: 768px) 50vw, 92vw',
			primary: '(min-width: 768px) 50vw, 92vw',
			secondary: '(min-width: 768px) 16vw, 40vw',
		},
	} as const;
	const mediaSizes = $derived(MEDIA_SIZES[placement]);

	// The phone screenshot's description. Proposed copy until the CMS or site labels own it.
	const PHONE_VIEW = {
		en: 'phone view',
		fr: 'vue sur téléphone',
		es: 'vista en el teléfono',
	};

	let cardHovered = $state(false);

	let projectServices = $derived(
		project.relatedServices
			.map((id) => services.find((s) => s.id === id))
			.filter((s): s is Service => !!s)
	);

	const listingChrome = siteLabels.projectsChrome.listing;
	const servicesLabel = listingChrome.filters.services;
	const progressLabel = localeCopy[locale].projects.workInProgress;
	const title = $derived(resolveLocale(project.title, locale));
	const secondaryAlt = $derived(`${title} ${resolveLocale(PHONE_VIEW, locale)}`);
</script>

<article
	class={cn('project-card group relative block h-full', className)}
	data-testid={v.testId}
	data-flip-id={project.slug}
	data-batch="project-item"
	use:pointerHover={(hovering) => (cardHovered = hovering)}
	{...rest}
>
	<Card
		interactive
		class="project-card-surface h-full gap-0 py-0"
		role="group"
		aria-labelledby={titleId}
	>
		<div class="project-card-frame" data-testid={v.mediaTestId}>
			{#if project.image}
				<ProjectHeroPreview
					{project}
					preset={v.mediaPreset}
					alt={title}
					{secondaryAlt}
					{eager}
					sizes={project.imageSecondary ? mediaSizes.primary : mediaSizes.single}
					secondarySizes={mediaSizes.secondary}
				/>
			{:else}
				<div class="project-card-blueprint relative">
					<div
						class="blueprint-art blueprint-art--desktop"
						data-testid="project-blueprint-fallback"
						aria-hidden="true"
					>
						{@html digitalDesktopBlueprint}
					</div>
					<div class="blueprint-art blueprint-art--mobile" aria-hidden="true">
						{@html digitalMobileBlueprint}
					</div>
				</div>
			{/if}
		</div>

		<div class="project-card-body">
			<h2
				id={titleId}
				class="project-card-title"
				data-testid={v.titleTestId}
			>
				{title}
			</h2>

			<p class="project-card-excerpt" data-testid={v.excerptTestId}>
				{resolveLocale(project.oneLiner, locale)}
			</p>

			{#if project.status === 'wip'}
				<p class="project-card-status">{progressLabel}</p>
			{/if}
		</div>

		{#if projectServices.length > 0}
			<div class="project-card-services-wrap">
				<ul
					class="project-card-services"
					data-testid="project-card-services"
					aria-label={resolveLocale(servicesLabel, locale)}
				>
					{#each projectServices as service}
						<li
							class="project-card-service"
							data-testid="project-card-service"
							style="border-color: color-mix(in srgb, var(--primary) 35%, transparent);"
						>
							{#if serviceSvgContents[service.id]}
								<div class="service-badge-icon" aria-hidden="true">
									<SvgIcon
										svgContent={serviceSvgContents[service.id]}
										size={28}
										hovered={cardHovered}
									/>
								</div>
							{/if}
							<span class="project-card-meta">
								<span
									class="first-line-bullet"
									style="background: {serviceLineColor(service.id)};"
									aria-hidden="true"
								></span>
								<span>{resolveLocale(service.title, locale)}</span>
							</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="project-card-links" data-testid={v.linksTestId}>
			<ProjectCardLinks {project} testIdPrefix={v.linkIdPrefix} {tabbable} />
		</div>
	</Card>
</article>

<style>
	/* The screenshots: a framed zone, natural on phones and 16rem tall from tablet width,
	   as on the home's project card. */
	.project-card-frame {
		padding: 1rem 1rem 0.75rem;
	}

	.project-card-frame :global([data-testid='project-hero-preview']) {
		aspect-ratio: 2.2857;
		height: auto;
		border-radius: var(--radius-md);
	}

	.project-card-title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-card-title);
		font-weight: 800;
		line-height: 1.1;
		color: var(--foreground);
	}

	.project-card-excerpt {
		margin-top: 0.4rem;
		font-size: var(--text-card-body);
		line-height: 1.5;
		color: var(--foreground);
	}

	.project-card-status {
		margin-top: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-small);
		color: var(--muted-foreground);
	}

	.project-card-body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1.25rem 1.5rem 0.25rem;
	}

	/* From tablet up: a fixed 2x2, filled column by column. One service sits in the first cell,
	   two stack, three or four fill both columns. Pills fill their cell's width; the listing's
	   alignProjectCards gives every pill the tallest pill's height, so all pills match. Rows stay
	   natural (no stretch) so that measurement is stable. */
	.project-card-services {
		display: grid;
		grid-auto-flow: column;
		grid-template-rows: repeat(2, auto);
		grid-template-columns: repeat(2, minmax(0, 1fr));
		align-content: start;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.project-card-services-wrap {
		padding: 0.5rem 1.5rem 0.875rem;
	}

	/* Labels wrap between words only, overriding the global break-word. */
	.project-card-service {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		max-width: 100%;
		word-break: normal;
		overflow-wrap: normal;
		border: 1px solid;
		border-radius: var(--radius-pill);
		background: var(--card);
		padding: 0.375rem 0.5rem;
	}

	.project-card-meta {
		display: inline-flex;
		min-width: 0;
		align-items: flex-start;
		gap: 0.375rem;
		font-family: var(--font-mono);
		font-size: var(--text-card-meta);
		line-height: 1.25;
		color: var(--foreground);
	}

	/* Phones stack every service in one column. */
	@media (--tablet-max) {
		.project-card-services {
			grid-auto-flow: row;
			grid-template-rows: none;
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* Strip SvgIcon container border/bg when nested in card badges */
	.service-badge-icon :global([data-slot="svg-icon"]) {
		border: none;
		background: transparent;
		border-radius: 0;
	}

	.project-card-blueprint {
		aspect-ratio: 2.2857;
		color: var(--primary);
		background-image:
			linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px),
			linear-gradient(color-mix(in srgb, var(--primary) 5%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--primary) 5%, transparent) 1px, transparent 1px);
		background-size:
			96px 96px,
			96px 96px,
			24px 24px,
			24px 24px;
	}

	.blueprint-art {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		opacity: 0.6;
		transition: opacity 300ms;
	}

	.project-card:hover .blueprint-art,
	.project-card:active .blueprint-art {
		opacity: 0.85;
	}

	.blueprint-art :global(svg) {
		width: 100%;
		height: 100%;
	}

	.blueprint-art--desktop {
		display: none;
	}

	@media (--tablet-min) {
		.blueprint-art--desktop {
			display: flex;
		}

		.blueprint-art--mobile {
			display: none;
		}
	}

	.project-card-links {
		margin-top: auto;
		padding: 0.25rem 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
	}

	.project-card-links:not(:has(li)) {
		display: none;
	}

	@media (--tablet-min) {
		.project-card-frame {
			height: 16rem;
			padding: 1.25rem 1.25rem 1rem;
			overflow: hidden;
		}

		.project-card-frame :global([data-testid='project-hero-preview']) {
			aspect-ratio: auto;
			height: 100%;
		}

		.project-card-blueprint {
			aspect-ratio: auto;
			height: 100%;
		}

		.project-card-body {
			padding: 1.5rem 1.75rem 0.25rem;
		}

		.project-card-title {
			font-size: calc(var(--text-card-title) + 0.25rem);
		}

		.project-card-services-wrap {
			padding: 0.5rem 1.75rem 1rem;
		}

		.project-card-links {
			padding: 1rem 1.75rem;
		}
	}
</style>

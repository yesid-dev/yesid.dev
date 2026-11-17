<!--
  ServiceCard: one of the four alike service cards on /services (D-M5, DEV-39).
  Words on the left, the drawing on the right in its corner-marked frame (beside the title on
  phones). A kit interactive card: the whole card leads to its service, "Deep dive" stays the
  real link for keyboards and screen readers, and the drawing keeps its own hover and tap.
-->
<script lang="ts">
	import type { Service } from '#lib/types.ts';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';
	import { servicesGridContent } from '#lib/content/site-content.ts';
	import { prefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import { siteLabels } from '#lib/content/index.ts';
	import { Card } from '@yesid/ui/card';
	import { Button } from '@yesid/ui/button';
	import { Separator } from '@yesid/ui/separator';
	import ServiceSvgPanel from './ServiceSvgPanel.svelte';

	const locale = getLocale();

	export interface ServiceCardProps {
		/** The service data to display */
		service: Service;
		/** Raw SVG content for the service illustration */
		svgContent: string;
		headingLevel?: 2 | 3;
		/** Adapt the shared card to a narrower grid column. Listing defaults stay unchanged. */
		responsive?: boolean;
		class?: string;
		[key: string]: unknown;
	}

	let { service, svgContent, headingLevel = 2, responsive = false, class: className = '', ...rest }: ServiceCardProps = $props();

	let deepDiveLabel = $derived(resolveLocale(siteLabels.servicesChrome.listing.deepDiveLabel, locale));
	let href = $derived(localizeHref(`/services/${service.id}`, locale));
	let title = $derived(resolveLocale(service.title, locale));
	let description = $derived(resolveLocale(service.description, locale));
	let benefitHeadline = $derived(
		service.benefitHeadline ? resolveLocale(service.benefitHeadline, locale) : null
	);
	let metricValue = $derived(
		service.impactMetric ? resolveLocale(service.impactMetric.value, locale) : null
	);
	let metricLabel = $derived(
		service.impactMetric ? resolveLocale(service.impactMetric.label, locale) : null
	);

	const drawingAttributes = $derived(responsive ? {
		'aria-hidden': false,
		disabled: $prefersReducedMotion,
		tabindex: 0,
		'aria-label': resolveLocale(servicesGridContent.viewIllustrationAria, locale).replace('{title}', title),
	} : {});

	let deepDive = $state<HTMLAnchorElement | null>(null);

	// A click anywhere on the card that is not on its link or its drawing follows "Deep dive";
	// a text selection is reading, not a click.
	function openFromCard(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0) return;
		const target = event.target as Element | null;
		if (!target || target.closest('a, button')) return;
		if (window.getSelection()?.toString()) return;
		deepDive?.click();
	}
</script>

<li
	class="service-item {className}" class:responsive
	id="service-{service.id}"
	data-testid="service-card-{service.id}"
	{...rest}
>
	<!-- The whole card, padding and edge included, follows "Deep dive"; keyboards use the link. -->
	<Card interactive class={responsive ? "service-card h-full" : "service-card"} data-ripple-exempt onclick={openFromCard}>
		<div class="service-card-inner">
			<div class="service-text">
				<div class="title-row">
					<svelte:element this={`h${headingLevel}`} class="service-title" id="svc-title-{service.id}" tabindex="-1">
						{title}<span class="title-dot">.</span>
					</svelte:element>
					{#if svgContent}
						<div class="svg-mobile-banner">
							<ServiceSvgPanel {svgContent} variant="banner" {...drawingAttributes} />
						</div>
					{/if}
				</div>

				{#if benefitHeadline}
					<p class="benefit-headline">{benefitHeadline}</p>
				{/if}

				<p class="service-description">{description}</p>

				<div class="service-foot">
					<Separator variant="hand-drawn" class="absolute inset-x-0 -top-[4px]" data-testid="content-divider" />
					{#if metricValue}
						<p class="service-metric" data-testid="service-metric">
							<span class="metric-value">{metricValue}</span>
							{#if metricLabel}
								<span class="metric-label">{metricLabel}</span>
							{/if}
						</p>
					{/if}
					<Button
						bind:ref={deepDive}
						{href}
						size="cta"
						wrap
						class="deep-dive-cta min-h-11 max-w-full min-w-0 {responsive ? '' : 'py-3'}"
						data-testid="service-deep-dive-{service.id}"
					>
						{deepDiveLabel}<span class="sr-only">: {title}</span>
					</Button>
				</div>
			</div>

			{#if svgContent}
				<div class="card-art">
					<ServiceSvgPanel {svgContent} class="svg-panel-responsive" {...drawingAttributes} />
				</div>
			{/if}
		</div>
	</Card>
</li>

<style>
	.responsive { container: home-service-card / inline-size; min-width: 0; }

	.service-item {
		list-style: none;
		/* A station jump lands the card below the header pill and the sticky strip. */
		scroll-margin-top: calc(var(--nav-clearance) + var(--strip-h) + 1rem);
	}

	.service-card-inner {
		display: flex;
		align-items: center;
		gap: clamp(1.5rem, 3vw, 3rem);
		padding: 0.5rem clamp(1.25rem, 2.5vw, 2rem);
		cursor: pointer;
	}

	.service-text {
		overflow-wrap: anywhere;
		flex: 1;
		min-width: 0;
		cursor: auto;
	}

	/* Reading size: the four services read as comparable cards, one after another. */
	.service-title {
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 1rem + 1.5vw, 2rem);
		font-weight: 900;
		color: var(--foreground);
		line-height: 1.15;
		letter-spacing: -0.02em;
		margin: 0 0 0.75rem;
		scroll-margin-top: calc(var(--nav-clearance) + var(--strip-h) + 1rem);
	}

	.title-dot {
		color: var(--primary);
	}

	.benefit-headline {
		font-size: var(--text-subheading);
		font-weight: 600;
		color: var(--foreground);
		line-height: 1.35;
		margin: 0 0 0.75rem;
	}

	.service-description {
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--secondary-foreground);
		max-width: 60ch;
		margin: 0 0 1.5rem;
	}

	.service-foot {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		padding-top: 1rem;
	}

	/* The published metric in reading ink, its label in sentence case; the value is unchanged. */
	.service-metric {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.625rem;
		min-width: 0;
		margin: 0;
	}

	.metric-value {
		max-width: 100%;
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-size: var(--text-heading);
		font-weight: 900;
		line-height: 1.2;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.metric-label {
		font-size: var(--text-small);
		color: var(--secondary-foreground);
	}

	.card-art {
		flex-shrink: 0;
		overflow: hidden; /* clips the drawing during its first render, before it is sized */
	}

	/* A square frame at card size, so the four cards stay compact. */
	.card-art :global(.svg-panel:not(.svg-panel--banner)) {
		width: clamp(160px, 15vw, 220px);
		aspect-ratio: 1;
	}

	@media (--tablet-min) {
		.svg-mobile-banner {
			display: none;
		}
	}

	/* Phones: one column, the drawing beside the title, "Deep dive" across the card. */
	@media (--tablet-max) {
		.service-card-inner {
			flex-direction: column;
			align-items: stretch;
			gap: 0;
		}

		.card-art {
			display: none;
		}

		.title-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.service-title {
			margin: 0;
			min-width: 0;
			overflow-wrap: break-word;
		}

		.svg-mobile-banner {
			flex: none;
		}

		.svg-mobile-banner :global(.svg-panel--banner) {
			padding: 0.5rem;
		}

		/* !important outranks SvgIcon's inline size, as in ServiceSvgPanel. */
		.svg-mobile-banner :global([data-slot='svg-icon']) {
			width: 56px !important;
			height: 56px !important;
		}

		.service-description {
			margin-bottom: 1rem;
		}

		.service-foot :global(.deep-dive-cta) {
			flex: 1 1 100%;
			min-height: 44px;
		}
	}

	@container home-service-card (max-width: 38rem) {
		.service-card-inner {
			flex-direction: column;
			align-items: stretch;
			gap: 0;
		}

		.card-art {
			display: none;
		}

		.title-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.service-title {
			margin: 0;
			min-width: 0;
			overflow-wrap: break-word;
		}

		.svg-mobile-banner {
			flex: none;
		}

		.svg-mobile-banner :global(.svg-panel--banner) {
			padding: 0.5rem;
		}

		/* !important outranks SvgIcon's inline size, as in ServiceSvgPanel. */
		.svg-mobile-banner :global([data-slot='svg-icon']) {
			width: 56px !important;
			height: 56px !important;
		}

		.service-description {
			margin-bottom: 1rem;
		}

		.service-foot :global(.deep-dive-cta) {
			flex: 1 1 100%;
			min-height: 44px;
		}
		.svg-mobile-banner { display: block; }
	}
	@container home-service-card (min-width: 38.001rem) {
		.svg-mobile-banner { display: none; }
	}
</style>

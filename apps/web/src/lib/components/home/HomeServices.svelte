<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { browser } from '$app/env';
	import { resolveLocale } from '#lib/utils/locale.ts';
	import { localizeHref } from '#lib/utils/locale-routing.ts';
	import { getLocale } from '#lib/utils/locale-context.ts';

	const locale = getLocale();
	import { orderServices } from '#lib/utils/station.ts';

	import { pressBounce, cardParallax } from '@yesid/motion/actions';
	import { Card } from '@yesid/ui/card';
	import { morphHover } from '#lib/motion/actions/morphHover.js';
	import { pointerHover } from '#lib/motion/actions/pointerHover.js';
	import { prefersReducedMotion } from '@yesid/motion/stores/reducedMotion';
	import { loadDrawSVG } from '@yesid/motion/utils/gsap';
	import { SVG_SHAPE_SELECTOR } from '#lib/motion/utils/morphHelpers.ts';
	import { playSvgEntrance } from '#lib/motion/utils/svgEntrance.ts';
	import type { Service, ServicesGridContent } from '#lib/types.ts';

	let {
		servicesGrid: servicesGridContent,
		services,
	}: { servicesGrid: ServicesGridContent; services: readonly Service[] } = $props();

	const orderedServices = $derived(orderServices(services));
	const viewIllustrationAriaTemplate = $derived(resolveLocale(servicesGridContent.viewIllustrationAria, locale));

	const viewAllLink = $derived(resolveLocale(servicesGridContent.viewAllLink, locale));

	let sectionEl: HTMLElement | undefined = $state(undefined);

	// Morphing waits for each injected SVG's entrance; readiness flags seed once and remain locally owned.
	const svgReady = $state<boolean[]>(untrack(() => orderedServices.map(() => false)));
	const svgHovered = $state<boolean[]>(untrack(() => orderedServices.map(() => false)));

	onMount(() => {
		if (!browser || !sectionEl) return;

		// Load DrawSVG alongside SVG fetches so icon injection does not wait on the plugin.
		const drawPluginPromise: Promise<void> = loadDrawSVG();
		const entrances: gsap.core.Timeline[] = [];

		const panels = sectionEl.querySelectorAll('[data-testid="services-svg-panel"]');
		panels.forEach(async (panel, i) => {
			const service = orderedServices[i];
			if (!service?.svg) return;

			try {
				const [res] = await Promise.all([
					fetch(`/svg/services/${service.svg}`),
					drawPluginPromise,
				]);
				if (!res.ok) {
					console.warn(
						'[home-services] Decorative SVG fetch failed; keeping the static image.',
					);
					return;
				}
				const svgText = await res.text();

				const wrapper = panel.querySelector('.svg-inline-wrapper');
				if (!wrapper) return;
				wrapper.innerHTML = svgText;

				const drawable = Array.from(
					wrapper.querySelector('svg')?.querySelectorAll<SVGElement>(SVG_SHAPE_SELECTOR) ?? [],
				);
				if (drawable.length === 0) {
					svgReady[i] = true;
					return;
				}
				entrances.push(
					playSvgEntrance(drawable, {
						animation: 'draw',
						duration: 1.1,
						stagger: 0.04,
						delay: i * 0.12,
						onComplete: () => {
							svgReady[i] = true;
						},
					}),
				);
			} catch {
				console.warn(
					'[home-services] Decorative SVG fetch failed; keeping the static image.',
				);
			}
		});

		return () => entrances.forEach((entrance) => entrance.kill());
	});
</script>

<section
	bind:this={sectionEl}
	data-testid="services-section"
	class="services-section relative"
>
	<div class="services-grid grid grid-cols-1 gap-5 lg:grid-cols-2" data-ripple-exempt>
		{#each orderedServices as service, i}
			{@const benefit = service.benefitHeadline ? resolveLocale(service.benefitHeadline, locale) : ''}
			{@const title = resolveLocale(service.title, locale)}
			{@const metricValue = service.impactMetric ? resolveLocale(service.impactMetric.value, locale) : ''}
			{@const metricLabel = service.impactMetric ? resolveLocale(service.impactMetric.label, locale) : ''}
			<!-- The title link covers the card; the illustration keeps its own action above that link. -->
			<div
				class="services-card-item"
				use:cardParallax
				use:pointerHover={(hovering) => (svgHovered[i] = hovering)}
			>
				<Card interactive class="services-card relative h-full gap-0 py-0">
					<div class="services-icon-zone relative">
						<button
							type="button"
							data-testid="services-svg-panel"
							class="services-svg-panel"
							aria-label={viewIllustrationAriaTemplate.replace('{title}', title)}
							disabled={!svgReady[i] || $prefersReducedMotion}
							use:morphHover={{ enabled: svgReady[i] && !$prefersReducedMotion, hovered: svgHovered[i] }}
						>
							<div class="svg-inline-wrapper pointer-events-none">
								<img src="/svg/services/{service.svg}" alt="" width="96" height="96" />
							</div>
						</button>
					</div>

					<div class="services-content">
						<a
							href={localizeHref(`/services/${service.id}`, locale)}
							data-testid="services-card"
							class="services-card-link"
						><span data-testid="services-title" class="services-title">{title}</span></a>
						{#if benefit}
							<div data-testid="services-benefit" class="services-benefit">{benefit}</div>
						{/if}
					</div>

					{#if metricValue}
						<div class="services-footer" data-testid="services-metric">
							<div class="services-metric-row">
								<span class="services-metric-value">{metricValue}</span>
								<span class="services-metric-label">{metricLabel}</span>
							</div>
						</div>
					{/if}
				</Card>
			</div>
		{/each}
	</div>

	<div data-testid="services-viewall" class="services-viewall">
		<a href={localizeHref('/services', locale)} use:pressBounce>{viewAllLink}</a>
	</div>
</section>

<style>
	/* Phones keep the page gutter; on desktop the centred measure gives the cards their width. */
	.services-section {
		padding: 0 var(--space-page-x) var(--space-section-y);
	}

	.services-card-item {
		min-width: 0;
	}

	/* Equal-height cards are useful in columns, but create empty mobile rows. */
	@media (--desktop-min) {
		.services-section {
			padding-inline: 0;
		}
		.services-grid {
			grid-auto-rows: 1fr;
		}
	}

	/* The title's link covers the card, so the whole card is one target. */
	.services-card-link {
		display: flex;
		align-items: center;
		min-height: var(--size-tap-min);
		color: var(--foreground);
		text-decoration: none;
	}

	.services-card-link::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: inherit;
	}

	/* The focus outline is drawn around the whole card, inside its clipped edge. */
	.services-card-link:focus-visible {
		outline: none;
	}

	.services-card-link:focus-visible::after {
		outline: 2px solid var(--ring);
		outline-offset: -4px;
		border-radius: calc(var(--radius-lg) - 2px);
	}

	/* Forced colours: the ring takes the system's text colour, as every other focus does. */
	@media (forced-colors: active) {
		.services-card-link:focus-visible::after {
			outline-color: CanvasText;
		}
	}

	.services-icon-zone {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 12.5rem;
		background-image:
			radial-gradient(
				circle at 50% 55%,
				color-mix(in srgb, var(--primary) 9%, transparent),
				transparent 65%
			),
			linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 96%, var(--foreground)), color-mix(in srgb, var(--surface-1) 92%, var(--terminal)));
	}

	.services-svg-panel {
		position: relative;
		z-index: 2;
		appearance: none;
		padding: 0;
		font: inherit;
		cursor: pointer;
		width: 128px;
		height: 128px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--primary) 6%, var(--background));
		border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 250ms var(--ease-default),
			border-color 250ms var(--ease-default);
	}

	.services-svg-panel:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 4px;
	}

	.services-svg-panel:disabled {
		cursor: default;
	}

	.services-card-item:hover .services-svg-panel {
		background: color-mix(in srgb, var(--primary) 14%, var(--background));
		border-color: color-mix(in srgb, var(--primary) 38%, transparent);
	}

	.svg-inline-wrapper {
		width: 96px;
		height: 96px;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Remap amber linework locally to line-amber so service art remains visible on light paper. */
		--accent: var(--line-amber);

		transform: translate(
			calc(var(--parallax-x, 0px) * 3),
			calc(var(--parallax-y, 0px) * 3)
		);
		transition: transform 180ms var(--ease-default);
	}

	.services-content {
		padding: 1.5rem 1.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
	}

	.services-title {
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: var(--text-card-title);
		line-height: 1.1;
		color: var(--foreground);
		letter-spacing: 0;
	}

	@media (--tablet-min) {
		.services-title {
			font-size: calc(var(--text-card-title) + 0.25rem);
		}
	}

	.services-benefit {
		font-size: var(--text-card-body);
		line-height: 1.4;
		color: var(--muted-foreground);
	}

	.services-footer {
		padding: 1rem 1.75rem;
		border-top: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
	}

	.services-metric-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.625rem;
	}

	/* Metrics in reading ink with their labels in sentence case (D-M1); values unchanged. */
	.services-metric-value {
		flex: 0 0 auto;
		max-width: 100%;
		overflow-wrap: anywhere;
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: var(--text-heading);
		line-height: 1;
		color: var(--foreground);
		letter-spacing: -0.02em;
	}

	.services-metric-label {
		flex: 1 1 14rem;
		min-width: 0;
		font-size: var(--text-card-meta);
		color: var(--muted-foreground);
	}

	@media (--tablet-min) {
		.services-metric-value {
			font-size: 1.75rem;
		}
	}

	.services-viewall {
		display: flex;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	/* An orange text link (base.css styles class-less links), a 44px target. */
	.services-viewall :global(a) {
		display: inline-flex;
		align-items: center;
		min-height: var(--size-tap-min);
	}

	@media (--tablet-max) {
		.services-icon-zone {
			height: 10rem;
		}
		.services-svg-panel {
			width: 96px;
			height: 96px;
			border-radius: 16px;
		}
		.svg-inline-wrapper {
			width: 64px;
			height: 64px;
		}
		.services-content {
			padding: 1.25rem 1.5rem 0.875rem;
		}
		.services-footer {
			padding: 0.875rem 1.5rem;
		}
	}
</style>
